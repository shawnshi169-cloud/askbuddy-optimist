import type {
  PublicPersonContributionSummary,
  PublicPersonExpertExtension,
  PublicPersonId,
  PublicPersonProfile,
} from "../../shared-types/src/public-person";

export interface GetPublicPersonProfileV1Params {
  p_user_id: PublicPersonId;
}

export interface GetPublicPersonProfileV1Result {
  person: PublicPersonProfile | null;
}

type JsonRecord = Record<string, unknown>;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const asRecord = (value: unknown, context: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Invalid ${context} contract`);
  }
  return value as JsonRecord;
};

const assertExactKeys = (
  record: JsonRecord,
  allowedKeys: readonly string[],
  context: string,
) => {
  const allowed = new Set(allowedKeys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) throw new TypeError(`Invalid ${context} contract`);
  }
  for (const key of allowedKeys) {
    if (!(key in record)) throw new TypeError(`Invalid ${context} contract`);
  }
};

const asString = (value: unknown, context: string): string => {
  if (typeof value !== "string") throw new TypeError(`Invalid ${context} contract`);
  return value;
};

const asNullableString = (value: unknown, context: string): string | null =>
  value === null ? null : asString(value, context);

const asPublicPersonId = (value: unknown, context: string): PublicPersonId => {
  const result = asString(value, context);
  if (!UUID_PATTERN.test(result)) throw new TypeError(`Invalid ${context} contract`);
  return result;
};

const asIsoDateTime = (value: unknown, context: string): string => {
  const result = asString(value, context);
  if (Number.isNaN(Date.parse(result))) throw new TypeError(`Invalid ${context} contract`);
  return result;
};

const asCount = (value: unknown, context: string): number => {
  if (!Number.isInteger(value) || (value as number) < 0) {
    throw new TypeError(`Invalid ${context} contract`);
  }
  return value as number;
};

const parseContributionSummary = (value: unknown): PublicPersonContributionSummary => {
  const row = asRecord(value, "public person contribution summary");
  assertExactKeys(row, ["answerCount", "postCount"], "public person contribution summary");
  return {
    answerCount: asCount(row.answerCount, "public person answer count"),
    postCount: asCount(row.postCount, "public person post count"),
  };
};

const parseExpertExtension = (value: unknown): PublicPersonExpertExtension | null => {
  if (value === null) return null;
  const row = asRecord(value, "public person expert extension");
  assertExactKeys(
    row,
    ["headline", "intro", "expertiseSummary"],
    "public person expert extension",
  );
  return {
    headline: asNullableString(row.headline, "public person expert headline"),
    intro: asNullableString(row.intro, "public person expert intro"),
    expertiseSummary: asNullableString(
      row.expertiseSummary,
      "public person expertise summary",
    ),
  };
};

const parsePublicPersonProfile = (value: unknown): PublicPersonProfile => {
  const row = asRecord(value, "public person profile");
  assertExactKeys(
    row,
    [
      "userId",
      "displayName",
      "avatarUrl",
      "coverUrl",
      "bio",
      "city",
      "school",
      "industry",
      "joinedAt",
      "contributionSummary",
      "expertExtension",
    ],
    "public person profile",
  );
  return {
    userId: asPublicPersonId(row.userId, "public person userId"),
    displayName: asNullableString(row.displayName, "public person displayName"),
    avatarUrl: asNullableString(row.avatarUrl, "public person avatarUrl"),
    coverUrl: asNullableString(row.coverUrl, "public person coverUrl"),
    bio: asNullableString(row.bio, "public person bio"),
    city: asNullableString(row.city, "public person city"),
    school: asNullableString(row.school, "public person school"),
    industry: asNullableString(row.industry, "public person industry"),
    joinedAt: asIsoDateTime(row.joinedAt, "public person joinedAt"),
    contributionSummary: parseContributionSummary(row.contributionSummary),
    expertExtension: parseExpertExtension(row.expertExtension),
  };
};

export const parseGetPublicPersonProfileV1Result = (
  value: unknown,
): GetPublicPersonProfileV1Result => {
  const payload = asRecord(value, "get_public_person_profile_v1 result");
  assertExactKeys(payload, ["person"], "get_public_person_profile_v1 result");
  return {
    person: payload.person === null ? null : parsePublicPersonProfile(payload.person),
  };
};
