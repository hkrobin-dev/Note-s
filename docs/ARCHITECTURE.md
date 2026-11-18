# My Life OS — Architecture

## Overview

A **modular monolith** built with Next.js App Router (React Server Components + route handlers), PostgreSQL, and Prisma. Single-user (no auth in v1), private deployment, glassmorphism UI.

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) + TypeScript strict |
| UI | React 19, Tailwind CSS v4, Lucide icons |
| Database | PostgreSQL 18 |
| ORM | Prisma |
| Validation | Zod |
| Charts | Recharts |
| Server state | TanStack Query |

## Module map

```
src/
├── app/          # routes (thin) — page shells that compose feature components
│   └── api/      # route handlers: /api/tasks, /api/expenses, ...
├── features/     # per-module UI + client logic (tasks, expenses, ...)
├── components/   # shared UI (glass surfaces, charts, forms)
├── lib/          # utils: db client, validation, dates, currency, storage
├── server/       # business logic + data access (trusted side)
└── types/        # shared types
```

Key rules (from PROJECT_SPEC §15, §17):

1. **Business logic lives in `src/server/*`** — never inside React components.
2. **Every API input is validated with Zod** at the boundary.
3. **Money uses Prisma `Decimal`** (NUMERIC); totals are computed server-side, never trusted from client state.
4. **Reminders are persistent DB records** processed by a server-side scheduler tick; client-side timers are best-effort only.
5. **Files are stored outside `public/`** and served through a controlled download route.

## Data flow

```
Browser UI
  → fetch /api/<module> (Zod validated)
  → src/server/<module> (business logic, Prisma transactions)
  → PostgreSQL
```

Dashboard/report aggregates are computed in SQL/Prisma aggregation — never accumulated from client lists.

## Timezone strategy

- Timestamps stored as UTC `timestamptz`.
- Presentation converts to `Asia/Dhaka` via a shared `lib/dates` helper.
- Month buckets (budgets, reports) are computed with explicit Dhaka offset, not server-local time.

## Future multi-user path

The single-user version has no `owner` column yet. When auth is added, each model gains an `ownerId` relation; the server layer is already the single trusted boundary, so queries there can be scoped per-owner.

## Known v1 restrictions

- No authentication — deploy behind network restrictions / trusted environment only.
- No background job queue — reminder scheduler is an in-process interval worker within the Next server.
- Email delivery deferred.
