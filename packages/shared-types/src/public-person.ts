import type { Id, ISODateTime } from "./contracts";

/** Canonical public identity: auth.users.id / profiles.user_id. */
export type PublicPersonId = Id;

export interface PublicPersonSummary {
  userId: PublicPersonId;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PublicPersonExpertExtension {
  headline: string | null;
  intro: string | null;
  expertiseSummary: string | null;
  publishedSkillOfferCount: number;
}

export interface PublicPersonContributionSummary {
  answerCount: number;
  postCount: number;
}

export interface PublicPersonProfile extends PublicPersonSummary {
  coverUrl: string | null;
  bio: string | null;
  city: string | null;
  /** Self-reported; not a verified education claim. */
  school: string | null;
  /** Self-reported; not a verified employment claim. */
  industry: string | null;
  joinedAt: ISODateTime;
  contributionSummary: PublicPersonContributionSummary;
  expertExtension: PublicPersonExpertExtension | null;
}
