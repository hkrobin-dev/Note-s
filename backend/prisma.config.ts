import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // `prisma generate` must work without a live database (CI / Vercel build).
    // Runtime connections always use the real DATABASE_URL from the environment.
    url: process.env.DATABASE_URL ?? "postgresql://user:pass@localhost:5432/mylifeos?schema=public",
  },
});
