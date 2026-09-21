import type { CanonicalTopicSummaryV1Target } from "./discovery-v1";
import type { CanonicalTopicIdV1, CanonicalQuestionDetailV1 } from "./question-answer-v1";
import type { PublicPersonExperienceV1 } from "./experience-v1";

/** Verified Production payloads with B2C client contract authorization; no Topic UI or taxonomy seed. */
export type CanonicalTopicV1 = CanonicalTopicSummaryV1Target;
export interface ExperienceTopicsV1 {
  experienceId: PublicPersonExperienceV1["experienceId"];
  topicIds: CanonicalTopicIdV1[];
}
export type QuestionWithTopicsV1 = CanonicalQuestionDetailV1;
