import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const sourcePath = join(scriptDir, "..", "src", "config", "runtimeModeCore.ts");
const source = readFileSync(sourcePath, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2020,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const runtime = await import(moduleUrl);

assert.equal(runtime.resolveRuntimeMode("development"), "development");
assert.equal(runtime.resolveRuntimeMode("staging"), "staging");
assert.equal(runtime.resolveRuntimeMode("production"), "production");
assert.equal(runtime.resolveRuntimeMode("development-from-local-env"), "production");
assert.equal(runtime.resolveRuntimeMode(undefined), "production");

assert.equal(runtime.isPresentationFixtureAllowedForMode("development", true), true);
assert.equal(runtime.isPresentationFixtureAllowedForMode("development", false), false);
assert.equal(runtime.isPresentationFixtureAllowedForMode("staging", true), false);
assert.equal(runtime.isPresentationFixtureAllowedForMode("production", true), false);
assert.equal(
  runtime.isPresentationFixtureAllowedForMode(runtime.resolveRuntimeMode("trial"), true),
  false,
);
assert.equal(
  runtime.isPresentationFixtureAllowedForMode(runtime.resolveRuntimeMode(undefined), true),
  false,
);

for (const capability of runtime.RUNTIME_CAPABILITIES) {
  assert.equal(
    runtime.isRuntimeCapabilityAllowedForMode(capability, "production"),
    false,
    `${capability} must be disabled in production`,
  );
}

console.log("Runtime mode contract passed: development, staging, production; unknown values fail closed.");
