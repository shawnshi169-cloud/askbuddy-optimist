import {
  EXPERT_VERIFICATION_STATUS,
  SKILL_DELIVERY_MODE,
  SKILL_PRICING_MODE,
  type ExpertVerificationStatus,
  type Id,
  type ISODateTime,
  type SkillDeliveryMode,
  type SkillPricingMode,
} from "../../shared-types/src/contracts";

export type SearchResultKind = "question" | "expert" | "skill" | "post";

export interface SearchNavigationTarget {
  kind: SearchResultKind;
  id: Id;
}

export interface SearchQuestionV2Row {
  id: Id;
  title: string;
  content: string | null;
  bounty_points: number;
  view_count: number;
  created_at: ISODateTime;
  author_id: Id;
  profile_nickname: string;
  profile_avatar: string | null;
  answers_count: number;
  category: string | null;
  tags: string[];
}

export interface SearchExpertV2Row {
  id: Id;
  user_id: Id;
  nickname: string;
  avatar_url: string | null;
  headline: string | null;
  intro: string | null;
  verification_status: ExpertVerificationStatus;
  follower_count: number;
  service_count: number;
}

export interface SearchSkillV2Row {
  id: Id;
  expert_id: Id;
  title: string;
  description: string | null;
  pricing_mode: SkillPricingMode;
  price_amount: number | null;
  price_currency: string;
  city: string | null;
  city_code: string | null;
  is_remote_supported: boolean;
  delivery_mode: SkillDeliveryMode;
  created_at: ISODateTime;
  category_name: string | null;
  expert_nickname: string;
  expert_avatar: string | null;
}

export interface SearchPostV2Row {
  id: Id;
  author_id: Id;
  content: string;
  city: string | null;
  city_code: string | null;
  created_at: ISODateTime;
  like_count: number;
  favorite_count: number;
  comment_count: number;
  author_nickname: string;
  author_avatar: string | null;
}

/** Exact JSON payload returned by production search_app_content_v2. */
export interface SearchAppContentV2RawResult {
  questions: SearchQuestionV2Row[];
  experts: SearchExpertV2Row[];
  skills: SearchSkillV2Row[];
  posts: SearchPostV2Row[];
}

export interface SearchQuestionV2Result extends SearchQuestionV2Row {
  kind: "question";
  navigationTarget: SearchNavigationTarget & { kind: "question" };
}

export interface SearchExpertV2Result extends SearchExpertV2Row {
  kind: "expert";
  navigationTarget: SearchNavigationTarget & { kind: "expert" };
}

export interface SearchSkillV2Result extends SearchSkillV2Row {
  kind: "skill";
  navigationTarget: SearchNavigationTarget & { kind: "skill" };
}

export interface SearchPostV2Result extends SearchPostV2Row {
  kind: "post";
  navigationTarget: SearchNavigationTarget & { kind: "post" };
}

export type SearchAppContentV2Item =
  | SearchQuestionV2Result
  | SearchExpertV2Result
  | SearchSkillV2Result
  | SearchPostV2Result;

export interface SearchAppContentV2Result {
  questions: SearchQuestionV2Result[];
  experts: SearchExpertV2Result[];
  skills: SearchSkillV2Result[];
  posts: SearchPostV2Result[];
}

type JsonRecord = Record<string, unknown>;

const asRecord = (value: unknown, context: string): JsonRecord => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`Invalid ${context} contract`);
  }
  return value as JsonRecord;
};

const asArray = (value: unknown, context: string): unknown[] => {
  if (!Array.isArray(value)) throw new TypeError(`Invalid ${context} contract`);
  return value;
};

const asString = (value: unknown, context: string): string => {
  if (typeof value !== "string") throw new TypeError(`Invalid ${context} contract`);
  return value;
};

const asNullableString = (value: unknown, context: string): string | null => {
  if (value === null) return null;
  return asString(value, context);
};

const asNumber = (value: unknown, context: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`Invalid ${context} contract`);
  }
  return value;
};

const asBoolean = (value: unknown, context: string): boolean => {
  if (typeof value !== "boolean") throw new TypeError(`Invalid ${context} contract`);
  return value;
};

const asStringArray = (value: unknown, context: string): string[] =>
  asArray(value, context).map((item) => asString(item, context));

const asEnum = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  context: string,
): T => {
  const candidate = asString(value, context);
  if (!allowed.includes(candidate as T)) throw new TypeError(`Invalid ${context} contract`);
  return candidate as T;
};

