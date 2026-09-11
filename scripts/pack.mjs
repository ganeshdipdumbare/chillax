import { spawnSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");
const zipPath = resolve(root, "chillax-for-friends.zip");

export function packExtension() {
  const build = spawnSync("npm", ["run", "build"], {
    cwd: root,
    stdio: "inherit",
    shell: true,
  });
  if (build.status !== 0) process.exit(build.status ?? 1);

  if (!existsSync(resolve(dist, "manifest.json"))) {
    console.error("dist/manifest.json missing after build.");
    process.exit(1);
  }
  if (!existsSync(resolve(dist, "install.html"))) {
    console.error("dist/install.html missing. It should copy from public/install.html.");
    process.exit(1);
  }

  rmSync(zipPath, { force: true });
  const zip = spawnSync("zip", ["-r", zipPath, "."], {
    cwd: dist,
    stdio: "inherit",
  });
  if (zip.status !== 0) {
    const py = spawnSync(
      "python3",
      [
        "-c",
        [
          "import zipfile",
          "from pathlib import Path",
          `src = Path(${JSON.stringify(dist)})`,
          `dest = Path(${JSON.stringify(zipPath)})`,
          "with zipfile.ZipFile(dest, 'w', zipfile.ZIP_DEFLATED) as z:",
          "    for p in src.rglob('*'):",
          "        if p.is_file():",
          "            z.write(p, p.relative_to(src).as_posix())",
        ].join("\n"),
      ],
      { stdio: "inherit" },
    );
    if (py.status !== 0) {
      console.error("zip failed. On macOS/Linux, install the zip CLI.");
      process.exit(py.status ?? 1);
    }
  }

  console.log("\nPacked:");
  console.log(`  ${zipPath}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  packExtension();
  console.log("Tell them: unzip, open install.html, follow the six steps.");
}
