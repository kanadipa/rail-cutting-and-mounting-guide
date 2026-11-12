// Creates .env from .env.example on first setup. An existing .env is never overwritten.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const target = path.join(root, ".env");
if (fs.existsSync(target)) {
  console.log(".env already exists, keeping it");
} else {
  fs.copyFileSync(path.join(root, ".env.example"), target);
  console.log("Created .env from .env.example");
}
