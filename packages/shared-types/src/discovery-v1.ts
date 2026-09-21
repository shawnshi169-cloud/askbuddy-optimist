import type { Id, ISODateTime } from "./contracts";
import type { ProductChannelSlug } from "./product-channels";
import type { PublicPersonId, PublicPersonSummary } from "./public-person";
import type { PublicPersonExperienceV1, ExperienceLocationV1 } from "./experience-v1";
import type { HomeSearchDomainV1, ServiceReputationSummaryV1Target, EnabledPersonServiceSettingsV1Target } from "./product-blueprint-v1";
import type { CanonicalTopicIdV1, CanonicalQuestionV1, CanonicalAnswerV1 } from "./question-answer-v1";

/** EC-3A semantic targets only: no deployed payload, parser, endpoint or consumer authorization. */
export const DISCOVERY_MODE_V1 = ["questions", "persons"] as const;
export type DiscoveryModeV1 = (typeof DISCOVERY_MODE_V1)[number];
export type DiscoverySearchTabV1 = HomeSearchDomainV1;

export const CANONICAL_TOPIC_STATUS_V1_TARGET = ["active", "deprecated"] as const;
export interface CanonicalTopicSummaryV1Target {
  topicId: CanonicalTopicIdV1;
  canonicalName: string;
  /** Governed aliases/normalized terms, never automatic user-created hashtags. */
  aliases: string[];
  status: (typeof CANONICAL_TOPIC_STATUS_V1_TARGET)[number];
}

/** B2C authorizes Topic contracts, not Home/Search/Matching implementation or automatic associations. */
export interface DiscoveryTopicAssociationsV1Target {
  topicIds: CanonicalTopicIdV1[];
}
export type ExperienceTopicAssociationsV1Target =
  Pick<PublicPersonExperienceV1, "experienceId" | "personId"> & DiscoveryTopicAssociationsV1Target;

export type DiscoveryCityV1Target = Pick<ExperienceLocationV1, "city" | "cityCode">;
export type ChannelDiscoveryScopeV1Target = { kind: "channel"; primaryChannel: ProductChannelSlug };
export type DiscoveryScopeV1Target = { kind: "home" } | ChannelDiscoveryScopeV1Target;

export interface QuestionDiscoveryCardV1Target extends Pick<CanonicalQuestionV1,
  "questionId" | "title" | "primaryChannel" | "topicIds" | "deepExchangeBudgetMaxCents" | "createdAt" | "status"
> {
  /** A faithful concise extract of confirmed context, not invented facts. */
  contextExcerpt: string;
  answerCount: number;
  requester?: PublicPersonSummary;
}

/** Evidence must belong to this card's Person and remain public/active at read time. */
export type PersonDiscoveryEvidenceV1Target =
  | { kind: "experience"; experience: Pick<PublicPersonExperienceV1,
      "experienceId" | "personId" | "title" | "description" | "transitions" | "visibility"> }
  | { kind: "public-answer"; answer: Pick<CanonicalAnswerV1,
      "answerId" | "questionId" | "authorPersonId">; excerpt: string };

export interface PersonDiscoveryCardV1Target extends PublicPersonSummary {
  evidence: PersonDiscoveryEvidenceV1Target;
  /** Future-gated: real service evaluations only; averageRating=null below 3 ratings. */
  reputation?: ServiceReputationSummaryV1Target;
  /** Future-gated real capability only; no price CTA, availability or booking action. */
  service?: Pick<EnabledPersonServiceSettingsV1Target, "modes">;
}

export type EditorialFeatureIdV1Target = Id;
export const EDITORIAL_PUBLICATION_STATE_V1_TARGET = ["draft", "published", "unpublished"] as const;
export interface EditorialImageV1Target {
  /** Governed public media URL; scheme/content validation belongs to the future runtime parser. */
  url: string;
  alt: string;
  caption?: string;
}
export interface EditorialTextV1Target {
  text: string;
  emphasis?: "strong" | "emphasis";
}
export type EditorialContentBlockV1Target =
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "paragraph"; content: EditorialTextV1Target[] }
  | { kind: "image"; image: EditorialImageV1Target }
  | { kind: "quote"; text: string; source:
      | { kind: "editorial-emphasis" }
      | { kind: "public-answer"; answer: Pick<CanonicalAnswerV1, "answerId" | "questionId" | "authorPersonId"> } };

/** Public target projection only. Draft/unpublished articles never enter public listing. */
export interface EditorialFeatureSummaryV1Target {
  featureId: EditorialFeatureIdV1Target;
  title: string;
  cover: EditorialImageV1Target;
  dek: string;
  state: "published";
  publishedAt: ISODateTime;
  placement: { surface: "home"; sortOrder: number };
}
export interface EditorialFeatureDetailV1Target extends EditorialFeatureSummaryV1Target {
  body: EditorialContentBlockV1Target[];
  relatedTopicIds: CanonicalTopicIdV1[];
  relatedQuestionIds: CanonicalQuestionV1["questionId"][];
  relatedPersonIds: PublicPersonId[];
  comments: { capability: "planned-not-runtime" };
  share: { capability: "public-link"; url: string };
}

/** Opaque, server-issued, viewer/query/scope/snapshot-bound; never a client rank or offset. */
export type DiscoveryCursorV1Target = string;
export interface DiscoveryPaginationV1Target {
  cursor: DiscoveryCursorV1Target | null;
  limit: number;
}
export interface DiscoveryPageV1Target<Item> {
  items: Item[];
  snapshotId: string;
  nextCursor: DiscoveryCursorV1Target | null;
}
export interface SearchAllSectionsV1Target {
  questions: DiscoveryPageV1Target<QuestionDiscoveryCardV1Target>;
  persons: DiscoveryPageV1Target<PersonDiscoveryCardV1Target>;
}
