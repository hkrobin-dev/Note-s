# My Life OS — Testing

Stack: **Vitest** (unit/integration) + **Playwright** (e2e).

```bash
npm test                # vitest run
npm run test:e2e        # playwright
```

## Unit (`tests/unit`)

- BDT/currency formatting + money math (Decimal)
- Budget utilization (incl. zero-budget / zero-expense corners)
- Dhaka timezone date formatting & month bucketing
- Recurrence occurrence generation (bounded windows)
- Task status transition rules
- Project progress = done tasks / total tasks (excl. cancelled)

## Integration (`tests/integration`)

Uses a dedicated test database (`DATABASE_URL` in test env) with migrations applied.

- Task CRUD, subtasks, filters
- Project ↔ task linkage; project progress aggregation
- Expense create/edit → monthly totals correct (NUMERIC)
- Budget round against expense history; exceeded detection
- Nested pages; page tags
- FileLink: one StoredFile linked to many records; link removal ≠ file deletion
- Reminder schedule → due → send → dedupe retry → cancel

## E2E (`tests/e2e`)

Real flows: navigate modules; create/complete task; schedule event; create expense
and verify dashboard total; create project + linked records; write/reopen note;
upload/download attachment; search; responsive navigation.

## Security/reliability

- Zod rejects invalid dates/amounts/recurrences
- Unsupported upload types rejected server-side (extension + magic-byte check)
- Path traversal blocked on filename handling
- Duplicate reminder delivery prevented under retry
- `prisma migrate reset`/deploy verified
- Backup/restore drill verified (DEPLOYMENT.md §5)
