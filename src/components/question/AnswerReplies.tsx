import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  useCanonicalReplies,
  useCreateCanonicalReply,
  useDeleteCanonicalReply,
} from '@/hooks/useQuestionAnswerV1';
import { questionAnswerErrorText } from '@/lib/adapters/questionAnswerV1';
import { PersonSummary } from './PersonSummary';
import { QuestionActionConfirm } from './QuestionActionConfirm';

export const AnswerReplies = ({
  answerId,
  questionId,
  viewer,
  closed,
  onAuth,
  onOpenPerson,
}: {
  answerId: string;
  questionId: string;
  viewer: string | null;
  closed: boolean;
  onAuth: () => void;
  onOpenPerson: (id: string) => void;
}) => {
  const query = useCanonicalReplies(answerId, viewer, true);
  const create = useCreateCanonicalReply(viewer, questionId);
  const remove = useDeleteCanonicalReply(viewer, questionId, answerId);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (closed || create.isPending || !body.trim()) return;
    if (!viewer) {
      onAuth();
      return;
    }
    setError('');
    try {
      await create.mutateAsync({ p_answer_id: answerId, p_body: body.trim() });
      setBody('');
    } catch (cause) {
      setError(questionAnswerErrorText(cause));
    }
  };
  const deleteReply = async () => {
    if (!deleteId || remove.isPending) return;
    setError('');
    try {
      await remove.mutateAsync({ p_reply_id: deleteId });
      setDeleteId(null);
    } catch (cause) {
      setDeleteId(null);
      setError(questionAnswerErrorText(cause));
    }
  };
  return (
    <section
      className="mt-3 border-l-2 border-app-border-subtle pl-3"
      aria-label="回答的公开回复"
    >
      <p className="mb-3 text-xs text-slate-500">公开回复 · 围绕这条回答交流</p>
      {query.isPending ? (
        <p role="status" className="text-sm text-slate-500">
          正在加载回复…
        </p>
      ) : null}
      {query.isError ? (
        <div role="alert" className="text-sm text-slate-600">
          回复暂时无法加载。
          <Button
            variant="ghost"
            className="h-11 text-app-action"
            onClick={() => void query.refetch()}
          >
            重试
          </Button>
        </div>
      ) : null}
      {!query.isPending &&
      !query.isError &&
      query.data?.pages[0]?.replies.length === 0 ? (
        <p className="text-sm text-slate-500">还没有回复</p>
      ) : null}
      <div className="divide-y divide-app-border-subtle">
        {query.data?.pages
          .flatMap((page) => page.replies)
          .map((reply) => (
            <article key={reply.replyId} className="py-4">
              <PersonSummary
                person={reply.author}
                personId={reply.authorPersonId}
                createdAt={reply.createdAt}
                onOpenPerson={onOpenPerson}
              />
              <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-700">
                {reply.body}
              </p>
              {viewer === reply.authorPersonId ? (
                <Button
                  variant="ghost"
                  className="mt-1 h-11 px-0 text-xs text-slate-500"
                  onClick={() => setDeleteId(reply.replyId)}
                >
                  删除回复
                </Button>
              ) : null}
            </article>
          ))}
      </div>
      {query.hasNextPage ? (
        <Button
          variant="ghost"
          className="h-11 text-app-action"
          disabled={query.isFetchingNextPage}
          onClick={() => void query.fetchNextPage()}
        >
          {query.isFetchingNextPage ? '加载中…' : '加载更多回复'}
        </Button>
      ) : null}
      {closed ? (
        <p className="mt-3 text-xs leading-6 text-slate-500">
          问题已关闭，不能新增回复。
        </p>
      ) : !viewer ? (
        <Button
          variant="ghost"
          className="h-11 text-app-action"
          onClick={onAuth}
        >
          登录后回复
        </Button>
      ) : (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <label
            htmlFor={`reply-${answerId}`}
            className="text-sm text-slate-600"
          >
            回复这条回答
          </label>
          <Textarea
            id={`reply-${answerId}`}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            disabled={create.isPending}
            className="min-h-24 rounded-xl bg-white text-base leading-6"
            placeholder="写下与这条回答相关的想法…"
          />
          <Button
            type="submit"
            variant="action"
            className="h-11 rounded-full"
            disabled={!body.trim() || create.isPending}
          >
            {create.isPending ? '提交中…' : '提交回复'}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
      <QuestionActionConfirm
        open={Boolean(deleteId)}
        onOpenChange={(open) => {
          if (!open) setDeleteId(null);
        }}
        title="删除这条回复？"
        description="删除后，这条公开回复将不再显示。"
        pending={remove.isPending}
        onConfirm={() => void deleteReply()}
      />
    </section>
  );
};
