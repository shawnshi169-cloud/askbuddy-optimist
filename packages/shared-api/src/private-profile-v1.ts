export interface MyPrivateProfileV1 {
  userId: string;
  nickname: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
}

export type GetMyPrivateProfileV1Params = Record<string, never>;
export interface GetMyPrivateProfileV1Result {
  profile: MyPrivateProfileV1 | null;
}

const exactRecord = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError("Invalid owner-private profile contract");
  }
  const row = value as Record<string, unknown>;
  if (Object.keys(row).length !== keys.length || keys.some((key) => !Object.prototype.hasOwnProperty.call(row, key))) {
    throw new TypeError("Invalid owner-private profile contract");
  }
  return row;
};

// Never include the response value in errors: this payload contains private phone data.
export const parseGetMyPrivateProfileV1Result = (value: unknown): GetMyPrivateProfileV1Result => {
  const payload = exactRecord(value, ["profile"]);
  if (payload.profile === null) return { profile: null };
  const row = exactRecord(payload.profile, ["userId", "nickname", "avatarUrl", "coverUrl", "bio", "phone", "city"]);
  if (typeof row.userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(row.userId)) {
    throw new TypeError("Invalid owner-private profile identity");
  }
  const nullableText = (key: string): string | null => {
    const field = row[key];
    if (field !== null && typeof field !== "string") {
      throw new TypeError("Invalid owner-private profile field");
    }
    return field as string | null;
  };
  return { profile: {
    userId: row.userId,
    nickname: nullableText("nickname"),
    avatarUrl: nullableText("avatarUrl"),
    coverUrl: nullableText("coverUrl"),
    bio: nullableText("bio"),
    phone: nullableText("phone"),
    city: nullableText("city"),
  } };
};
