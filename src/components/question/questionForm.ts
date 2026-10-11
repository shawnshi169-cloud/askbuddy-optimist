import { PRODUCT_CHANNEL_CATALOG } from '../../../packages/shared-types/src/product-channels';
import type { ProductChannelSlug } from '../../../packages/shared-types/src/product-channels';
import { questionTopicIdsInput } from '../../../packages/shared-api/src/question-answer-v1';

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
  topicIds: string[];
  topicRestoreError?: boolean;
  publishUncertain?: boolean;
  savedAt: string;
}
export const emptyQuestionDraft = (): QuestionDraft => ({
  version: 2,
  title: '',
  context: '',
  primaryChannel: '',
  budgetInput: '',
  topicIds: [],
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
    // V2 is extended in place: a missing field is an old valid draft, not corrupt content.
    const topics = questionTopicIdsInput.safeParse(row.topicIds === undefined ? [] : row.topicIds);
    return {
      version: 2,
      title: row.title,
      context: row.context,
      budgetInput: row.budgetInput,
      primaryChannel: row.primaryChannel as ProductChannelSlug | '',
      savedAt: row.savedAt,
      topicIds: topics.success ? topics.data : [],
      ...(row.topicRestoreError === true || !topics.success ? { topicRestoreError: true } : {}),
      ...(row.publishUncertain === true ? { publishUncertain: true } : {}),
    };
  } catch {
    return emptyQuestionDraft();
  }
};

type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function readQuestionDraft(local: DraftStorage, session: DraftStorage, viewer: string | null) {
  let own = emptyQuestionDraft();
  try {
    const existing = local.getItem(questionDraftKey(viewer));
    own = parseQuestionDraft(existing);
    const handoff = session.getItem(QUESTION_DRAFT_HANDOFF);
    if (!viewer || !handoff) return { draft: own, notice: '' };
    const claim = `viewer:${viewer}`;
    if (handoff !== 'pending' && handoff !== claim) return { draft: own, notice: '' };
    // Claim BEFORE copying. A partial storage failure cannot transfer this handoff to another account.
    session.setItem(QUESTION_DRAFT_HANDOFF, claim);
    const anonymous = local.getItem(questionDraftKey(null));
    if (existing !== null) {
      session.removeItem(QUESTION_DRAFT_HANDOFF);
      return { draft: own, notice: '已保留此账号原有草稿。登录前的草稿仍保留在未登录草稿中，未覆盖或合并。' };
    }
    if (anonymous !== null) {
      own = parseQuestionDraft(anonymous);
      local.setItem(questionDraftKey(viewer), JSON.stringify(own));
      local.removeItem(questionDraftKey(null));
    }
    session.removeItem(QUESTION_DRAFT_HANDOFF);
    return { draft: own, notice: anonymous === null ? '' : '已恢复登录前的草稿。' };
  } catch {
    return { draft: own, notice: '当前设备无法完整读取或交接草稿，原有内容未主动清除，请检查后再继续。' };
  }
}

export function selectQuestionTopic(ids: string[], topic: { topicId: string; status: 'active' | 'deprecated' }) {
  if (topic.status !== 'active') throw new Error('Inactive Topic');
  return questionTopicIdsInput.parse([...ids, topic.topicId]);
}

export function questionDraftInput(draft: QuestionDraft) {
  if (draft.topicRestoreError) throw new Error('草稿中的话题信息无法恢复，请清空话题选择后重新选择。');
  if (!draft.primaryChannel) throw new Error('请选择一个频道。');
  return {
    p_title: draft.title.trim(),
    p_context: draft.context.trim(),
    p_primary_channel: draft.primaryChannel,
    p_topic_ids: questionTopicIdsInput.parse(draft.topicIds),
    p_deep_exchange_budget_max_cents: budgetInputToCents(draft.budgetInput),
  };
}

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
