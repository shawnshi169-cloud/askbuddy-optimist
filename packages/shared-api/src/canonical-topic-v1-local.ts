/** B1 local QA compatibility aliases, not a separate deployment truth or client authorization. */
export {
  CANONICAL_TOPIC_V1_STATE as CANONICAL_TOPIC_V1_LOCAL_STATE,
  CANONICAL_TOPIC_V1_RPCS as CANONICAL_TOPIC_V1_LOCAL_RPCS,
  CANONICAL_TOPIC_V1_ERRORS as CANONICAL_TOPIC_V1_LOCAL_ERRORS,
  canonicalTopicV1Schema as canonicalTopicV1LocalSchema,
  experienceTopicsV1Schema as experienceTopicsV1LocalSchema,
  parseQuestionWithTopicsV1 as parseQuestionWithTopicsV1Local,
  parseQuestionTopicWriteV1 as parseQuestionTopicWriteV1Local,
  parseCanonicalTopicErrorV1 as parseCanonicalTopicErrorV1Local,
} from "./canonical-topic-v1";
