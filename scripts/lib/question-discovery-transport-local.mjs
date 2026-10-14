import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import ts from "typescript";

export async function withDiscoveryTransport(check) {
  const temp = mkdtempSync(join(process.cwd(), "node_modules/.d1b-local-"));
  try {
    writeFileSync(join(temp, "package.json"), JSON.stringify({ type: "commonjs" }));
    const folders = ["local-backend/question-discovery-v1", "local-backend/question-discovery-transport-v1"];
    const entries = folders.flatMap(dir => readdirSync(dir).filter(p => p.endsWith(".ts")).map(p => `${dir}/${p}`));
    const program = ts.createProgram(entries, { strict: true, skipLibCheck: true, noEmit: true,
      esModuleInterop: true, target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    assert.equal(diagnostics.length, 0, ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCanonicalFileName: name => name, getCurrentDirectory: () => process.cwd(), getNewLine: () => "\n",
    }));
    for (const source of program.getSourceFiles()) {
      if (source.isDeclarationFile || source.fileName.includes("node_modules")) continue;
      const file = join(temp, relative(process.cwd(), source.fileName).replace(/\.ts$/, ".js"));
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, ts.transpileModule(source.text, { compilerOptions: {
        target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, esModuleInterop: true,
      } }).outputText);
    }
    const require = createRequire(import.meta.url);
    return await check(Object.assign({}, ...entries.map(path => require(join(temp, path.replace(/\.ts$/, ".js"))))), temp);
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
