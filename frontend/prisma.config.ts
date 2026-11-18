import { defineConfig } from "prisma/config";

// The schema lives in the sibling backend directory. Keep a single source of
// truth for the database model while allowing `prisma generate` to run from
// the frontend (Vercel Root Directory) during builds.
export default defineConfig({
  schema: "../backend/prisma/schema.prisma",
  migrations: {
    path: "../backend/prisma/migrations",
  },
  datasource: {
    // Generate must work without a live database. Runtime queries always use
    // the real DATABASE_URL injected by Vercel.
    url: process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/mylifeos?schema=public",
  },
});
