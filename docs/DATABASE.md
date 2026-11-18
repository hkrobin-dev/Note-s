# My Life OS — Database

- **Engine:** PostgreSQL 18 (local dev) — `localhost:5432`, database `mylifeos`, user `mylifeos`.
- **ORM:** Prisma 7. Schema: `prisma/schema.prisma`. Generated client: `src/generated/prisma` (git-ignored).
- **Config:** `prisma.config.ts` (Prisma 7 moved the datasource URL out of the schema).
- **Driver:** `@prisma/adapter-pg` + `pg` — Prisma 7 requires a driver adapter at runtime.
- **Money:** `Decimal @db.Decimal(14,2)` everywhere. No Float arithmetic for totals.

## Connection

Copy `.env.example` → `.env` and set `DATABASE_URL`:

```
DATABASE_URL="postgresql://mylifeos:mylifeos_dev@localhost:5432/mylifeos?schema=public"
```

`prisma.config.ts` loads `.env` via `dotenv` and passes `DATABASE_URL` to the CLI.
The app client lives in `src/lib/db.ts`:

```ts
new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) })
```

Never call `new PrismaClient()` without an adapter — Prisma 7 throws.

## Common commands

```bash
npm run db:migrate    # prisma migrate deploy — apply committed migrations
npm run db:seed       # prisma db seed — idempotent sample data
npm run db:generate   # regenerate src/generated/prisma after schema edits
npm run db:studio     # inspect data
npm run db:reset      # drop + re-migrate + re-seed (development only)
```

### Creating a new migration

`prisma migrate dev` needs a shadow database (`CREATEDB` on the role). The local
`mylifeos` role does not have it, so the initial migration was generated with a
read-only diff and applied with `deploy`:

```bash
# After editing prisma/schema.prisma:
mkdir -p prisma/migrations/<timestamp>_<name>
npx prisma migrate diff \
  --from-config-datasource \
  --to-schema prisma/schema.prisma \
  --script -o prisma/migrations/<timestamp>_<name>/migration.sql
npm run db:migrate
```

`--from-config-datasource` diffs the live database against the schema, so it
needs no shadow database. Alternatively grant the role `CREATEDB` and use the
normal `npx prisma migrate dev` workflow.

## Seed

`prisma/seed.ts` creates a realistic single-user dataset in `Asia/Dhaka`:
categories, projects, tasks, events, reminders, monthly budgets, expenses,
income, notes, and a recurring electricity bill. Every record has a stable id
and is upserted, so re-running is safe.

## Core models

| Model | Purpose |
|---|---|
| Project, Task, TaskComment, Tag, TaskTag | Work/items |
| CalendarEvent, RecurrenceRule | Events; bounded recurrence windows |
| Reminder | Persistent reminders with status lifecycle (PENDING→SENT/FAILED/CANCELLED) |
| ExpenseCategory, Expense, Budget, IncomeRecord, RecurringExpense | Finance (BDT, NUMERIC) |
| Page, PageTag | Notion-style knowledge hub (TipTap JSON) |
| StoredFile, FileLink | Binary outside DB; one binary, many links |
| AppSetting, ActivityLog | Preferences + audit trail |

## Integrity rules

- Deletions: `SetNull` for project links, `Cascade` only for owned children (subtasks, comments, file links). Expenses restrict category deletion.
- `FileLink` is polymorphic (`linkedKind` + `linkedId`) — it intentionally has no direct `Expense` relation; one file can link to many records.
- `FileLink` unique on (fileId, linkedKind, linkedId) prevents duplicate links.
- `Budget` unique on (month, categoryId); month stored as first-of-month marker.
- Reminder dedupe: `sentAttempts` guard + status check inside a transaction before marking SENT.
- `RecurrenceRule.weekdays` is `Int[]` (Prisma rejects optional lists); an empty array means "not weekday-based".

## Backups

See `DEPLOYMENT.md` §Backups (`pg_dump` + upload dir). A backup is only "trusted" after a restore drill is documented and run.
