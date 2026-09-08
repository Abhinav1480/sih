# Production Deployment & Infrastructure Guide
## ORCA: SIH 2026 PS 26176

### 1. Prerequisites
- Node.js 18+ or 20+
- Python 3.10+
- PostgreSQL 15+ with PostGIS 3+ (optional for production; SQLite included for local zero-dependency development)
- Docker & Docker Compose (optional for containerized deployment)

---

### 2. Local Bare-Metal Startup (Fastest Developer Workflow)

#### Terminal 1: Backend
```bash
# Clone and enter repository
cd sih

# Setup Python environment
python -m venv venv
.\venv\Scripts\Activate.ps1   # On Windows PowerShell (or source venv/bin/activate on Linux/Mac)
pip install -r backend/requirements.txt

# Run FastAPI backend (http://127.0.0.1:8000)
python backend/run.py
```

#### Terminal 2: Frontend
```bash
cd sih/frontend
npm install
npm run dev
# Running on http://localhost:3000
```

---

### 3. Containerized Deployment (Docker Compose)

```bash
cd sih
docker compose up --build -d
```

The stack provisions:
1. `orca-db`: PostgreSQL 16 with PostGIS extensions
2. `orca-backend`: FastAPI application on port 8000
3. `orca-frontend`: Next.js 14 production standalone server on port 3000

---

### 4. Environment Variables Reference

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `ORCA_MODE` | `DEMO` | Sets system mode: `DEMO` (deterministic offline fixtures) or `LIVE` (real network calls). |
| `DATABASE_URL` | `sqlite+aiosqlite:///./orca.db` | Connection string for database. |
| `HOST` | `127.0.0.1` | Host address for FastAPI backend. |
| `PORT` | `8000` | Port for FastAPI backend. |
| `ANTHROPIC_API_KEY` | *(Optional)* | Anthropic Claude API key for live Claude synthesis. |
| `ANTHROPIC_MODEL` | `claude-3-5-sonnet-20241022` | Configured Claude model identifier. |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | Target URL used by Next.js frontend to query backend. |
