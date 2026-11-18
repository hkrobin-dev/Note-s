# My Life OS — Vercel Services + Neon deployment

The frontend and backend deploy as **two services in one Vercel project**, with
one shared domain and one shared set of environment variables.

```
Browser
  └─ https://<app>.vercel.app
       ├─ / , /login , /<page>   → frontend service (Next.js, root: frontend/)
       └─ /api/* , /health , /auth/*
                                 → backend service (Express, root: backend/)
                                      └─ Neon PostgreSQL (Prisma + pgvector)
```

All routing lives in the repository-root `vercel.json`:

- `services.frontend` — Next.js app, public via the catch-all `/(.*)` rewrite.
- `services.backend` — Express API, public via `/api/(.*)`, `/health` and
  `/auth/:path*` rewrites. Its entrypoint is `dist/index.js`, built with
  `npm run db:generate && npm run build`.
- `services.frontend.bindings` — injects `BACKEND_URL` (internal URL of the
  backend service) into frontend **functions at runtime only**. Do not set this
  variable yourself; it is deployment-aware. Browser code still uses
  same-origin `/api/*` URLs, which Vercel routes to the backend service.
- `crons` — daily `/api/cron/tick` job, routed to the backend service.

A `frontend/src/pages/api/[...path].ts` bridge remains for local
production-shaped builds (`cd frontend && npm run build && npm start`); on
Vercel the top-level rewrite sends `/api/*` straight to the backend service.

## 1. Create the Neon database

1. Create a Neon project (Postgres 16).
2. Enable pgvector (the baseline migration also does this):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Copy the **pooled** connection string (contains `-pooler` and
   `sslmode=require`). Use it as `DATABASE_URL`.

## 2. Apply migrations

```bash
cd backend
npx prisma migrate deploy
```

Migration order: `20261101000000_init` (baseline), the two RAG/pgvector
migrations, then `20261120000000_add_stored_file_data`.

> If the database was previously created with `prisma db push`, baseline it:
> ```bash
> npx prisma migrate resolve --applied 20261101000000_init
> ```

Seed the demo user/categories/tags (optional):

```bash
cd backend && npx prisma db seed
```

## 3. Deploy to Vercel

1. Import the repository. **Do not set a Root Directory** — the root
   `vercel.json` declares the services and their roots.
2. Framework detection is per service (`nextjs` / `express`); build commands are
   in `vercel.json`.
3. Add these **Environment Variables** (shared by both services, all
   environments):

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | Neon pooled connection string |
| `JWT_SECRET` | long random string |
| `AUTH_ENFORCE` | `true` |
| `CRON_SECRET` | long random string (different from JWT secret) |
| `FRONTEND_URL` | `https://<your-app>.vercel.app` |
| `MAX_FILE_SIZE_MB` | `4` |
| `APP_TIMEZONE` | `Asia/Dhaka` |
| `APP_CURRENCY` | `BDT` |
| `AI_PROVIDER` | `nvidia` (Ollama is not available on Vercel) |
| `NVIDIA_API_KEY` | your NVIDIA NIM key (keep secret) |
| `NVIDIA_BASE_URL` | `https://integrate.api.nvidia.com/v1` |

Do **not** set `NEXT_PUBLIC_API_URL` in production — the client uses
same-origin `/api/*` requests. Do **not** set `BACKEND_URL` — Vercel injects it
from the binding.

4. Deploy. Vercel builds the two services independently.

## 4. Verify

```bash
curl https://<your-app>.vercel.app/api/health
# {"status":"ok","service":"my-life-os-backend"}

curl https://<your-app>.vercel.app/health
# same response (public rewrite to the backend service)

curl https://<your-app>.vercel.app/api/tasks
# 401 with AUTH_ENFORCE=true — log in first via /api/auth/login
```

Sign in at `/login` with the seeded user (`demo@mylifeos.com` / `demo1234`)
or register a new account. Cookies are `httpOnly`, `sameSite=lax`, `secure`
in production.

## 5. Scheduled reminders

The root `vercel.json` registers a daily cron at `/api/cron/tick`, routed to the
backend service. Vercel sends `Authorization: Bearer $CRON_SECRET`; the endpoint
rejects requests without a matching secret. Hobby projects are limited to one
cron run per day — upgrade to Pro for more frequent ticks.

## 6. Local development

Run all services together with bindings injected:

```bash
vercel dev          # or: vercel dev --local
```

Two-server mode still works too:

```bash
# terminal 1
cd frontend && npm run dev     # http://localhost:3100
# terminal 2
cd backend && npm run dev      # http://localhost:4100
```

`frontend/.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:4100`, so the
UI calls the standalone API. `next.config.ts` also loads `backend/.env`, which
lets you test the `/api/*` bridge locally.

## 7. Notes / limitations

- `AUTH_ENFORCE=false` (demo mode) must never be used on a public deployment.
- AI features that use Ollama cannot run on Vercel; use `AI_PROVIDER=nvidia`.
- Uploaded file bytes are stored in the `StoredFile.data` `BYTEA` column in
  Neon because the serverless filesystem is read-only/ephemeral. Keep
  `MAX_FILE_SIZE_MB=4` (Vercel has a 4.5 MB request-body limit).
- The generated Prisma client uses extensionless imports so it can be bundled
  by Next.js. Do not hand-edit `backend/src/generated/prisma`.
- `frontend/.backend-runtime/` is a build artifact and is gitignored.
