import { z } from "zod";
import { CANONICAL_TOPIC_STATUS_V1_TARGET } from "../../shared-types/src/discovery-v1";
import type { CanonicalTopicV1, ExperienceTopicsV1 } from "../../shared-types/src/canonical-topic-v1";
import { canonicalQuestionDetailV1Schema, QUESTION_ANSWER_V1_RPCS } from "./question-answer-v1";

/** Production backend contract only; ordinary client authorization remains an EC-3B2C gate. */
export const CANONICAL_TOPIC_V1_STATE = {
  contractStatus: "approved-frozen",
  localRuntimeImplemented: true,
  migrationPrepared: true,
  reviewStatus: "B1-approved-B2B-closeout-pending-review",
  productionDeployed: true,
  productionGrantReview: "aligned",
  clientConsumable: false,
  productionQuestionTopics: "active-canonical-ids-with-historical-deprecated-retention",
  productionExperienceTopics: "deployed",
  productionResolver: "deployed",
  sharedCoreQuestionTopics: "empty-only",
  consumerUnlockPhase: "EC-3B2C",
  consumerGateStatus: "pending",
  duplicateInput: "reject-INVALID_INPUT",
  associationOrder: "topicId ASC",
  normalization: "C-whitespace-collapse-trim-ASCII-casefold-preserve-other-characters",
  deprecated: "retain-existing-links-reject-new-links",
  rootMutation: "governed-server-only-no-ordinary-client-api",
  questionConcurrency: "parent-row-then-existing-EC2-advisory-serialized-desired-state",
} as const;

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const ids = z.array(uuid).refine((value) => new Set(value.map((id) => id.toLowerCase())).size === value.length);
const orderedIds = ids.refine((value) => value.every((id, index) => index === 0 || value[index - 1].toLowerCase() < id.toLowerCase()));
const normalize = (value: string) => value.replace(/[\t\n\v\f\r ]+/g, " ").replace(/^ | $/g, "")
  .replace(/[A-Z]/g, (letter) => letter.toLowerCase());
const term = z.string().refine((value) => normalize(value).length > 0);
export const canonicalTopicV1Schema = z.object({
  topicId: uuid, canonicalName: term, aliases: z.array(term), status: z.enum(CANONICAL_TOPIC_STATUS_V1_TARGET),
}).strict().refine((row) => {
  const names = [row.canonicalName, ...row.aliases].map(normalize);
  return new Set(names).size === names.length;
}).transform((row): CanonicalTopicV1 => ({
  topicId: row.topicId, canonicalName: row.canonicalName, aliases: row.aliases, status: row.status,
}));
export const experienceTopicsV1Schema = z.object({ experienceId: uuid, topicIds: orderedIds }).strict()
  .transform((row): ExperienceTopicsV1 => ({ experienceId: row.experienceId, topicIds: row.topicIds }));

// Retain real backend Topic IDs while reusing every non-Topic EC-2 invariant.
// The app-facing EC-2 parser remains empty-only; this is not a consumer fallback.
export function parseQuestionWithTopicsV1(value: unknown) {
  const topicIds = orderedIds.parse(z.object({ topicIds: z.unknown() }).passthrough().parse(value).topicIds);
  const object = z.record(z.unknown()).parse(value);
  const question = canonicalQuestionDetailV1Schema.parse({ ...object, topicIds: [] });
  return { ...question, topicIds };
}

function backendRpc<P, R>(signature: string, authentication: "anon" | "authenticated",
  params: z.ZodType<P, z.ZodTypeDef, unknown>, result: z.ZodType<R, z.ZodTypeDef, unknown>,
  matches: (input: P, output: R) => boolean = () => true) {
  return {
    ...CANONICAL_TOPIC_V1_STATE, signature, authentication,
    securityMode: "invoker", searchPath: "",
    parseParams: (value: unknown) => params.parse(value),
    parseResult: (value: unknown, request: unknown) => {
      const input = params.parse(request); const output = result.parse(value);
      if (!matches(input, output)) throw new TypeError("Invalid Topic response/request relationship");
      return output;
    },
  } as const;
}

const experienceParams = z.object({ p_experience_id: uuid }).strict();
export const CANONICAL_TOPIC_V1_RPCS = {
  resolve_canonical_topic_v1: backendRpc("public.resolve_canonical_topic_v1(text)", "anon",
    z.object({ p_term: term }).strict(), z.object({ topic: canonicalTopicV1Schema.nullable() }).strict(),
    (input, output) => output.topic === null || (output.topic.status === "active"
      && [output.topic.canonicalName, ...output.topic.aliases].some((name) => normalize(name) === normalize(input.p_term)))),
  get_experience_topics_v1: backendRpc("public.get_experience_topics_v1(uuid)", "anon", experienceParams,
    z.object({ experience: experienceTopicsV1Schema.nullable() }).strict(),
    (input, output) => output.experience === null || output.experience.experienceId === input.p_experience_id),
  set_experience_topics_v1: backendRpc("public.set_experience_topics_v1(uuid,uuid[])", "authenticated",
    experienceParams.extend({ p_topic_ids: ids }).strict(), experienceTopicsV1Schema,
    (input, output) => output.experienceId === input.p_experience_id
      && JSON.stringify([...input.p_topic_ids].map((id) => id.toLowerCase()).sort()) === JSON.stringify(output.topicIds)),
} as const;

export type CanonicalTopicV1RpcName = keyof typeof CANONICAL_TOPIC_V1_RPCS;
export type CanonicalTopicV1RpcParams<N extends CanonicalTopicV1RpcName> = ReturnType<(typeof CANONICAL_TOPIC_V1_RPCS)[N]["parseParams"]>;
export type CanonicalTopicV1RpcResult<N extends CanonicalTopicV1RpcName> = ReturnType<(typeof CANONICAL_TOPIC_V1_RPCS)[N]["parseResult"]>;

/** Backend verification transport only. App-facing Question parameters remain empty-only. No network calls. */
export function parseQuestionTopicWriteV1(operation: "create_question_v1" | "update_question_v1", value: unknown) {
  const object = z.record(z.unknown()).parse(value);
  const topicIds = ids.parse(object.p_topic_ids);
  const parsed = QUESTION_ANSWER_V1_RPCS[operation].parseParams({ ...object, p_topic_ids: [] });
  return { ...parsed, p_topic_ids: topicIds };
}

export const CANONICAL_TOPIC_V1_ERRORS = {
  AUTHENTICATION_REQUIRED: "PT401",
  INVALID_INPUT: "PT400",
  TARGET_NOT_FOUND_OR_INACCESSIBLE: "PT404",
  QUESTION_CLOSED: "PT409",
  TOPIC_INVALID_OR_INACTIVE: "PT422",
  UNSUPPORTED_TRANSACTION_ISOLATION: "PT409",
} as const;
export function parseCanonicalTopicErrorV1(error: unknown): keyof typeof CANONICAL_TOPIC_V1_ERRORS | null {
  const parsed = z.object({ code: z.string(), message: z.string() }).safeParse(error);
  if (!parsed.success) return null;
  for (const key of Object.keys(CANONICAL_TOPIC_V1_ERRORS) as (keyof typeof CANONICAL_TOPIC_V1_ERRORS)[]) {
    if (parsed.data.message === key && parsed.data.code === CANONICAL_TOPIC_V1_ERRORS[key]) return key;
  }
  return null;
}
