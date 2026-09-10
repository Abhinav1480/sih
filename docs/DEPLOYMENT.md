# Deployment Guide
## ORCA: SIH 2026 PS 26176

Target topology: **FastAPI backend on Render (Docker)** + **Next.js frontend on Vercel**.
Both run in `ORCA_MODE=DEMO` by default, which needs **no API keys and no outbound
network** (deterministic fixtures, seeded SQLite). Switch to `LIVE` only after adding
provider credentials.

---

## 1. Backend -> Render

Files: `Dockerfile.backend` (repo root), `render.yaml` (Blueprint, repo root).

### 1a. One-time setup (Blueprint, recommended)
1. Push the branch to GitHub.
2. Render Dashboard -> **New** -> **Blueprint** -> connect the repo -> **Apply**.
   Render reads `render.yaml`: Docker runtime, `dockerfilePath: ./Dockerfile.backend`,
   `healthCheckPath: /health`, plan `free`, region `singapore`.
3. First build takes ~3-5 min (pip install of numpy / xarray / netCDF4 / h5py wheels).
4. Note the URL, e.g. `https://orca-backend.onrender.com`. Verify:
   ```bash
   curl https://orca-backend.onrender.com/health/deep
   # {"status":"HEALTHY", "database":"CONNECTED", ...}  -> 200
   # a dependency failure gives {"status":"DEGRADED", ...} -> 503
   ```

### 1b. Manual alternative (no Blueprint)
New -> Web Service -> Docker -> Dockerfile path `./Dockerfile.backend`, context `.`,
Health Check Path `/health`, then add the env vars from the table below.

### 1c. Render CLI / API (if you have a key)
```bash
# Render has no login-less CLI flow; get a key at Dashboard -> Account Settings -> API Keys
export RENDER_API_KEY=rnd_xxx
npx -y @render/cli blueprints launch --repo <github-url> --branch main   # or use the dashboard
```

### Backend env vars (Render -> orca-backend -> Environment)

| Variable | Value | Note |
| :--- | :--- | :--- |
| `PORT` | *(injected by Render)* | Dockerfile CMD binds `0.0.0.0:${PORT:-8000}` |
| `ORCA_MODE` | `DEMO` | Offline deterministic mode; `LIVE` enables real providers |
| `DEBUG` | `False` | Disables uvicorn reload |
| `CORS_ORIGINS` | `http://localhost:3000,https://<frontend>.vercel.app` | Comma list, no spaces, no trailing slash |
| `DATABASE_URL` | `sqlite+aiosqlite:///./orca.db` | Free plan disk is ephemeral; fine for DEMO |
| `ANTHROPIC_API_KEY` | *(empty)* | LIVE synthesis only |
| `MOSDAC_API_TOKEN`, `BHOONIDHI_API_TOKEN` | *(empty)* | LIVE ISRO products only |

**CORS**: after the frontend is live, add its exact origin (`https://...vercel.app`) to
`CORS_ORIGINS` and redeploy the backend. Preview deployments get a different hostname
per commit; add them too, or point previews at a local backend.

**Health check**: there are two endpoints, and the platform must poll the first one.

| Endpoint | Status code | Who polls it |
| --- | --- | --- |
| `/health` | **always 200 while the process is up** | Render, and any platform health check (`healthCheckPath: /health`) |
| `/health/deep` | **503 when a dependency is genuinely unavailable** | humans, uptime monitors, alerting rules |

Both run the same real `SELECT 1` probe and both report the result in the body as
`database` (`CONNECTED` / `UNAVAILABLE`) plus a `database_error` string when it fails.
The only difference is the status code.

Point `healthCheckPath` at `/health`, never at `/health/deep`. Render treats a non-2xx
health check as a failed instance: it will recycle a process that is running fine and
can refuse to promote a deploy at all, so a transient database blip would take the whole
service down. Read the database state out of the 200 body instead:

```bash
curl -s https://orca-backend.onrender.com/health | jq '.status, .database'
# "HEALTHY"  "CONNECTED"   -- or "DEGRADED"  "UNAVAILABLE"
```

Alert on `/health/deep`, which does answer 503, so paging works without the platform
reacting to it.

Free instances sleep after 15 min idle; the first request afterwards takes ~30-60 s.
Ping `/health` before a demo.

---

## 2. Frontend -> Vercel

Files: `frontend/` (Next.js 14, auto-detected). No `vercel.json` is needed.

### 2a. Git integration (recommended)
1. Vercel Dashboard -> **Add New** -> **Project** -> import the repo.
2. **Root Directory**: `frontend` (important: the repo root is not the Next.js app).
3. Framework preset: Next.js (auto). Build `npm run build`, output `.next` (defaults).
4. Environment Variables (Production + Preview):

   | Variable | Value |
   | :--- | :--- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://orca-backend.onrender.com` |
   | `NEXT_PUBLIC_API_URL` | same value (legacy fallback name read by `src/lib/api.ts`) |
   | `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | your Maps JavaScript API key (optional) |

5. Deploy. `NEXT_PUBLIC_*` values are inlined at build time, so **changing them
   requires a redeploy** (Deployments -> ... -> Redeploy).

### 2b. CLI
```bash
cd frontend
npx vercel login                 # once; opens browser
npx vercel link --yes --project orca-frontend
npx vercel env add NEXT_PUBLIC_API_BASE_URL production   # paste the Render URL
npx vercel --yes --prod
```

Current production deployment (CLI, project `orca-frontend`): see the URL recorded in
section 4. It was deployed **before** a Render URL existed, so `NEXT_PUBLIC_API_BASE_URL`
is unset there and the client falls back to `http://127.0.0.1:8000` — set the env var in
the Vercel dashboard and redeploy once the backend is up.

---

## 3. Local Docker (optional)

```bash
# Backend only, on a spare port
docker build -f Dockerfile.backend -t orca-backend .
docker run --rm -p 8123:8123 -e PORT=8123 orca-backend
curl http://localhost:8123/health

# Frontend image needs the backend URL at build time
docker build -f Dockerfile.frontend --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8000 -t orca-frontend .

# Full stack
docker compose up --build
```

---

## 4. Deployment record

| Component | Status | URL |
| :--- | :--- | :--- |
| Frontend (Vercel, `orca-frontend`) | Project created + linked; production build **failed** on a pre-existing TS error (`src/components/MapView.tsx:872`, `LayerControl` missing `opacities`/`onOpacityChange`). Fix, then `cd frontend && npx vercel --yes --prod` | [inspect](https://vercel.com/24911a05c5-3655s-projects/orca-frontend/4MJGWFLWb1uitZkCUFxNMocVyuMg); target `https://orca-frontend-*.vercel.app` |
| Backend (Render, `orca-backend`) | Blocked: no `RENDER_API_KEY` / Render CLI on the build machine | apply `render.yaml` via dashboard |

---

## 5. Post-deploy checklist
1. `curl https://<backend>.onrender.com/health/deep` -> 200. Use `/health/deep`
   here, not `/health`: `/health` answers 200 even when the database is down, so
   it cannot tell you the deploy is actually wired up. (If you do curl `/health`,
   read `.database` from the body -- a 200 alone proves nothing but liveness.)
2. `CORS_ORIGINS` on Render includes the Vercel origin; redeploy backend.
3. `NEXT_PUBLIC_API_BASE_URL` on Vercel equals the Render URL; redeploy frontend.
4. Open the Vercel URL, run a query (e.g. "Is it safe to fish near Visakhapatnam tomorrow?"),
   confirm the Evidence drawer shows `DEMO` provenance tags.
5. Wake the free Render instance a few minutes before any live demo.
