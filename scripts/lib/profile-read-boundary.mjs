import ts from "typescript";

export const PUBLIC_PROFILE_COLUMNS = [
  "user_id", "nickname", "avatar_url", "cover_url", "bio", "city", "school", "industry", "created_at",
];
const safe = new Set(PUBLIC_PROFILE_COLUMNS);

// Resolve fluent queries, including constant query aliases; computed projections fail closed.
export function auditProfileReads(source, filename = "client.ts") {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const bindings = new Map();
  const errors = [];
  let reads = 0;
  const walk = (node, visit) => { visit(node); ts.forEachChild(node, (child) => walk(child, visit)); };
  walk(file, (node) => {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
      bindings.set(node.name.text, node.initializer);
    }
  });
  const literal = (node, seen = new Set()) => {
    if (!node) return undefined;
    if (ts.isStringLiteralLike(node)) return node.text;
    if (ts.isIdentifier(node) && !seen.has(node.text)) {
      return literal(bindings.get(node.text), new Set([...seen, node.text]));
    }
    return undefined;
  };
  const method = (node) => ts.isPropertyAccessExpression(node) ? node.name.text
    : ts.isElementAccessExpression(node) ? literal(node.argumentExpression) : undefined;
  const receiver = (node) => ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
    ? node.expression : undefined;
  const profileQuery = (node, seen = new Set()) => {
    if (!node) return false;
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node) || ts.isNonNullExpression(node)) {
      return profileQuery(node.expression, seen);
    }
    if (ts.isIdentifier(node) && !seen.has(node.text)) {
      return profileQuery(bindings.get(node.text), new Set([...seen, node.text]));
    }
    if (!ts.isCallExpression(node)) return false;
    if (method(node.expression) === "from") return literal(node.arguments[0]) === "profiles";
    return profileQuery(receiver(node.expression), seen);
  };
  const check = (projection, node) => {
    reads++;
    // Aliases/casts/embedded relations need explicit review, not silent permission expansion.
    if (!projection || projection.split(",").some((column) => !safe.has(column.trim()))) {
      const line = file.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      errors.push(`${filename}:${line}: profiles requires an explicit public-safe projection`);
    }
  };
  walk(file, (node) => {
    if (!ts.isCallExpression(node) || method(node.expression) !== "select") return;
    const projection = literal(node.arguments[0]);
    if (profileQuery(receiver(node.expression))) check(projection, node);
    else if (projection?.match(/\bprofiles(?:![\w]+)?\s*\(/)) {
      for (const match of projection.matchAll(/\bprofiles(?:![\w]+)?\s*\(([^()]*)\)/g)) check(match[1], node);
    }
  });
  return { reads, errors };
}
