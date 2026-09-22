import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { MANIFEST_URL, exactKeys, requireCondition, validateCoreV1Manifest } from "./canonical-topic-manifest-validator.mjs";
import { canonicalSerialize, planManifest } from "./canonical-topic-manifest-plan.mjs";

// Offline snapshot consumer only. Acquisition is an external, independently authorized read-only tool.
export function previewCoreV1(manifestBytes, envelope) {
  exactKeys(envelope, ["projectRef", "projectStatus", "counts", "topics", "terms"], "Production snapshot");
  requireCondition(envelope.projectRef === "fslpvtlavhrnxsygkpvi", "unexpected Production project");
  requireCondition(envelope.projectStatus === "ACTIVE_HEALTHY", "Production not healthy");
  exactKeys(envelope.counts, ["canonical_topics_v1", "canonical_topic_terms_v1", "question_topics_v1", "experience_topics_v1"], "counts");
  requireCondition(Object.values(envelope.counts).every((count) => count === 0), "STOP: unexpected Production count drift");
  requireCondition(Array.isArray(envelope.topics) && envelope.topics.length === 0
    && Array.isArray(envelope.terms) && envelope.terms.length === 0, "STOP: unexpected Production Topic/term state");
  const manifest = JSON.parse(manifestBytes.toString("utf8"));
  const validation = validateCoreV1Manifest(manifest);
  const plan = planManifest(manifest, { topics: envelope.topics, terms: envelope.terms });
  requireCondition(plan.counts.CREATE_TOPIC === 79 && plan.effectiveChangeCount === 79
    && plan.highRiskCount === 0 && plan.governanceSensitiveCount === 0 && plan.counts.PRODUCTION_ONLY_UNMANAGED === 0,
  "STOP: unexpected initial preview operations");
  return { projectRef: envelope.projectRef, projectStatus: envelope.projectStatus, source: "read-only-snapshot-replay-not-live",
    manifestSha256: createHash("sha256").update(manifestBytes).digest("hex"), validation, plan };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    requireCondition(process.argv.length === 4 && process.argv[2] === "--snapshot", "usage: topic:manifest:preview -- --snapshot <read-only-snapshot.json>");
    console.log(canonicalSerialize(previewCoreV1(readFileSync(MANIFEST_URL), JSON.parse(readFileSync(process.argv[3], "utf8")))));
  } catch (error) {
    console.error(error.message); process.exitCode = 1;
  }
}
