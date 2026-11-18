import path from "node:path";
import { config as loadEnv } from "dotenv";
import type { NextConfig } from "next";

// Local development runs the Express API from frontend/.env + backend/.env.
// Vercel injects these variables directly, so this is a no-op in production.
loadEnv({ path: path.resolve(process.cwd(), "../backend/.env") });

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    agentUpgrade: "security",
    // This app loads data from its Express API in the browser (client components),
    // so automatic instant-navigation validation flags every route. Only validate
    // segments that explicitly opt in with `export const instant`.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    // Avoid Next inferring the parent folder as the workspace root because the
    // repository has more than one package-lock.json.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      { source: "/health", destination: "/api/health" },
      { source: "/auth/:path*", destination: "/api/auth/:path*" },
    ];
  },
  // Native / dynamic-require packages must stay external so the serverless
  // bundle loads them from node_modules instead of statically analyzing them.
  serverExternalPackages: [
    "@prisma/adapter-pg",
    "@prisma/client",
    "prisma",
    "pg",
    "bcryptjs",
    "cookie-parser",
    "cors",
    "express",
    "express-validator",
    "helmet",
    "jsonwebtoken",
    "multer",
    "nodemailer",
    "zod",
  ],
};

export default nextConfig;
