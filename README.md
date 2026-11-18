# My Life OS

A personal life-management OS — tasks, notes, calendar, expenses, projects, reminders, notifications, and a glassmorphism dashboard — split into three independently deployable units.

## Architecture

| Unit | Folder | Tech | Deploy target |
|------|--------|------|---------------|
| Database | — | PostgreSQL (Prisma) | Neon / Supabase / Railway / self-hosted |
| Backend API | `backend/` | Express + Prisma + reminder scheduler | Railway / Render / Docker / VPS |
| Frontend | `frontend/` | Next.js 16 + React 19 + Tailwind v4 | Vercel / Netlify / Docker |

## Why separate?

- **DB** runs on its own managed PostgreSQL; backend connects via `DATABASE_URL`.
- **Backend** owns Prisma, the REST API, and the reminder scheduler; deploys independently of the frontend.
- **Frontend** is a client-side Next.js app that calls the backend API; deploys independently (static or server).

## Local development

```bash
# 1. Copy env files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# 2. Edit backend/.env and frontend/.env with your values (DATABASE_URL, JWT_SECRET, FRONTEND_URL)

# 3. Start everything (Postgres + Backend + Frontend)
docker compose up --build

# Services:
# - Frontend: http://localhost:3100
# - Backend API: http://localhost:4100
# - Postgres: localhost:5432
```

## Backend

```bash
cd backend
npm install
cp .env.example .env   # set DATABASE_URL, JWT_SECRET
npm run db:generate    # generate Prisma client
npm run db:migrate     # run migrations
npm run dev            # http://localhost:4100
```

## Frontend

```bash
cd frontend
npm install
cp .env.example .env   # set NEXT_PUBLIC_API_URL
npm run dev            # http://localhost:3100
```

## Production deployment (Vercel Services + Neon)

The root `vercel.json` defines two services in **one Vercel project with one
domain**:

| Service | Root | Public paths |
| --- | --- | --- |
| `frontend` | `frontend/` | `/` and all UI routes |
| `backend` | `backend/` | `/api/*`, `/health`, `/auth/*` |

1. Provision Neon PostgreSQL and set `DATABASE_URL` (shared by both services).
2. Import the repository into Vercel with **no Root Directory override**.
3. Set the shared environment variables listed in `docs/DEPLOYMENT.md`. Do not
   set `NEXT_PUBLIC_API_URL` or `BACKEND_URL` in production.
4. Deploy. The frontend service declares a binding to the backend service, so
   server-side code receives `BACKEND_URL` at runtime; the browser uses
   same-origin `/api/*` requests that Vercel routes to the backend service.

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for the full guide.

## Features

- Glassmorphism UI with light/dark mode (CSS custom properties, `data-theme`)
- Dashboard with stats, today's focus, recent activity, quick links
- Tasks, notes, calendar, expenses, projects (full CRUD)
- Reminder system with server-side scheduler + browser notifications
- In-app notification center (read/unread, mark all)
- Settings (theme, notifications)
- Auth (login/register, JWT, protected API)
- **Ask your life** — RAG assistant over your notes, tasks, events and goals, selectable between local Ollama and hosted NVIDIA NIM/Nemotron ([setup guide](docs/AI_SETUP.md))

## Design

The UI uses the original **"Calm Focus"** design system — see `docs/design-system.md`.
It was inspired by current dashboard trends (flat layered surfaces, one accent,
grouped navigation, bento grids) rather than copied from any Dribbble artwork.

- Solid, layered surfaces with hairline borders; blur reserved for overlays
- Light theme: warm `#faf8f4` cream canvas on white surfaces
- Dark theme: deep `#0a1220` navy canvas with elevated `#121c2e` surfaces
- Indigo accent (`#4f46e5`) light / soft violet (`#9b8cff`) dark
- Semantic status colors (positive / warning / error) used only for state
- KPI strip + 12-column bento dashboard, grouped sidebar, skeleton and empty states
# Note-s
