import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { packExtension, stampInstallHtml } from "./pack.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const site = resolve(root, "site-dist");

const { version, zipName, zipPath, aliasPath } = packExtension();

rmSync(site, { recursive: true, force: true });
mkdirSync(site, { recursive: true });
cpSync(resolve(root, "public/install.html"), resolve(site, "index.html"));
stampInstallHtml(resolve(site, "index.html"), version);
cpSync(resolve(root, "public/icons"), resolve(site, "icons"), { recursive: true });
cpSync(zipPath, resolve(site, zipName));
cpSync(aliasPath, resolve(site, "chillax-for-friends.zip"));

if (!existsSync(resolve(site, zipName))) {
  console.error(`site-dist/${zipName} missing.`);
  process.exit(1);
}

console.log("\nVercel output:");
console.log(`  ${site}`);
console.log(`Contains index.html (installer), ${zipName}, and chillax-for-friends.zip.`);
