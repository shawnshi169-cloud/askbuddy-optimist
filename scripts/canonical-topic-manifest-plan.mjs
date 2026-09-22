import { createHash } from "node:crypto";
import { compareText, exactKeys, normalizeTerm, requireCondition, requireTerm, validateManifestShape } from "./canonical-topic-manifest-validator.mjs";

export const PREVIEW_ACTIONS = Object.freeze([
  "CREATE_TOPIC", "RENAME_TOPIC", "REMOVE_ALIAS", "ADD_ALIAS", "DEPRECATE_TOPIC",
  "REACTIVATE_TOPIC", "NO_CHANGE", "PRODUCTION_ONLY_UNMANAGED",
]);
const existingUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const sensitive = new Set(["REMOVE_ALIAS", "DEPRECATE_TOPIC", "REACTIVATE_TOPIC"]);

export function canonicalSerialize(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isSafeInteger(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalSerialize).join(",")}]`;
  requireCondition(value !== null && typeof value === "object", "non-JSON value in canonical representation");
  return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${canonicalSerialize(value[key])}`).join(",")}}`;
}
export const semanticHash = (value) => createHash("sha256").update(canonicalSerialize(value)).digest("hex");

export function validateSnapshot(snapshot) {
  exactKeys(snapshot, ["topics", "terms"], "snapshot");
  requireCondition(Array.isArray(snapshot.topics) && Array.isArray(snapshot.terms), "snapshot: arrays required");
  const roots = new Map();
  for (const topic of snapshot.topics) {
    exactKeys(topic, ["topicId", "canonicalName", "normalizedName", "status"], "snapshot topic");
    requireCondition(typeof topic.topicId === "string" && existingUuid.test(topic.topicId), "snapshot: invalid topicId");
    requireCondition(!roots.has(topic.topicId), "snapshot: duplicate topicId");
    requireCondition(requireTerm(topic.canonicalName, "snapshot") === topic.normalizedName, "snapshot: normalizedName mismatch");
    requireCondition(["active", "deprecated"].includes(topic.status), "snapshot: invalid status");
    roots.set(topic.topicId, topic);
  }
  const terms = new Map();
  for (const term of snapshot.terms) {
    exactKeys(term, ["topicId", "term", "normalizedTerm"], "snapshot term");
    requireCondition(roots.has(term.topicId), "snapshot: orphan term");
    requireCondition(requireTerm(term.term, "snapshot") === term.normalizedTerm, "snapshot: normalizedTerm mismatch");
    requireCondition(!terms.has(term.normalizedTerm), "snapshot: duplicate normalized term");
    terms.set(term.normalizedTerm, term);
  }
  for (const topic of roots.values()) {
    requireCondition(terms.get(topic.normalizedName)?.topicId === topic.topicId, "snapshot: missing/foreign canonical term");
  }
  return { roots, terms };
}

/** Pure informational comparison. No transport, clock, randomness, row writes or apply authorization. */
export function planManifest(manifest, snapshot) {
  validateManifestShape(manifest);
  const { roots, terms } = validateSnapshot(snapshot);
  // Production ownership wins even if the other owner is omitted or proposes removing its term.
  for (const topic of manifest.topics) {
    for (const term of [topic.canonicalName, ...topic.aliases]) {
      const owner = terms.get(normalizeTerm(term))?.topicId;
      requireCondition(!owner || owner === topic.topicId, `PRODUCTION_TERM_COLLISION: ${normalizeTerm(term)}`);
    }
  }
  const operations = [];
  const append = (type, topicId, payload) => operations.push({
    type, topicId, payload,
    governanceSensitive: sensitive.has(type),
    risk: type === "REACTIVATE_TOPIC" ? "HIGH" : sensitive.has(type) ? "REVIEW" : "STANDARD",
    explicitFutureApprovalRequired: !["NO_CHANGE", "PRODUCTION_ONLY_UNMANAGED"].includes(type),
    action: "NONE",
  });
  for (const topic of manifest.topics) {
    const before = roots.get(topic.topicId);
    if (!before) {
      append("CREATE_TOPIC", topic.topicId, structuredClone(topic));
      continue;
    }
    const start = operations.length;
    const canonical = normalizeTerm(topic.canonicalName);
    const desiredAliases = new Map(topic.aliases.map((term) => [normalizeTerm(term), term]));
    const previousAliases = new Map(snapshot.terms.filter((term) => term.topicId === topic.topicId
      && term.normalizedTerm !== before.normalizedName).map((term) => [term.normalizedTerm, term.term]));
    if (before.canonicalName !== topic.canonicalName) {
      append("RENAME_TOPIC", topic.topicId, { from: before.canonicalName, to: topic.canonicalName });
      // The deployed rename trigger retains the old canonical term. Make its desired removal explicit.
      if (before.normalizedName !== canonical && !desiredAliases.has(before.normalizedName)) {
        append("REMOVE_ALIAS", topic.topicId, { term: terms.get(before.normalizedName).term,
          normalizedTerm: before.normalizedName, reason: "old-canonical-term-retained-by-rename-trigger" });
      }
    }
    for (const [normalized, term] of previousAliases) {
      // Promoting an alias to canonical must not remove the canonical resolver term.
      if (normalized !== canonical && desiredAliases.get(normalized) !== term) {
        append("REMOVE_ALIAS", topic.topicId, { term, normalizedTerm: normalized, reason: "explicit-desired-alias-state" });
      }
    }
    for (const [normalized, term] of desiredAliases) {
      if (previousAliases.get(normalized) !== term) {
        append("ADD_ALIAS", topic.topicId, { term, normalizedTerm: normalized });
      }
    }
    if (before.status !== topic.status) {
      append(topic.status === "deprecated" ? "DEPRECATE_TOPIC" : "REACTIVATE_TOPIC", topic.topicId,
        { from: before.status, to: topic.status });
    }
    if (operations.length === start) append("NO_CHANGE", topic.topicId, {});
  }
  const managed = new Set(manifest.topics.map((topic) => topic.topicId));
  for (const topic of snapshot.topics) {
    if (!managed.has(topic.topicId)) append("PRODUCTION_ONLY_UNMANAGED", topic.topicId, { canonicalName: topic.canonicalName, status: topic.status });
  }
  operations.sort((a, b) => compareText(a.topicId, b.topicId)
    || PREVIEW_ACTIONS.indexOf(a.type) - PREVIEW_ACTIONS.indexOf(b.type)
    || compareText(canonicalSerialize(a.payload), canonicalSerialize(b.payload)));
  const counts = Object.fromEntries(PREVIEW_ACTIONS.map((type) => [type, operations.filter((op) => op.type === type).length]));
  const semantic = {
    schemaVersion: 1, manifestId: manifest.manifestId, informationalOnly: true, applyAuthorized: false,
    manifestStateHash: semanticHash(manifest),
    productionStateHash: semanticHash({
      topics: [...snapshot.topics].sort((a, b) => compareText(a.topicId, b.topicId)),
      terms: [...snapshot.terms].sort((a, b) => compareText(a.normalizedTerm, b.normalizedTerm)),
    }),
    counts, collisionCount: 0,
    highRiskCount: operations.filter((op) => op.risk === "HIGH").length,
    governanceSensitiveCount: operations.filter((op) => op.governanceSensitive).length,
    effectiveChangeCount: operations.length - counts.NO_CHANGE - counts.PRODUCTION_ONLY_UNMANAGED,
    operations,
  };
  return { ...semantic, planHash: semanticHash(semantic) };
}
