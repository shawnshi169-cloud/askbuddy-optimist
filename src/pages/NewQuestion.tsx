import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateCanonicalQuestion,
  useQuestionAnswerViewer,
} from '@/hooks/useQuestionAnswerV1';
import { QuestionAnswerUiError, questionAnswerErrorText } from '@/lib/adapters/questionAnswerV1';
import QuestionTopicPicker from '@/components/question/QuestionTopicPicker';
import {
  buildFromState,
  navigateBackOr,
  navigateToAuthWithReturn,
} from '@/utils/navigation';
import {
  emptyQuestionDraft,
  questionDraftInput,
  readQuestionDraft,
  questionDraftKey,
  QUESTION_DRAFT_HANDOFF,
  type QuestionDraft,
} from '@/components/question/questionForm';
import { PRODUCT_CHANNEL_CATALOG } from '../../packages/shared-types/src/product-channels';

const QuestionComposer = ({ viewer }: { viewer: string | null }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [draft, setDraft] = useState(emptyQuestionDraft);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState('');
  const [draftNotice, setDraftNotice] = useState('');
  const create = useCreateCanonicalQuestion(viewer);
  const active = useRef(true);
  const submitted = useRef(false);
  const initialized = useRef(false);
  const publishLock = useRef(false);
  const busy = !loaded || create.isPending;
  useEffect(() => {
    active.current = true;
    if (!initialized.current) {
      initialized.current = true;
      try {
        const restored = readQuestionDraft(localStorage, sessionStorage, viewer);
        setDraft(restored.draft);
        setDraftNotice(restored.notice);
      } catch {
        setDraftNotice('当前设备无法读取草稿，请暂时不要离开此页。');
      }
      setLoaded(true);
    }
    return () => {
      active.current = false;
    };
  }, [viewer]);

  const persist = (next: QuestionDraft) => {
    try {
      localStorage.setItem(
        questionDraftKey(viewer),
        JSON.stringify({ ...next, savedAt: new Date().toISOString() }),
      );
      setDraftNotice('草稿仅保存在当前设备');
      return true;
    } catch {
      setDraftNotice('当前设备无法保存草稿，请暂时不要离开此页');
      return false;
    }
  };
  const change = (patch: Partial<QuestionDraft>) => {
    if (busy || publishLock.current || submitted.current) return;
    const next = { ...draft, ...patch };
    setDraft(next);
    setError('');
    persist(next);
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || publishLock.current || submitted.current || draft.publishUncertain) return;
    if (!draft.title.trim() || !draft.context.trim() || !draft.primaryChannel) {
      setError('请填写问题标题、具体背景，并选择一个频道。');
      return;
    }
    let input: ReturnType<typeof questionDraftInput>;
    try {
      input = questionDraftInput(draft);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '请检查预算金额。');
      return;
    }
    if (!viewer) {
      if (!persist(draft)) {
        setError('请先允许本地保存草稿，再登录继续。');
        return;
      }
      try {
        sessionStorage.setItem(QUESTION_DRAFT_HANDOFF, 'pending');
      } catch {
        setError('当前设备无法保存登录返回状态，请稍后重试。');
        return;
      }
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    publishLock.current = true;
    setError('');
    // A lost response must not turn a restored draft into an automatic second publication.
    persist({ ...draft, publishUncertain: true });
    try {
      const result = await create.mutateAsync(input);
      if (!active.current) return;
      submitted.current = true;
      try {
        localStorage.removeItem(questionDraftKey(viewer));
      } catch {
        /* The RPC already succeeded; never submit it again. */
      }
      navigate(`/question/${result.questionId}`, {
        replace: true,
        state: buildFromState({ pathname: '/', search: '', hash: '' }),
      });
    } catch (cause) {
      if (active.current) {
        const uncertain = !(cause instanceof QuestionAnswerUiError) || cause.key === 'UNAVAILABLE' || cause.key === 'VIEWER_CHANGED';
        const retained = { ...draft, publishUncertain: uncertain };
        setDraft(retained);
        persist(retained);
        setError(questionAnswerErrorText(cause));
      }
    } finally {
      publishLock.current = false;
    }
  };

  return (
    <div className="app-container min-h-[100dvh] bg-app-page">
      <SubPageHeader
        title="提个问题"
        variant="content"
        onBack={() => navigateBackOr(navigate, '/', { location })}
      />
      <form
        onSubmit={submit}
        className="px-4 pb-8"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 32px)' }}
      >
        <section className="space-y-5 py-6">
          <div>
            <label htmlFor="question-title" className="app-section-title">
              你想问什么？
            </label>
            <Input
              id="question-title"
              value={draft.title}
              onChange={(e) => change({ title: e.target.value })}
              disabled={busy}
              required
              placeholder="用一句话说清你的问题"
              className="mt-3 h-12 rounded-xl border-app-border-subtle bg-white text-base"
            />
          </div>
          <div>
            <label
              htmlFor="question-context"
              className="text-sm font-medium text-slate-700"
            >
              具体背景
            </label>
            <Textarea
              id="question-context"
              value={draft.context}
              onChange={(e) => change({ context: e.target.value })}
              disabled={busy}
              required
              placeholder="你遇到了什么？尝试过什么？希望听到哪方面的经验？"
              className="mt-2 min-h-48 rounded-xl border-app-border-subtle bg-white text-base leading-7"
            />
          </div>
        </section>
        <fieldset
          className="border-t border-app-border-subtle py-6"
          disabled={busy}
        >
          <legend className="sr-only">选择一个频道</legend>
          <p className="mb-3 text-sm font-medium text-slate-700">
            选择一个频道
          </p>
          <div className="grid grid-cols-2 gap-3">
            {PRODUCT_CHANNEL_CATALOG.map((channel) => (
              <label
                key={channel.slug}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 text-sm ${draft.primaryChannel === channel.slug ? 'border-app-action bg-app-action-soft text-app-action' : 'border-app-border-subtle bg-white text-slate-600'}`}
              >
                <input
                  type="radio"
                  name="primaryChannel"
                  value={channel.slug}
                  checked={draft.primaryChannel === channel.slug}
                  onChange={() => change({ primaryChannel: channel.slug })}
                  required
                  className="accent-[rgb(43,127,115)]"
                />
                {channel.label}
              </label>
            ))}
          </div>
        </fieldset>
        <QuestionTopicPicker viewer={viewer} topicIds={draft.topicIds} restoreError={draft.topicRestoreError}
          disabled={busy} onChange={topicIds => change({ topicIds, topicRestoreError: false })} />
        <section className="border-t border-app-border-subtle py-6">
          <label
            htmlFor="question-budget"
            className="text-sm font-medium text-slate-700"
          >
            深入交流预算{' '}
            <span className="font-normal text-slate-400">· 选填</span>
          </label>
          <p
            id="budget-help"
            className="my-2 text-[13px] leading-6 text-slate-500"
          >
            如果遇到合适的人，你愿意为一次深入交流支付多少？选填。
          </p>
          <div className="flex items-center gap-2">
            <span aria-hidden className="text-slate-500">
              ¥
            </span>
            <Input
              id="question-budget"
              type="text"
              inputMode="decimal"
              aria-describedby="budget-help"
              value={draft.budgetInput}
              onChange={(e) => change({ budgetInput: e.target.value })}
              disabled={busy}
              placeholder="填写最高金额"
              className="h-11 rounded-xl border-app-border-subtle bg-white text-base"
            />
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            仅表示后续深入交流意愿，公开回答仍然免费。
          </p>
        </section>
        {error && (
          <p role="alert" className="mb-4 text-sm text-red-700">
            {error}
          </p>
        )}
        {draft.publishUncertain ? (
          <div role="alert" className="mb-4 text-sm leading-6 text-slate-600">
            上次发布结果尚未确认。请先确认问题是否已发布，避免重复提交，草稿仍保留。
            <Button type="button" variant="ghost" className="min-h-11" disabled={busy} onClick={() => change({ publishUncertain: false })}>已确认未发布，允许重试</Button>
          </div>
        ) : null}
        <Button
          type="submit"
          variant="action"
          className="h-12 w-full rounded-full"
          disabled={
            busy || draft.publishUncertain || draft.topicRestoreError ||
            !draft.title.trim() ||
            !draft.context.trim() ||
            !draft.primaryChannel
          }
        >
          {create.isPending ? '提交中…' : '发布问题'}
        </Button>
        {draftNotice && (
          <p role="status" className="mt-3 text-center text-xs text-slate-500">
            {draftNotice}
          </p>
        )}
      </form>
    </div>
  );
};
const NewQuestion = () => {
  const { viewer, loading } = useQuestionAnswerViewer();
  if (loading)
    return (
      <div className="app-container min-h-screen bg-app-page">
        <SubPageHeader title="提个问题" variant="content" />
        <p role="status" className="px-4 py-6 text-sm text-slate-500">
          正在确认登录状态…
        </p>
      </div>
    );
  return <QuestionComposer key={viewer ?? 'anon'} viewer={viewer} />;
};
export default NewQuestion;
