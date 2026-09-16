import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";

export async function withTopicLocalContract(check) {
  const temp = mkdtempSync(join(process.cwd(), "node_modules/.topic-local-contract-"));
  try {
    writeFileSync(join(temp, "package.json"), JSON.stringify({ type: "commonjs" }));
    for (const source of [
      "packages/shared-types/src/product-channels.ts", "packages/shared-types/src/question-answer-v1.ts",
      "packages/shared-types/src/discovery-v1.ts", "packages/shared-api/src/question-answer-v1.ts",
      "packages/shared-api/src/canonical-topic-v1-local.ts",
    ]) {
      const output = join(temp, source.replace(/\.ts$/, ".js"));
      mkdirSync(dirname(output), { recursive: true });
      writeFileSync(output, ts.transpileModule(readFileSync(source, "utf8"), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
      }).outputText);
    }
    const require = createRequire(import.meta.url);
    return await check(require(join(temp, "packages/shared-api/src/canonical-topic-v1-local.js")),
      require(join(temp, "packages/shared-api/src/question-answer-v1.js")));
  } finally { rmSync(temp, { recursive: true, force: true }); }
}
