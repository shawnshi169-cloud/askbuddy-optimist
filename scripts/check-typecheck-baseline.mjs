import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const baselinePath = join(scriptDir, "typecheck-baseline.json");
const tscPath = join(rootDir, "node_modules", "typescript", "bin", "tsc");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

const result = spawnSync(
  process.execPath,
  [tscPath, "-p", "tsconfig.app.json", "--noEmit", "--pretty", "false"],
  { cwd: rootDir, encoding: "utf8" },
);

if (result.error) {
  throw result.error;
}

const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
const current = {};
const pattern = /^(.+?)\(\d+,\d+\): error (TS\d+):/gm;

for (const match of output.matchAll(pattern)) {
  const file = relative(rootDir, resolve(rootDir, match[1])).replaceAll("\\", "/");
  const key = `${file}|${match[2]}`;
  current[key] = (current[key] ?? 0) + 1;
}

const regressions = Object.entries(current).filter(
  ([key, count]) => count > (baseline[key] ?? 0),
);

if (result.status !== 0 && Object.keys(current).length === 0) {
  console.error("Typecheck failed without parseable source diagnostics:");
  process.stderr.write(output);
  process.exit(result.status ?? 1);
}

if (regressions.length > 0) {
  console.error("Typecheck baseline regression detected:");
  for (const [key, count] of regressions) {
    console.error(`- ${key}: ${count} (baseline ${baseline[key] ?? 0})`);
  }
  process.exit(1);
}

const baselineTotal = Object.values(baseline).reduce((sum, count) => sum + count, 0);
const currentTotal = Object.values(current).reduce((sum, count) => sum + count, 0);
console.log(
  `Typecheck baseline accepted: ${currentTotal} known diagnostics (baseline ${baselineTotal}); no new diagnostics.`,
);
