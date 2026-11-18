# My Life OS — Vercel + Neon deployment

The frontend and backend deploy as **one Vercel project with one URL**.

```
Browser
  └─ https://<app>.vercel.app
       ├─ /                 Next.js App Router (UI)
       └─ /api/*            Next.js Pages Router catch-all → Express app
                                   └─ Neon PostgreSQL (Prisma + pgvector)
```

- Vercel **Root Directory:** `frontend`
- `prebuild` generates the Prisma client and copies `backend/src` into
  `frontend/.backend-runtime/` so the Express API is bundled into the project.
- `frontend/vercel.json` defines `/health` + `/auth` rewrites and the cron job.
- Uploaded file bytes are stored in the `StoredFile.data` `BYTEA` column in
  Neon. Vercel's filesystem is read-only and ephemeral, so local disk storage
  is not used in production. Keep `MAX_FILE_SIZE_MB=4` (Vercel has a 4.5 MB
  request-body limit).

## 1. Create the Neon database

1. Create a Neon project (Postgres 16).
2. In the Neon SQL editor, enable pgvector (the baseline migration also does
   this, but enabling it explicitly is harmless):
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
3. Copy the **pooled** connection string (it contains `-pooler` and
   `sslmode=require`). Use it as `DATABASE_URL` everywhere.

## 2. Apply migrations

From a local checkout with `DATABASE_URL` set (e.g. in `backend/.env`):

```bash
cd backend
npx prisma migrate deploy
```

Migration order: `20261101000000_init` (baseline), the two RAG/pgvector
migrations, then `20261120000000_add_stored_file_data`.

> If the database was previously created with `prisma db push` rather than
> migrations, baseline it first so Prisma does not try to recreate tables:
> ```bash
> npx prisma migrate resolve --applied 20261101000000_init
> ```
> Then resolve the remaining applied migrations individually if needed.

Create the demo user/categories/tags (optional but convenient):

```bash
cd backend && npx prisma db seed
```

## 3. Deploy to Vercel

1. Import the repository. Set **Root Directory** to `frontend`.
2. Framework: **Next.js**. Build command: `npm run build` (from `vercel.json`).
3. Add these **Environment Variables** (all environments):

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
same-origin `/api/*` requests.

4. Deploy. Vercel will run `prebuild` → `prisma generate` → `copy:backend` →
   `next build`.

## 4. Verify

```bash
curl https://<your-app>.vercel.app/api/health
# {"status":"ok","service":"my-life-os-backend"}

curl https://<your-app>.vercel.app/health
# same response (rewrite)

curl https://<your-app>.vercel.app/api/tasks
# 401 with AUTH_ENFORCE=true — log in first via /api/auth/login
```

Sign in at `/login` with the seeded user (`demo@mylifeos.com` / `demo1234`)
or register a new account. Cookies are `httpOnly`, `sameSite=lax`, `secure`
in production.

## 5. Scheduled reminders

`frontend/vercel.json` registers a daily cron at `/api/cron/tick`. Vercel sends
`Authorization: Bearer $CRON_SECRET`; the endpoint rejects requests without a
matching secret. Hobby projects are limited to one cron run per day — upgrade
to Pro for more frequent ticks. For minute-level reminders on Hobby, keep the
standalone scheduler running on a VPS:

```bash
cd backend && npm run scheduler:start
```

## 6. Local development (split mode)

The UI and API still run as two servers locally:

```bash
# terminal 1
cd frontend && npm run dev     # http://localhost:3100

# terminal 2
cd backend && npm run dev      # http://localhost:4100
```

`frontend/.env.local` sets `NEXT_PUBLIC_API_URL=http://localhost:4100`, so the
UI calls the standalone API. `next.config.ts` also loads `backend/.env`, which
lets you test the `/api/*` bridge locally.

To run the production-shaped single-server build locally:

```bash
cd frontend && npm run build && npm start
# http://localhost:3100 serves UI + /api/*
```

## 7. Notes / limitations

- `AUTH_ENFORCE=false` (demo mode) must never be used on a public deployment.
- AI features that use Ollama cannot run on Vercel; use `AI_PROVIDER=nvidia`.
- Files larger than 4 MB will be rejected; use a dedicated object store if you
  need larger uploads.
- The generated Prisma client uses extensionless imports so Next.js can bundle
  it. Do not hand-edit `backend/src/generated/prisma`.
- `frontend/.backend-runtime/` is a build artifact and is gitignored.
