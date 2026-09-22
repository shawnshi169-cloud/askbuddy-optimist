import { readFileSync } from "node:fs";
import ts from "typescript";

// Load the same dependency-free implementation used by the client parser; no second algorithm.
const source = readFileSync(new URL("../../packages/shared-api/src/canonical-topic-normalization-v1.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
export const { normalizeCanonicalTopicTermV1: normalizeTerm } = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
);
