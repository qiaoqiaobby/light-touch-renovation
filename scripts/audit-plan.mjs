import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import esbuild from "esbuild";

mkdirSync("mid", { recursive: true });
const entries = ["src/floorplan/audit.ts", "src/floorplan/scheme-audit.ts"];
for (const entry of entries) {
  const outfile = entry.endsWith("scheme-audit.ts") ? "mid/scheme-audit.mjs" : "mid/plan-audit.mjs";
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent",
  });
  const result = spawnSync(process.execPath, [outfile], { stdio: "inherit" });
  if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
}
