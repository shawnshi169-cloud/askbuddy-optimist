import assert from "node:assert/strict";

// A lexer for the reviewed PL/pgSQL bodies, not a general SQL parser. Unsupported
// lexical forms fail closed; comments/literals cannot supply dependency tokens.
function tokens(sql) {
  const result = [];
  const fail = (position, reason) => { throw new Error(`Unsupported dependency syntax at ${position}: ${reason}`); };
  for (let i = 0; i < sql.length;) {
    if (/\s/.test(sql[i])) { i++; continue; }
    if (sql.startsWith("--", i)) { const end = sql.indexOf("\n", i); i = end < 0 ? sql.length : end + 1; continue; }
    if (sql.startsWith("/*", i)) {
      const start = i; let depth = 1; i += 2;
      while (i < sql.length && depth) {
        if (sql.startsWith("/*", i)) { depth++; i += 2; }
        else if (sql.startsWith("*/", i)) { depth--; i += 2; }
        else i++;
      }
      if (depth) fail(start, "unterminated comment");
      continue;
    }
    const start = i;
    if (sql[i] === "'") {
      i++; let closed = false;
      while (i < sql.length) {
        if (sql[i] === "\\") fail(i, "escaped string literals are not supported");
        if (sql[i++] === "'") {
          if (sql[i] === "'") { i++; continue; }
          closed = true; break;
        }
      }
      if (!closed) fail(start, "unterminated string");
      result.push({ value: "<literal>", kind: "literal", start });
      continue;
    }
    const identifier = /^[a-z_][a-z0-9_$]*/i.exec(sql.slice(i));
    if (identifier) {
      const value = identifier[0].toLowerCase(); i += identifier[0].length;
      if (value.length > 63) fail(start, "identifier exceeds PostgreSQL ASCII identifier limit");
      if ((value === "e" || value === "u") && ["'", "&"].includes(sql[i])) fail(start, "escaped/Unicode literals are not supported");
      result.push({ value, kind: "identifier", start }); continue;
    }
    const number = /^\d+/.exec(sql.slice(i));
    if (number) { result.push({ value: number[0], kind: "number", start }); i += number[0].length; continue; }
    if ("().,;:=+-*/<>!|[]%".includes(sql[i])) {
      result.push({ value: sql[i++], kind: "punctuation", start }); continue;
    }
    fail(i, "quoted, dollar-quoted, non-ASCII or unknown token");
  }
  return result;
}

export function auditSqlDependencies(sql, { tables, functions }) {
  const stream = tokens(sql), relations = new Set(), calls = new Set();
  const allowedTables = new Set(tables);
  // Compare complete qualified names; argument signatures remain separately fingerprinted.
  const allowedFunctions = new Set(functions.map(signature => signature.slice(0, signature.indexOf("("))));
  const value = index => stream[index]?.value;
  const qualified = index => {
    const schema = stream[index], dot = stream[index + 1], name = stream[index + 2];
    assert.ok(schema?.kind === "identifier" && dot?.value === "." && name?.kind === "identifier",
      `Unsupported dependency syntax at ${schema?.start ?? "end"}: expected complete schema.identifier`);
    assert.notEqual(value(index + 3), ".", "Unsupported dependency syntax: multi-part qualified name");
    return `${schema.value}.${name.value}`;
  };
  const relation = index => {
    const name = qualified(index), after = stream[index + 3];
    assert.ok(!after || after.kind === "identifier" || ["(", ")", ";", ","].includes(after.value),
      `Unsupported dependency syntax after relation ${name}`);
    assert.ok(allowedTables.has(name), `Unreviewed relation dependency ${name}`);
    relations.add(name);
  };
  const source = index => {
    if (value(index) === "(") return; // Nested SELECT is scanned normally.
    if (value(index) === "unnest" && value(index + 1) === "(") return; // Existing built-in array expansion.
    relation(index);
  };
  let depth = 0;
  const fromDepths = new Set();
  for (let i = 0; i < stream.length; i++) {
    const token = stream[i];
    if (token.value === "(") depth++;
    else if (token.value === ")") { fromDepths.delete(depth); depth--; }
    else if (token.value === ";") fromDepths.clear();
    else if (token.value === "," && fromDepths.has(depth)) source(i + 1);
    assert.ok(depth >= 0, "Unsupported dependency syntax: unmatched parenthesis");
    if (token.kind !== "identifier") continue;
    if (["where", "group", "order", "having", "limit", "offset", "union", "returning", "loop"].includes(token.value)) fromDepths.delete(depth);
    assert.notEqual(token.value, "execute", "Unsupported dependency syntax: dynamic SQL");
    // Audit qualified calls (including INSERT column lists) and known-schema
    // references everywhere, including comma-separated relation references.
    if (value(i + 1) === "." && (value(i + 3) === "(" || ["public", "auth", "ec2_private", "ec3_topic_private"].includes(token.value))) {
      const name = qualified(i);
      if (value(i + 3) === "(" && !allowedTables.has(name)) {
        assert.ok(allowedFunctions.has(name), `Unreviewed function dependency ${name}`); calls.add(name);
      } else relation(i);
    }
    if (["from", "join"].includes(token.value)) {
      fromDepths.add(depth); source(i + 1);
    } else if (token.value === "into" && value(i - 1) === "insert") relation(i + 1);
    else if (token.value === "update" && !["for", "key"].includes(value(i - 1))) relation(i + 1);
  }
  assert.equal(depth, 0, "Unsupported dependency syntax: unmatched parenthesis");
  return { relations: [...relations].sort(), functions: [...calls].sort() };
}
