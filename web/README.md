# ORCA web

The web application for ORCA: a fisherman signs in, sees his own dashboard,
and talks to an AI that plans his day at sea. Independent Next.js project;
nothing here imports from `frontend/` or `backend/`.

```bash
cd web
npm install
npm run dev            # http://localhost:3100, answers from the recorded captures
npm run build          # runs the honesty gate first (prebuild)
npm run check:honesty:proof
```

## Data

Built against the frozen contract 1.5.0 captures in `docs/examples/`, copied
verbatim into `src/captures/` by `npm run sync:captures`. The build fails if
the copies drift. Set `NEXT_PUBLIC_ORCA_API_BASE` to talk to a live backend;
without it every answer comes from a capture and the UI says so, naming the
question the recording actually answered.

## Auth

The browser talks only to same-origin `/api/auth/*` route handlers, which
keep tokens in httpOnly cookies. With `ORCA_API_BASE` set they proxy the
backend's contract-1.5.0 auth endpoints; without it a local stand-in with the
same interface answers (users persist under `.orca-local/`, gitignored) and
the UI says on screen that it is a stand-in.

## The honesty rule

`scripts/check-honesty.mjs` runs on every build. See `docs/HONESTY_RULE.md`
and `docs/WEB_NOTES.md`. The spoken reply is assembled only by
`src/lib/spoken/buildSpokenScript.ts`, whose test feeds it responses with
fields removed and asserts nothing is claimed about them.
