import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const dir = readdirSync("node_modules/.pnpm").find((x) => /^esbuild@/.test(x));
const { build } = await import(
  "../node_modules/.pnpm/" + dir + "/node_modules/esbuild/lib/main.js"
);
await build({
  entryPoints: ["server/api.ts"],
  outfile: "tests/api-bundle.mjs",
  bundle: true,
  platform: "node",
  format: "esm",
});
process.exit(
  spawnSync(process.execPath, ["--test", "tests/api.test.mjs"], {
    stdio: "inherit",
  }).status ?? 1,
);
