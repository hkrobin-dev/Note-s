import fs from "node:fs";
import path from "node:path";

/**
 * Vercel installs only `frontend/package.json` (Root Directory = frontend),
 * but the Express API source lives in the sibling `backend/` directory.
 * Copy it into the frontend before building so every import resolves from
 * `frontend/node_modules` and the serverless bundle contains the API code.
 */
const source = path.resolve(process.cwd(), "../backend/src");
const destination = path.resolve(process.cwd(), ".backend-runtime/src");

if (!fs.existsSync(path.join(source, "index.ts"))) {
  throw new Error(`Backend source not found at ${source}`);
}

fs.rmSync(path.resolve(process.cwd(), ".backend-runtime"), { recursive: true, force: true });
fs.mkdirSync(path.dirname(destination), { recursive: true });
fs.cpSync(source, destination, { recursive: true });

console.log(`Copied backend source to ${destination}`);
