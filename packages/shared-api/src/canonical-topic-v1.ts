import { z } from "zod";
import { normalizeCanonicalTopicTermV1 as normalize } from "./canonical-topic-normalization-v1";
import { CANONICAL_TOPIC_STATUS_V1_TARGET } from "../../shared-types/src/discovery-v1";
import type { CanonicalTopicV1, ExperienceTopicsV1 } from "../../shared-types/src/canonical-topic-v1";
import { parseCanonicalQuestionDetailV1, questionTopicIdsInput, questionTopicIdsOutput, QUESTION_ANSWER_V1_RPCS } from "./question-answer-v1";

/** B2C HTTP consumer gate verified. Contract authorization does not implement Topic UI or seed facts. */
export const CANONICAL_TOPIC_V1_STATE = {
  contractStatus: "approved-frozen",
  localRuntimeImplemented: true,
  migrationPrepared: true,
  reviewStatus: "B2C-consumer-closeout-pending-review",
  productionDeployed: true,
  productionGrantReview: "aligned",
  clientConsumable: true,
  productionQuestionTopics: "active-canonical-ids-with-historical-deprecated-retention",
  productionExperienceTopics: "deployed",
  productionResolver: "deployed",
  sharedCoreQuestionTopics: "0..N-canonical-topic-ids",
  consumerUnlockPhase: "EC-3B2C",
  consumerGateStatus: "verified",
  duplicateInput: "reject-INVALID_INPUT",
  associationOrder: "topicId ASC",
  normalization: "C-whitespace-collapse-trim-ASCII-casefold-preserve-other-characters",
  deprecated: "retain-existing-links-reject-new-links",
  rootMutation: "governed-server-only-no-ordinary-client-api",
  questionConcurrency: "parent-row-then-existing-EC2-advisory-serialized-desired-state",
} as const;

const uuid = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
const ids = questionTopicIdsInput;
const orderedIds = questionTopicIdsOutput;
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

// B1/B2B QA compatibility: delegate to the single app-facing Question contract.
export function parseQuestionWithTopicsV1(value: unknown) {
  return parseCanonicalQuestionDetailV1(value);
}

function backendRpc<P, R>(signature: string, authentication: "anon" | "authenticated",
  params: z.ZodType<P, z.ZodTypeDef, unknown>, result: z.ZodType<R, z.ZodTypeDef, unknown>,
  matches: (input: P, output: R) => boolean = () => true) {
  return {
    ...CANONICAL_TOPIC_V1_STATE, signature, authentication,
    authenticationMeaning: "minimum-access-requirement", preserveCallerIdentity: true,
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

/** B1/B2B QA compatibility only; do not redefine app-facing input semantics here. */
export function parseQuestionTopicWriteV1(operation: "create_question_v1" | "update_question_v1", value: unknown) {
  return QUESTION_ANSWER_V1_RPCS[operation].parseParams(value);
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
