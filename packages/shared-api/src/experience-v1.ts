import type {
  CreateExperienceClaimV1Input,
  CreateExperienceTransitionV1Input,
  CreatePersonExperienceV1Input,
  ExperienceClaimReferenceV1,
  ExperienceClaimTypeV1,
  ExperienceKindV1,
  ExperienceTransitionV1,
  ExperienceVisibilityV1,
  OwnerPersonExperienceV1,
  PublicPersonExperienceV1,
  UpdateExperienceClaimV1Input,
  UpdateExperienceTransitionV1Input,
  UpdatePersonExperienceV1Input,
} from "../../shared-types/src/experience-v1";
import type { PersonExperienceId } from "../../shared-types/src/product-blueprint-v1";
import type { PublicPersonId } from "../../shared-types/src/public-person";

export interface ExperiencePageV1 {
  limit: number;
  offset: number;
  hasMore: boolean;
}

export interface GetPublicPersonExperiencesV1Params {
  p_person_id: PublicPersonId;
  p_limit?: number;
  p_offset?: number;
}

export interface GetPublicPersonExperiencesV1Result {
  personId: PublicPersonId;
  experiences: PublicPersonExperienceV1[];
  page: ExperiencePageV1;
}

export interface GetMyPersonExperiencesV1Params {
  p_limit?: number;
  p_offset?: number;
}

export interface GetMyPersonExperiencesV1Result {
  personId: PublicPersonId;
  experiences: OwnerPersonExperienceV1[];
  page: ExperiencePageV1;
}

export interface CreatePersonExperienceV1Params {
  p_title: CreatePersonExperienceV1Input["title"];
  p_description: CreatePersonExperienceV1Input["description"];
  p_kind: CreatePersonExperienceV1Input["kind"];
  p_start_year?: number | null;
  p_start_month?: number | null;
  p_end_year?: number | null;
  p_end_month?: number | null;
  p_is_current?: boolean;
  p_location_label?: string | null;
  p_city?: string | null;
  p_city_code?: string | null;
  p_can_share?: string[];
  p_visibility?: ExperienceVisibilityV1;
  p_sort_order?: number | null;
}

export interface UpdatePersonExperienceV1Params {
  p_experience_id: UpdatePersonExperienceV1Input["experienceId"];
  p_title: string;
  p_description: string;
  p_kind: ExperienceKindV1;
  p_start_year: number | null;
  p_start_month: number | null;
  p_end_year: number | null;
  p_end_month: number | null;
  p_is_current: boolean;
  p_location_label: string | null;
  p_city: string | null;
  p_city_code: string | null;
  p_can_share: string[];
  p_visibility: ExperienceVisibilityV1;
  p_sort_order: number;
}

export interface SetPersonExperienceVisibilityV1Params {
  p_experience_id: PersonExperienceId;
  p_visibility: ExperienceVisibilityV1;
}

export interface ReorderPersonExperiencesV1Params {
  p_experience_ids: PersonExperienceId[];
}

export interface DeletePersonExperienceV1Params {
  p_experience_id: PersonExperienceId;
}

export interface CreateExperienceTransitionV1Params {
  p_experience_id: CreateExperienceTransitionV1Input["experienceId"];
  p_from_label: CreateExperienceTransitionV1Input["fromLabel"];
  p_to_label: CreateExperienceTransitionV1Input["toLabel"];
  p_occurred_year?: number | null;
  p_occurred_month?: number | null;
  p_sort_order?: number;
}

export interface UpdateExperienceTransitionV1Params {
  p_transition_id: UpdateExperienceTransitionV1Input["transitionId"];
  p_from_label: UpdateExperienceTransitionV1Input["fromLabel"];
  p_to_label: UpdateExperienceTransitionV1Input["toLabel"];
  p_occurred_year?: number | null;
  p_occurred_month?: number | null;
  p_sort_order: number;
}

export interface DeleteExperienceTransitionV1Params {
  p_transition_id: UpdateExperienceTransitionV1Input["transitionId"];
}

