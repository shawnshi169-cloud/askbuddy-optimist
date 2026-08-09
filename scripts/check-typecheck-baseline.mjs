import { readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const baselinePath = join(scriptDir, "typecheck-baseline.json");
const baselineRelativePath = "scripts/typecheck-baseline.json";
const tscPath = join(rootDir, "node_modules", "typescript", "bin", "tsc");
const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));

function git(args) {
  return spawnSync("git", args, { cwd: rootDir, encoding: "utf8" });
}

function resolveBase() {
  if (process.env.CI_BASE_REF) return process.env.CI_BASE_REF;
  if (process.env.GITHUB_EVENT_NAME === "pull_request" && process.env.GITHUB_BASE_REF) {
    return `origin/${process.env.GITHUB_BASE_REF}`;
  }
  if (process.env.GITHUB_EVENT_NAME === "push") return "HEAD^";
  return "origin/main";
}

function readBaselineAt(ref) {
  const result = git(["show", `${ref}:${baselineRelativePath}`]);
  if (result.status !== 0) return null;

  try {
    return JSON.parse(result.stdout);
  } catch {
    console.error(`Unable to parse typecheck baseline at ${ref}.`);
    process.exit(1);
  }
}

let policyBaselineSource = resolveBase();
let policyBaseline = readBaselineAt(policyBaselineSource);

if (policyBaseline === null) {
  const history = git([
    "log",
    "--reverse",
    "--format=%H",
    "HEAD",
    "--",
    baselineRelativePath,
  ]);
  const bootstrapCommit = history.stdout.split("\n").find(Boolean);
  if (bootstrapCommit) {
    policyBaselineSource = `${bootstrapCommit} (bootstrap snapshot)`;
    policyBaseline = readBaselineAt(bootstrapCommit);
  }
}

if (policyBaseline !== null) {
  const baselineGrowth = Object.entries(baseline).filter(
    ([key, count]) => count > (policyBaseline[key] ?? 0),
  );

  if (baselineGrowth.length > 0) {
    console.error(`Typecheck baseline growth is not allowed (compared with ${policyBaselineSource}):`);
    for (const [key, count] of baselineGrowth) {
      console.error(`- ${key}: ${count} (approved ${policyBaseline[key] ?? 0})`);
    }
    console.error("An increase requires an explicit Architecture / Codex A exception.");
    process.exit(1);
  }
}

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
if (policyBaseline !== null) {
  console.log(`Baseline growth check passed against ${policyBaselineSource}.`);
}
