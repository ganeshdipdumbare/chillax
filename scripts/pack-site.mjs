import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packExtension } from "./pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(root, "site-dist");
const zipPath = resolve(root, "chillax-for-friends.zip");

packExtension();

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
cpSync(resolve(root, "public/install.html"), resolve(site, "index.html"));
cpSync(resolve(root, "public/icons"), resolve(site, "icons"), { recursive: true });
cpSync(zipPath, resolve(site, "chillax-for-friends.zip"));

if (!existsSync(resolve(site, "chillax-for-friends.zip"))) {
  console.error("site-dist/chillax-for-friends.zip missing.");
  process.exit(1);
}

console.log("\nVercel output:");
console.log(`  ${site}`);
console.log("Contains index.html (installer) and chillax-for-friends.zip.");
