import {
  CONTENT_TARGET_TYPE,
  MODERATION_TARGET_TYPE,
  type ContentTargetType,
  type ModerationTargetType,
  type Notification,
  type NotificationTargetType,
  type NotificationRow,
} from "../../shared-types/src/contracts";

const normalizeTargetType = (value: string | null): NotificationTargetType | null => {
  if (!value) return null;
  if (CONTENT_TARGET_TYPE.includes(value as ContentTargetType)) {
    return value as ContentTargetType;
  }
  return MODERATION_TARGET_TYPE.includes(value as ModerationTargetType)
    ? value as ModerationTargetType
    : null;
};

/** Prefer Pack 05 canonical columns while preserving read compatibility. */
export const normalizeNotification = (row: NotificationRow): Notification => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title,
  body: row.body ?? row.content,
  targetType: normalizeTargetType(row.target_type ?? row.related_type),
  targetId: row.target_id ?? row.related_id,
  senderId: row.sender_id,
  isRead: row.is_read === true,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
