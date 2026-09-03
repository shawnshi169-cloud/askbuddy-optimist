import type { Id, ISODateTime } from "./contracts";
import type { PersonExperienceId } from "./product-blueprint-v1";
import type { PublicPersonId } from "./public-person";

export type ExperienceTransitionId = Id;
export type ExperienceClaimId = Id;

export const EXPERIENCE_KIND_V1 = [
  "education",
  "work",
  "project",
  "life",
  "skill",
  "journey",
  "other",
] as const;
export type ExperienceKindV1 = (typeof EXPERIENCE_KIND_V1)[number];

export const EXPERIENCE_VISIBILITY_V1 = ["public", "private"] as const;
export type ExperienceVisibilityV1 = (typeof EXPERIENCE_VISIBILITY_V1)[number];

export const EXPERIENCE_CLAIM_TYPE_V1 = [
  "education_institution",
  "education_degree",
  "education_field_of_study",
  "employer",
  "role",
  "professional_credential",
] as const;
export type ExperienceClaimTypeV1 = (typeof EXPERIENCE_CLAIM_TYPE_V1)[number];

export interface ExperienceTimeRangeV1 {
  startYear: number | null;
  startMonth: number | null;
  endYear: number | null;
  endMonth: number | null;
  isCurrent: boolean;
}

export interface ExperienceLocationV1 {
  label: string | null;
  city: string | null;
  cityCode: string | null;
}

export interface ExperienceTransitionV1 {
  transitionId: ExperienceTransitionId;
  experienceId: PersonExperienceId;
  personId: PublicPersonId;
  fromLabel: string;
  toLabel: string;
  occurredYear: number | null;
  occurredMonth: number | null;
  sortOrder: number;
}

/** Owner-only claim reference. It is not a verification result or public evidence. */
export interface ExperienceClaimReferenceV1 {
  claimId: ExperienceClaimId;
  experienceId: PersonExperienceId;
  personId: PublicPersonId;
  claimType: ExperienceClaimTypeV1;
  value: string;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface PublicPersonExperienceV1 {
  experienceId: PersonExperienceId;
  personId: PublicPersonId;
  title: string;
  description: string;
  kind: ExperienceKindV1;
  timeRange: ExperienceTimeRangeV1;
  location: ExperienceLocationV1 | null;
  /** User-confirmed descriptive text, not Canonical Topic IDs. */
  canShare: string[];
  visibility: "public";
  transitions: ExperienceTransitionV1[];
  sortOrder: number;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
}

export interface OwnerPersonExperienceV1
  extends Omit<PublicPersonExperienceV1, "visibility"> {
  visibility: ExperienceVisibilityV1;
  claims: ExperienceClaimReferenceV1[];
}

export interface CreatePersonExperienceV1Input {
  title: string;
  description: string;
  kind: ExperienceKindV1;
  timeRange: ExperienceTimeRangeV1;
  location: ExperienceLocationV1 | null;
  canShare: string[];
  visibility: ExperienceVisibilityV1;
  sortOrder: number | null;
}

export interface UpdatePersonExperienceV1Input
  extends CreatePersonExperienceV1Input {
  experienceId: PersonExperienceId;
}

export interface CreateExperienceTransitionV1Input {
  experienceId: PersonExperienceId;
  fromLabel: string;
  toLabel: string;
  occurredYear: number | null;
  occurredMonth: number | null;
  sortOrder: number;
}

export interface UpdateExperienceTransitionV1Input
  extends Omit<CreateExperienceTransitionV1Input, "experienceId"> {
  transitionId: ExperienceTransitionId;
}

export interface CreateExperienceClaimV1Input {
  experienceId: PersonExperienceId;
  claimType: ExperienceClaimTypeV1;
  value: string;
}

export interface UpdateExperienceClaimV1Input {
  claimId: ExperienceClaimId;
  claimType: ExperienceClaimTypeV1;
  value: string;
}

/** Internal persistence shape. Product/UI consumers must use the DTOs above. */
export interface PersonExperienceStorageRowV1 {
  id: PersonExperienceId;
  person_id: PublicPersonId;
  title: string;
  description: string;
  experience_kind: ExperienceKindV1;
  start_year: number | null;
  start_month: number | null;
  end_year: number | null;
  end_month: number | null;
  is_current: boolean;
  location_label: string | null;
  city: string | null;
  city_code: string | null;
  can_share: string[];
  visibility: ExperienceVisibilityV1;
  sort_order: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  deleted_at: ISODateTime | null;
}

/** Internal persistence shape. */
export interface ExperienceTransitionStorageRowV1 {
  id: ExperienceTransitionId;
  experience_id: PersonExperienceId;
  person_id: PublicPersonId;
  from_label: string;
  to_label: string;
  occurred_year: number | null;
  occurred_month: number | null;
  sort_order: number;
  created_at: ISODateTime;
  updated_at: ISODateTime;
}

/** Internal persistence shape; never part of the public Experience projection. */
export interface ExperienceClaimStorageRowV1 {
  id: ExperienceClaimId;
  experience_id: PersonExperienceId;
  person_id: PublicPersonId;
  claim_type: ExperienceClaimTypeV1;
  claim_value: string;
  created_at: ISODateTime;
  updated_at: ISODateTime;
  deleted_at: ISODateTime | null;
}
