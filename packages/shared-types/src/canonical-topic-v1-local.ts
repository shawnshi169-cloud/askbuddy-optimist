import type { CanonicalTopicSummaryV1Target } from "./discovery-v1";
import type { CanonicalTopicIdV1, CanonicalQuestionDetailV1 } from "./question-answer-v1";
import type { PublicPersonExperienceV1 } from "./experience-v1";

/** EC-3B1 local payloads only. These names do not authorize Production consumers. */
export type CanonicalTopicV1Local = CanonicalTopicSummaryV1Target;
export interface ExperienceTopicsV1Local {
  experienceId: PublicPersonExperienceV1["experienceId"];
  topicIds: CanonicalTopicIdV1[];
}
export type QuestionWithTopicsV1Local = CanonicalQuestionDetailV1;
