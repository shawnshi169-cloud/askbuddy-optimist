import { useState } from 'react';
import { MessageCircle, ThumbsUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CanonicalAnswerV1 } from '../../../packages/shared-types/src/question-answer-v1';
import {
  useCanonicalHelpful,
  useDeleteCanonicalAnswer,
} from '@/hooks/useQuestionAnswerV1';
import { questionAnswerErrorText } from '@/lib/adapters/questionAnswerV1';
import { PersonSummary } from './PersonSummary';
import { AnswerReplies } from './AnswerReplies';
import { QuestionActionConfirm } from './QuestionActionConfirm';

interface AnswerListProps {
  answers: CanonicalAnswerV1[];
  viewer: string | null;
  closed: boolean;
  onAuth: () => void;
  onOpenPerson: (personId: string) => void;
}
const AnswerItem = ({
  answer,
  viewer,
  closed,
  onAuth,
  onOpenPerson,
}: Omit<AnswerListProps, 'answers'> & { answer: CanonicalAnswerV1 }) => {
  const helpful = useCanonicalHelpful(viewer, answer.questionId);
  const remove = useDeleteCanonicalAnswer(viewer, answer.questionId);
  const expansionKey = `canonical-answer-replies:${viewer ?? 'anon'}:${answer.answerId}`;
  const [expanded, setExpanded] = useState(() => {
    try {
      return sessionStorage.getItem(expansionKey) === 'open';
    } catch {
      return false;
    }
  });
  const toggleReplies = () => {
    setExpanded(!expanded);
    try {
      sessionStorage.setItem(expansionKey, expanded ? 'closed' : 'open');
    } catch {
      /* Keep the local interaction available. */
    }
  };
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');
  const markHelpful = async () => {
    if (!viewer) {
      onAuth();
      return;
    }
    if (viewer === answer.authorPersonId || helpful.isPending) return;
    setError('');
    try {
      await helpful.mutateAsync({
        p_answer_id: answer.answerId,
        p_is_helpful: !answer.viewerHasMarkedHelpful,
      });
    } catch (cause) {
      setError(questionAnswerErrorText(cause));
    }
  };
  const deleteAnswer = async () => {
    if (remove.isPending) return;
    setError('');
    try {
      await remove.mutateAsync({ p_answer_id: answer.answerId });
      setConfirmDelete(false);
    } catch (cause) {
      setConfirmDelete(false);
      setError(questionAnswerErrorText(cause));
    }
  };
  return (
    <article className="py-5 first:pt-0">
      <PersonSummary
        person={answer.author}
        personId={answer.authorPersonId}
        createdAt={answer.createdAt}
        onOpenPerson={onOpenPerson}
      />
      <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
        {answer.body}
      </p>
      <footer className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <Button
          variant="ghost"
          className={`h-11 gap-1.5 px-1 text-xs ${answer.viewerHasMarkedHelpful ? 'text-app-action' : 'text-slate-500'}`}
          aria-pressed={answer.viewerHasMarkedHelpful}
          disabled={helpful.isPending || viewer === answer.authorPersonId}
          title={
            viewer === answer.authorPersonId
              ? '不能为自己的回答标记有帮助'
              : undefined
          }
          onClick={() => void markHelpful()}
        >
          <ThumbsUp size={15} aria-hidden />
          有帮助 {answer.helpfulCount}
        </Button>
        <Button
          variant="ghost"
          className="h-11 gap-1.5 px-1 text-xs text-slate-500"
          aria-expanded={expanded}
          onClick={toggleReplies}
        >
          <MessageCircle size={15} aria-hidden />
          回复 {answer.replyCount}
        </Button>
        <Button
          variant="ghost"
          className="h-11 px-1 text-xs text-app-action"
          onClick={() => onOpenPerson(answer.authorPersonId)}
        >
          问问TA
        </Button>
        {viewer === answer.authorPersonId ? (
          <Button
            variant="ghost"
            className="ml-auto h-11 px-1 text-xs text-slate-500"
            onClick={() => setConfirmDelete(true)}
          >
            删除回答
          </Button>
        ) : null}
      </footer>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {expanded ? (
        <AnswerReplies
          answerId={answer.answerId}
          questionId={answer.questionId}
          viewer={viewer}
          closed={closed}
          onAuth={onAuth}
          onOpenPerson={onOpenPerson}
        />
      ) : null}
      <QuestionActionConfirm
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="删除这条回答？"
        description="删除后，这条回答及其公开回复将不再显示。"
        pending={remove.isPending}
        onConfirm={() => void deleteAnswer()}
      />
    </article>
  );
};
const AnswerList = ({ answers, ...props }: AnswerListProps) => (
  <div className="divide-y divide-app-border-subtle">
    {answers.map((answer) => (
      <AnswerItem key={answer.answerId} answer={answer} {...props} />
    ))}
  </div>
);
export default AnswerList;