export interface CreateExperienceClaimV1Params {
  p_experience_id: CreateExperienceClaimV1Input["experienceId"];
  p_claim_type: CreateExperienceClaimV1Input["claimType"];
  p_value: CreateExperienceClaimV1Input["value"];
}

export interface UpdateExperienceClaimV1Params {
  p_claim_id: UpdateExperienceClaimV1Input["claimId"];
  p_claim_type: UpdateExperienceClaimV1Input["claimType"];
  p_value: UpdateExperienceClaimV1Input["value"];
}

export interface DeleteExperienceClaimV1Params {
  p_claim_id: UpdateExperienceClaimV1Input["claimId"];
}

type JsonRecord = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXPERIENCE_KINDS = new Set<ExperienceKindV1>([
  "education", "work", "project", "life", "skill", "journey", "other",
]);
const CLAIM_TYPES = new Set<ExperienceClaimTypeV1>([
  "education_institution",
  "education_degree",
  "education_field_of_study",
  "employer",
  "role",
  "professional_credential",
]);

const asRecord = (value: unknown, context: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Invalid ${context} contract`);
  }
  return value as JsonRecord;
};

const assertExactKeys = (
  record: JsonRecord,
  keys: readonly string[],
  context: string,
) => {
  const allowed = new Set(keys);
  if (Object.keys(record).some((key) => !allowed.has(key))) {
    throw new TypeError(`Invalid ${context} contract`);
  }
  if (keys.some((key) => !(key in record))) {
    throw new TypeError(`Invalid ${context} contract`);
  }
};

const asString = (value: unknown, context: string): string => {
  if (typeof value !== "string") throw new TypeError(`Invalid ${context} contract`);
  return value;
};

const asNonEmptyString = (value: unknown, context: string): string => {
  const result = asString(value, context);
  if (!result.trim()) throw new TypeError(`Invalid ${context} contract`);
  return result;
};

const asNullableString = (value: unknown, context: string): string | null =>
  value === null ? null : asString(value, context);

const asId = (value: unknown, context: string): string => {
  const result = asString(value, context);
  if (!UUID_PATTERN.test(result)) throw new TypeError(`Invalid ${context} contract`);
  return result;
};

const asInteger = (value: unknown, context: string, minimum = 0): number => {
  if (!Number.isInteger(value) || (value as number) < minimum) {
    throw new TypeError(`Invalid ${context} contract`);
  }
  return value as number;
};

const asNullableYear = (value: unknown, context: string): number | null => {
  if (value === null) return null;
  const year = asInteger(value, context, 1);
  if (year > 9999) throw new TypeError(`Invalid ${context} contract`);
  return year;
};

const asNullableMonth = (value: unknown, context: string): number | null => {
  if (value === null) return null;
  const month = asInteger(value, context, 1);
  if (month > 12) throw new TypeError(`Invalid ${context} contract`);
  return month;
};

const asBoolean = (value: unknown, context: string): boolean => {
  if (typeof value !== "boolean") throw new TypeError(`Invalid ${context} contract`);
  return value;
};

const asIsoDateTime = (value: unknown, context: string): string => {
  const result = asString(value, context);
  if (Number.isNaN(Date.parse(result))) throw new TypeError(`Invalid ${context} contract`);
  return result;
};

const asStringArray = (value: unknown, context: string): string[] => {
  if (!Array.isArray(value)) throw new TypeError(`Invalid ${context} contract`);
  return value.map((item) => asNonEmptyString(item, context));
};

const parseTimeRange = (value: unknown) => {
  const row = asRecord(value, "experience time range");
  assertExactKeys(
    row,
    ["startYear", "startMonth", "endYear", "endMonth", "isCurrent"],
    "experience time range",
  );
  const startYear = asNullableYear(row.startYear, "experience start year");
  const startMonth = asNullableMonth(row.startMonth, "experience start month");
  const endYear = asNullableYear(row.endYear, "experience end year");
  const endMonth = asNullableMonth(row.endMonth, "experience end month");
  const isCurrent = asBoolean(row.isCurrent, "experience isCurrent");
  if ((startMonth !== null && startYear === null) || (endMonth !== null && endYear === null)) {
    throw new TypeError("Invalid experience time range contract");
  }
  if (isCurrent && (endYear !== null || endMonth !== null)) {
    throw new TypeError("Invalid experience time range contract");
  }
  if (
    startYear !== null
    && endYear !== null
    && (startYear > endYear
      || (startYear === endYear
        && startMonth !== null
        && endMonth !== null
        && startMonth > endMonth))
  ) {
    throw new TypeError("Invalid experience time range contract");
  }
  return { startYear, startMonth, endYear, endMonth, isCurrent };
};

const parseLocation = (value: unknown) => {
  if (value === null) return null;
  const row = asRecord(value, "experience location");
  assertExactKeys(row, ["label", "city", "cityCode"], "experience location");
  return {
    label: asNullableString(row.label, "experience location label"),
    city: asNullableString(row.city, "experience city"),
    cityCode: asNullableString(row.cityCode, "experience city code"),
  };
};

const parseTransition = (value: unknown): ExperienceTransitionV1 => {
  const row = asRecord(value, "experience transition");
  assertExactKeys(
    row,
    [
      "transitionId", "experienceId", "personId", "fromLabel", "toLabel",
      "occurredYear", "occurredMonth", "sortOrder",
    ],
    "experience transition",
  );
  const occurredYear = asNullableYear(row.occurredYear, "transition occurred year");
  const occurredMonth = asNullableMonth(row.occurredMonth, "transition occurred month");
  if (occurredMonth !== null && occurredYear === null) {
    throw new TypeError("Invalid experience transition contract");
  }
  return {
    transitionId: asId(row.transitionId, "transitionId"),
    experienceId: asId(row.experienceId, "transition experienceId"),
    personId: asId(row.personId, "transition personId"),
    fromLabel: asNonEmptyString(row.fromLabel, "transition fromLabel"),
    toLabel: asNonEmptyString(row.toLabel, "transition toLabel"),
    occurredYear,
    occurredMonth,
    sortOrder: asInteger(row.sortOrder, "transition sortOrder"),
  };
};

const parseClaim = (value: unknown): ExperienceClaimReferenceV1 => {
  const row = asRecord(value, "experience claim reference");
  assertExactKeys(
    row,
    [
      "claimId", "experienceId", "personId", "claimType", "value",
      "createdAt", "updatedAt",
    ],
    "experience claim reference",
  );
  const claimType = asString(row.claimType, "experience claim type");
  if (!CLAIM_TYPES.has(claimType as ExperienceClaimTypeV1)) {
    throw new TypeError("Invalid experience claim reference contract");
  }
  return {
    claimId: asId(row.claimId, "claimId"),
    experienceId: asId(row.experienceId, "claim experienceId"),
    personId: asId(row.personId, "claim personId"),
    claimType: claimType as ExperienceClaimTypeV1,
    value: asNonEmptyString(row.value, "experience claim value"),
    createdAt: asIsoDateTime(row.createdAt, "experience claim createdAt"),
    updatedAt: asIsoDateTime(row.updatedAt, "experience claim updatedAt"),
  };
};

const parseBaseExperience = (row: JsonRecord) => {
  const kind = asString(row.kind, "experience kind");
  if (!EXPERIENCE_KINDS.has(kind as ExperienceKindV1)) {
    throw new TypeError("Invalid experience kind contract");
  }
  return {
    experienceId: asId(row.experienceId, "experienceId"),
    personId: asId(row.personId, "experience personId"),
    title: asNonEmptyString(row.title, "experience title"),
    description: asNonEmptyString(row.description, "experience description"),
    kind: kind as ExperienceKindV1,
    timeRange: parseTimeRange(row.timeRange),
    location: parseLocation(row.location),
    canShare: asStringArray(row.canShare, "experience canShare"),
    transitions: Array.isArray(row.transitions)
      ? row.transitions.map(parseTransition)
      : (() => { throw new TypeError("Invalid experience transitions contract"); })(),
    sortOrder: asInteger(row.sortOrder, "experience sortOrder"),
    createdAt: asIsoDateTime(row.createdAt, "experience createdAt"),
    updatedAt: asIsoDateTime(row.updatedAt, "experience updatedAt"),
  };
};

const parsePublicExperience = (value: unknown): PublicPersonExperienceV1 => {
  const row = asRecord(value, "public person experience");
  assertExactKeys(
    row,
    [
      "experienceId", "personId", "title", "description", "kind", "timeRange",
      "location", "canShare", "visibility", "transitions", "sortOrder",
      "createdAt", "updatedAt",
    ],
    "public person experience",
  );
  if (row.visibility !== "public") {
    throw new TypeError("Invalid public person experience contract");
  }
  const experience = { ...parseBaseExperience(row), visibility: "public" as const };
  if (experience.transitions.some(
    (transition) => transition.experienceId !== experience.experienceId
      || transition.personId !== experience.personId,
  )) {
    throw new TypeError("Invalid public person experience relationship contract");
  }
  return experience;
};

const parseOwnerExperience = (value: unknown): OwnerPersonExperienceV1 => {
  const row = asRecord(value, "owner person experience");
  assertExactKeys(
    row,
    [
      "experienceId", "personId", "title", "description", "kind", "timeRange",
      "location", "canShare", "visibility", "transitions", "claims", "sortOrder",
      "createdAt", "updatedAt",
    ],
    "owner person experience",
  );
  if (row.visibility !== "public" && row.visibility !== "private") {
    throw new TypeError("Invalid owner person experience contract");
  }
  if (!Array.isArray(row.claims)) {
    throw new TypeError("Invalid owner experience claims contract");
  }
  const experience = {
    ...parseBaseExperience(row),
    visibility: row.visibility as ExperienceVisibilityV1,
    claims: row.claims.map(parseClaim),
  };
  if (
    experience.transitions.some(
      (transition) => transition.experienceId !== experience.experienceId
        || transition.personId !== experience.personId,
    )
    || experience.claims.some(
      (claim) => claim.experienceId !== experience.experienceId
        || claim.personId !== experience.personId,
    )
  ) {
    throw new TypeError("Invalid owner person experience relationship contract");
  }
  return experience;
};

const parsePage = (value: unknown): ExperiencePageV1 => {
  const row = asRecord(value, "experience page");
  assertExactKeys(row, ["limit", "offset", "hasMore"], "experience page");
  return {
    limit: asInteger(row.limit, "experience page limit", 1),
    offset: asInteger(row.offset, "experience page offset"),
    hasMore: asBoolean(row.hasMore, "experience page hasMore"),
  };
};

export const parseGetPublicPersonExperiencesV1Result = (
  value: unknown,
): GetPublicPersonExperiencesV1Result => {
  const payload = asRecord(value, "get_public_person_experiences_v1 result");
  assertExactKeys(payload, ["personId", "experiences", "page"], "public experiences result");
  if (!Array.isArray(payload.experiences)) {
    throw new TypeError("Invalid public experiences result contract");
  }
  const personId = asId(payload.personId, "public experiences personId");
  const experiences = payload.experiences.map(parsePublicExperience);
  if (experiences.some((experience) => experience.personId !== personId)) {
    throw new TypeError("Invalid public experiences owner contract");
  }
  return {
    personId,
    experiences,
    page: parsePage(payload.page),
  };
};

export const parseGetMyPersonExperiencesV1Result = (
  value: unknown,
): GetMyPersonExperiencesV1Result => {
  const payload = asRecord(value, "get_my_person_experiences_v1 result");
  assertExactKeys(payload, ["personId", "experiences", "page"], "owner experiences result");
  if (!Array.isArray(payload.experiences)) {
    throw new TypeError("Invalid owner experiences result contract");
  }
  const personId = asId(payload.personId, "owner experiences personId");
  const experiences = payload.experiences.map(parseOwnerExperience);
  if (experiences.some((experience) => experience.personId !== personId)) {
    throw new TypeError("Invalid owner experiences owner contract");
  }
  return {
    personId,
    experiences,
    page: parsePage(payload.page),
  };
};
