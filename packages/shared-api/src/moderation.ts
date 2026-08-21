import {
  MODERATION_REPORT_STATUS,
  MODERATION_TARGET_TYPE,
  type ModerationReportStatus,
  type ModerationTargetType,
} from "../../shared-types/src/contracts";

const LEGACY_MODERATION_TARGET_MAP: Readonly<Record<string, ModerationTargetType>> = {
  discussion: "post",
  profile: "expert",
  user_verification: "user_verifications",
};

export const normalizeModerationTargetType = (
  value: string,
): ModerationTargetType | null => {
  const normalized = LEGACY_MODERATION_TARGET_MAP[value] ?? value;
  return MODERATION_TARGET_TYPE.includes(normalized as ModerationTargetType)
    ? normalized as ModerationTargetType
    : null;
};

export const normalizeModerationReportStatus = (
  value: string,
): ModerationReportStatus | null => {
  const normalized = value === "reviewing" ? "in_review" : value;
  return MODERATION_REPORT_STATUS.includes(normalized as ModerationReportStatus)
    ? normalized as ModerationReportStatus
    : null;
};