const parseQuestion = (value: unknown): SearchQuestionV2Row => {
  const row = asRecord(value, "search question");
  return {
    id: asString(row.id, "search question id"),
    title: asString(row.title, "search question title"),
    content: asNullableString(row.content, "search question content"),
    bounty_points: asNumber(row.bounty_points, "search question bounty_points"),
    view_count: asNumber(row.view_count, "search question view_count"),
    created_at: asString(row.created_at, "search question created_at"),
    author_id: asString(row.author_id, "search question author_id"),
    profile_nickname: asString(row.profile_nickname, "search question profile_nickname"),
    profile_avatar: asNullableString(row.profile_avatar, "search question profile_avatar"),
    answers_count: asNumber(row.answers_count, "search question answers_count"),
    category: asNullableString(row.category, "search question category"),
    tags: asStringArray(row.tags, "search question tags"),
  };
};

const parseExpert = (value: unknown): SearchExpertV2Row => {
  const row = asRecord(value, "search expert");
  return {
    id: asString(row.id, "search expert id"),
    user_id: asString(row.user_id, "search expert user_id"),
    nickname: asString(row.nickname, "search expert nickname"),
    avatar_url: asNullableString(row.avatar_url, "search expert avatar_url"),
    headline: asNullableString(row.headline, "search expert headline"),
    intro: asNullableString(row.intro, "search expert intro"),
    verification_status: asEnum(
      row.verification_status,
      EXPERT_VERIFICATION_STATUS,
      "search expert verification_status",
    ),
    follower_count: asNumber(row.follower_count, "search expert follower_count"),
    service_count: asNumber(row.service_count, "search expert service_count"),
  };
};

const parseSkill = (value: unknown): SearchSkillV2Row => {
  const row = asRecord(value, "search skill");
  return {
    id: asString(row.id, "search skill id"),
    expert_id: asString(row.expert_id, "search skill expert_id"),
    title: asString(row.title, "search skill title"),
    description: asNullableString(row.description, "search skill description"),
    pricing_mode: asEnum(
      row.pricing_mode,
      SKILL_PRICING_MODE,
      "search skill pricing_mode",
    ),
    price_amount: row.price_amount === null
      ? null
      : asNumber(row.price_amount, "search skill price_amount"),
    price_currency: asString(row.price_currency, "search skill price_currency"),
    city: asNullableString(row.city, "search skill city"),
    city_code: asNullableString(row.city_code, "search skill city_code"),
    is_remote_supported: asBoolean(
      row.is_remote_supported,
      "search skill is_remote_supported",
    ),
    delivery_mode: asEnum(
      row.delivery_mode,
      SKILL_DELIVERY_MODE,
      "search skill delivery_mode",
    ),
    created_at: asString(row.created_at, "search skill created_at"),
    category_name: asNullableString(row.category_name, "search skill category_name"),
    expert_nickname: asString(row.expert_nickname, "search skill expert_nickname"),
    expert_avatar: asNullableString(row.expert_avatar, "search skill expert_avatar"),
  };
};

const parsePost = (value: unknown): SearchPostV2Row => {
  const row = asRecord(value, "search post");
  return {
    id: asString(row.id, "search post id"),
    author_id: asString(row.author_id, "search post author_id"),
    content: asString(row.content, "search post content"),
    city: asNullableString(row.city, "search post city"),
    city_code: asNullableString(row.city_code, "search post city_code"),
    created_at: asString(row.created_at, "search post created_at"),
    like_count: asNumber(row.like_count, "search post like_count"),
    favorite_count: asNumber(row.favorite_count, "search post favorite_count"),
    comment_count: asNumber(row.comment_count, "search post comment_count"),
    author_nickname: asString(row.author_nickname, "search post author_nickname"),
    author_avatar: asNullableString(row.author_avatar, "search post author_avatar"),
  };
};

export const parseSearchAppContentV2RawResult = (
  value: unknown,
): SearchAppContentV2RawResult => {
  const payload = asRecord(value, "search_app_content_v2 result");
  return {
    questions: asArray(payload.questions, "search questions").map(parseQuestion),
    experts: asArray(payload.experts, "search experts").map(parseExpert),
    skills: asArray(payload.skills, "search skills").map(parseSkill),
    posts: asArray(payload.posts, "search posts").map(parsePost),
  };
};

export const parseSearchAppContentV2Result = (
  value: unknown,
): SearchAppContentV2Result => {
  const raw = parseSearchAppContentV2RawResult(value);
  return {
    questions: raw.questions.map((item) => ({
      ...item,
      kind: "question",
      navigationTarget: { kind: "question", id: item.id },
    })),
    experts: raw.experts.map((item) => ({
      ...item,
      kind: "expert",
      navigationTarget: { kind: "expert", id: item.id },
    })),
    skills: raw.skills.map((item) => ({
      ...item,
      kind: "skill",
      navigationTarget: { kind: "skill", id: item.id },
    })),
    posts: raw.posts.map((item) => ({
      ...item,
      kind: "post",
      navigationTarget: { kind: "post", id: item.id },
    })),
  };
};
