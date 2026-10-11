import { z } from "zod";
import { PRODUCT_CHANNEL_SLUGS } from "../../packages/shared-types/src/product-channels";
import type { DiscoveryPageV1Target, QuestionDiscoveryCardV1Target } from "../../packages/shared-types/src/discovery-v1";
import { questionTopicIdsOutput } from "../../packages/shared-api/src/question-answer-v1";

// PROPOSED / NOT DEPLOYED. These are prototype resource limits, not product cardinalities.
export const LIMITS = Object.freeze({
  page: 20, candidates: 500, ttlMs: 600_000, cursorBytes: 512,
  requestBytes: 2048, responseBytes: 262_144, snapshots: 128,
  snapshotsPerCaller: 4, memoryBytes: 8 * 1024 * 1024, statementTimeoutMs: 2000,
});
export const RANK_VERSION = "question-created-desc-id-asc-v0";
export const ERROR_CODES = [
  "INVALID_INPUT", "INVALID_CHANNEL", "INVALID_PAGE_LIMIT", "UNSUPPORTED_CITY_FILTER",
  "TOPIC_INVALID_OR_INACTIVE", "INVALID_CURSOR", "CURSOR_CONTEXT_MISMATCH", "CURSOR_RANK_MISMATCH",
  "SNAPSHOT_EXPIRED", "SNAPSHOT_UNAVAILABLE", "SNAPSHOT_CAPACITY_EXCEEDED",
  "UNTRUSTED_CALLER_CONTEXT", "DATA_INTEGRITY_ERROR", "RESPONSE_CAPACITY_EXCEEDED", "BACKEND_UNAVAILABLE",
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];
export class DiscoveryError extends Error {
  constructor(readonly code: ErrorCode) { super(code); this.name = "DiscoveryError"; }
}
export const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const scope = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("home") }).strict(),
  z.object({ kind: z.literal("channel"), primaryChannel: z.enum(PRODUCT_CHANNEL_SLUGS) }).strict(),
]);
export const requestSchema = z.object({
  scope, topicId: uuid.transform(id => id.toLowerCase()).nullable(), city: z.null(),
  page: z.object({ cursor: z.string().min(1).max(LIMITS.cursorBytes).nullable(),
    limit: z.number().int().min(1).max(LIMITS.page) }).strict(),
}).strict();
export type Request = z.infer<typeof requestSchema>;
export type Page = DiscoveryPageV1Target<QuestionDiscoveryCardV1Target>;

export function parseRequest(value: unknown): Request {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    if ("city" in row && row.city !== null) throw new DiscoveryError("UNSUPPORTED_CITY_FILTER");
    const candidateScope = row.scope as Record<string, unknown> | undefined;
    if (candidateScope?.kind === "channel" && !z.enum(PRODUCT_CHANNEL_SLUGS).safeParse(candidateScope.primaryChannel).success)
      throw new DiscoveryError("INVALID_CHANNEL");
    const page = row.page as Record<string, unknown> | undefined;
    if (page && !z.number().int().min(1).max(LIMITS.page).safeParse(page.limit).success)
      throw new DiscoveryError("INVALID_PAGE_LIMIT");
  }
  const result = requestSchema.safeParse(value);
  if (!result.success) throw new DiscoveryError("INVALID_INPUT");
  return result.data;
}

export const cardSchema = z.object({
  questionId: uuid, title: z.string().min(1), primaryChannel: z.enum(PRODUCT_CHANNEL_SLUGS),
  topicIds: questionTopicIdsOutput, deepExchangeBudgetMaxCents: z.number().int().positive().safe().nullable(),
  createdAt: z.string().datetime({ offset: true }), status: z.enum(["open", "closed"]),
  contextExcerpt: z.string(), answerCount: z.number().int().nonnegative().safe(),
}).strict();
export const pageSchema = z.object({
  items: z.array(cardSchema).max(LIMITS.page), snapshotId: uuid,
  nextCursor: z.string().min(1).max(LIMITS.cursorBytes).nullable(),
}).strict().refine(page => new Set(page.items.map(item => item.questionId)).size === page.items.length);

export function parsePage(value: unknown): Page {
  const result = pageSchema.safeParse(value);
  if (!result.success) throw new DiscoveryError("DATA_INTEGRITY_ERROR");
  return result.data;
}
