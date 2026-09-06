import { PRODUCT_CHANNEL_CATALOG } from '../../../packages/shared-types/src/product-channels';
import type { ProductChannelSlug } from '../../../packages/shared-types/src/product-channels';

export const QUESTION_DRAFT_VERSION = 2;
export const questionDraftKey = (viewer: string | null) =>
  `canonical-question-draft-v2:${viewer ?? 'anon'}`;
export const QUESTION_DRAFT_HANDOFF = 'canonical-question-draft-auth-handoff';
export interface QuestionDraft {
  version: 2;
  title: string;
  context: string;
  primaryChannel: ProductChannelSlug | '';
  budgetInput: string;
  savedAt: string;
}
export const emptyQuestionDraft = (): QuestionDraft => ({
  version: 2,
  title: '',
  context: '',
  primaryChannel: '',
  budgetInput: '',
  savedAt: '',
});
export const parseQuestionDraft = (raw: string | null): QuestionDraft => {
  try {
    const value: unknown = JSON.parse(raw ?? 'null');
    if (!value || typeof value !== 'object') return emptyQuestionDraft();
    const row = value as Record<string, unknown>;
    if (
      row.version !== 2 ||
      typeof row.title !== 'string' ||
      typeof row.context !== 'string' ||
      typeof row.budgetInput !== 'string' ||
      typeof row.savedAt !== 'string' ||
      !(
        row.primaryChannel === '' ||
        PRODUCT_CHANNEL_CATALOG.some(
          (channel) => channel.slug === row.primaryChannel,
        )
      )
    )
      return emptyQuestionDraft();
    return {
      version: 2,
      title: row.title,
      context: row.context,
      budgetInput: row.budgetInput,
      primaryChannel: row.primaryChannel as ProductChannelSlug | '',
      savedAt: row.savedAt,
    };
  } catch {
    return emptyQuestionDraft();
  }
};

// Decimal text -> integer cents. No floating-point multiplication or arbitrary business cap.
export const budgetInputToCents = (input: string): number | null => {
  const value = input.trim();
  if (!value) return null;
  if (!/^\d+(?:\.\d{1,2})?$/.test(value))
    throw new Error('请输入大于 0 的金额，最多保留两位小数。');
  const [yuan, fraction = ''] = value.split('.');
  const cents = BigInt(yuan) * 100n + BigInt(fraction.padEnd(2, '0'));
  if (cents <= 0n) throw new Error('请输入大于 0 的金额，或留空。');
  if (cents > BigInt(Number.MAX_SAFE_INTEGER))
    throw new Error('金额超出可安全保存的范围，请调整金额。');
  return Number(cents);
};
export const formatBudgetCents = (cents: number) => {
  const exact = BigInt(cents);
  return `${exact / 100n}.${String(exact % 100n).padStart(2, '0')}`;
};
