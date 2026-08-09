import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");

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

let base = resolveBase();
if (git(["rev-parse", "--verify", base]).status !== 0) {
  base = "HEAD^";
}

const commands = [
  ["diff", "--name-only", "--diff-filter=ACMR", `${base}...HEAD`],
  ["diff", "--name-only", "--diff-filter=ACMR"],
  ["diff", "--cached", "--name-only", "--diff-filter=ACMR"],
  ["ls-files", "--others", "--exclude-standard"],
];
const changedFiles = new Set();

for (const args of commands) {
  const result = git(args);
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    process.exit(result.status ?? 1);
  }
  for (const file of result.stdout.split("\n")) {
    if (
      /^(src|packages\/shared-types|packages\/shared-api)\/.*\.(ts|tsx)$/.test(
        file.trim(),
      ) && file.trim() !== "src/integrations/supabase/types.ts"
    ) {
      changedFiles.add(file.trim());
    }
  }
}

const files = [...changedFiles].sort();

if (files.length === 0) {
  console.log("No changed Core App or shared contract TypeScript files require linting.");
  process.exit(0);
}

console.log(`Linting ${files.length} changed TypeScript file(s):`);
for (const file of files) {
  console.log(`- ${file}`);
}

const eslintPath = join(rootDir, "node_modules", "eslint", "bin", "eslint.js");
const lint = spawnSync(process.execPath, [eslintPath, ...files], {
  cwd: rootDir,
  encoding: "utf8",
});

process.stdout.write(lint.stdout ?? "");
process.stderr.write(lint.stderr ?? "");
process.exit(lint.status ?? 1);
