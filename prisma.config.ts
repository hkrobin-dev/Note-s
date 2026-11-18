import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Direct access (not env()) so `prisma generate` works in CI without a DB URL.
    url: process.env.DATABASE_URL ?? "",
  },
});
