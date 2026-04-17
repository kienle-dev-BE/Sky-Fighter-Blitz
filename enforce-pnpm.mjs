import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

for (const name of ["package-lock.json", "yarn.lock"]) {
  try {
    fs.unlinkSync(path.join(root, name));
  } catch {
    // ignore missing / unreadable
  }
}

const ua = process.env.npm_config_user_agent ?? "";
if (!ua.includes("pnpm/")) {
  console.error("Use pnpm instead");
  process.exit(1);
}
