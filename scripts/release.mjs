import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const bumps = new Set(["patch", "minor", "major"]);
const bump = process.argv[2] ?? "patch";

if (!bumps.has(bump)) {
  console.error("Usage: npm run release -- [patch|minor|major]");
  process.exit(1);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function git(args) {
  return spawnSync("git", args, {
    cwd: root,
    encoding: "utf8",
  });
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]).stdout.trim();
if (branch !== "main") {
  console.error(`Release from main (current branch: ${branch}).`);
  process.exit(1);
}

const dirty = git(["status", "--porcelain"]).stdout.trim();
if (dirty) {
  console.error("Working tree must be clean before a release.");
  process.exit(1);
}

run("npm", ["version", bump, "-m", "Release v%s."]);
run("git", ["push", "origin", "HEAD", "--follow-tags"]);
