import { spawnSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import esbuild from "esbuild";

mkdirSync("mid", { recursive: true });
const check = resolve("boards/scripts/check.mjs");
await esbuild.build({
  entryPoints: ["src/decor/audit.ts"],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile: "mid/decor-audit.mjs",
  logLevel: "silent",
  plugins: [{
    name: "external-check",
    setup(build) {
      build.onResolve({ filter: /check\.mjs$/ }, () => ({ path: check, external: true }));
    },
  }],
});
const result = spawnSync(process.execPath, ["mid/decor-audit.mjs", ...process.argv.slice(2)], { stdio: "inherit" });
process.exit(result.status ?? 1);
