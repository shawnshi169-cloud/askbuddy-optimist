import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { normalizeTerm } from "./lib/topic-normalization.mjs";

export { normalizeTerm };
export const MANIFEST_URL = new URL("../canonical-topics/core-v1.json", import.meta.url);
export const compareText = (a, b) => a < b ? -1 : a > b ? 1 : 0;
export const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function requireCondition(condition, message) {
  if (!condition) throw new TypeError(message);
}

export function exactKeys(value, keys, label) {
  requireCondition(value !== null && typeof value === "object" && !Array.isArray(value), `${label}: expected object`);
  requireCondition(JSON.stringify(Object.keys(value).sort()) === JSON.stringify([...keys].sort()), `${label}: unexpected/missing fields`);
}

export function requireTerm(value, label) {
  requireCondition(typeof value === "string" && !value.includes("\0") && normalizeTerm(value).length > 0, `${label}: empty/invalid term`);
  return normalizeTerm(value);
}

// Schema v1 is independent of any curated manifest's identity, size or approved content.
export function validateManifestShape(manifest) {
  exactKeys(manifest, ["schemaVersion", "manifestId", "topics"], "manifest");
  requireCondition(manifest.schemaVersion === 1, "manifest: schemaVersion must be 1");
  requireCondition(typeof manifest.manifestId === "string"
    && manifest.manifestId.trim() === manifest.manifestId
    && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.manifestId),
  "manifest: manifestId must be a non-empty lowercase ASCII kebab identifier");
  requireCondition(Array.isArray(manifest.topics), "manifest: topics must be array");
  const ids = new Set();
  const terms = new Map();
  let previousId = "";
  let aliasCount = 0;
  for (const topic of manifest.topics) {
    exactKeys(topic, ["topicId", "canonicalName", "aliases", "status"], "topic");
    requireCondition(typeof topic.topicId === "string" && uuidV4.test(topic.topicId), "topic: lowercase RFC 4122 UUID v4 required");
    requireCondition(!ids.has(topic.topicId), "topic: duplicate topicId");
    requireCondition(compareText(previousId, topic.topicId) < 0, "topic: topicId ASC required");
    ids.add(topic.topicId); previousId = topic.topicId;
    requireCondition(["active", "deprecated"].includes(topic.status), "topic: invalid status");
    requireCondition(Array.isArray(topic.aliases), "topic: aliases must be array");
    let previousAlias = null;
    for (const [index, term] of [topic.canonicalName, ...topic.aliases].entries()) {
      const normalized = requireTerm(term, "topic");
      requireCondition(!terms.has(normalized), `manifest term collision: ${normalized}`);
      terms.set(normalized, topic.topicId);
      if (index > 0) {
        requireCondition(previousAlias === null || compareText(previousAlias, normalized) < 0, "topic: normalized alias ASC required");
        previousAlias = normalized; aliasCount++;
      }
    }
  }
  return { topicCount: ids.size, aliasCount, normalizedTermCount: terms.size, collisionCount: 0 };
}

export function validateCoreV1Manifest(manifest) {
  const result = validateManifestShape(manifest);
  requireCondition(manifest.manifestId === "core-v1", "core-v1: manifestId must be core-v1");
  requireCondition(result.topicCount === 79, "core-v1: exactly 79 Topics required");
  requireCondition(manifest.topics.every((topic) => topic.status === "active"), "core-v1: initial status must be active");
  requireCondition(manifest.topics.every((topic) => [topic.canonicalName, ...topic.aliases]
    .every((term) => normalizeTerm(term) !== "人像摄影")), "core-v1: deferred term forbidden");
  // Bind exact approved names, aliases, identities and order independently of object-key order.
  const content = manifest.topics.map(({ topicId, canonicalName, aliases, status }) => [topicId, canonicalName, aliases, status]);
  requireCondition(createHash("sha256").update(JSON.stringify(content)).digest("hex")
    === "00c967ca204c51fe3a9104af959d9cee422e4d7861f40b30bea69d7078395a35",
  "core-v1: approved content/UUID freeze mismatch");
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    requireCondition(process.argv.length === 2, "validate takes no arguments; it never rewrites the manifest");
    const result = validateCoreV1Manifest(JSON.parse(readFileSync(MANIFEST_URL, "utf8")));
    console.log(JSON.stringify({ validation: "PASS", ...result }));
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}
