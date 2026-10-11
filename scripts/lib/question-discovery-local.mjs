import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

export async function withQuestionDiscovery(check) {
  const temp = mkdtempSync(join(process.cwd(), "node_modules/.question-discovery-local-"));
  try {
    writeFileSync(join(temp, "package.json"), JSON.stringify({ type: "commonjs" }));
    const entries = ["contract", "repository", "snapshot", "service"].map(name =>
      `local-backend/question-discovery-v1/${name}.ts`);
    const program = ts.createProgram([...entries, "packages/shared-api/src/discovery-v1.ts"], {
      strict: true, skipLibCheck: true, noEmitOnError: true, esModuleInterop: true,
      target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.Node10, rootDir: process.cwd(), outDir: temp,
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name, getCurrentDirectory: () => process.cwd(), getNewLine: () => "\n",
    }));
    assert.equal(program.emit().emitSkipped, false);
    const require = createRequire(import.meta.url);
    const api = Object.assign({}, ...entries.map(path => require(join(temp, path.replace(/\.ts$/, ".js")))));
    const discovery = require(join(temp, "packages/shared-api/src/discovery-v1.js"));
    return await check(api, discovery);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
