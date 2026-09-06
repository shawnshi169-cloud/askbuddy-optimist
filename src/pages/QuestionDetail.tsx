import { useEffect, useRef, useState } from 'react';
import { Flag, MoreHorizontal, Share2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AnswerDialog from '@/components/AnswerDialog';
import AnswerList from '@/components/question/AnswerList';
import BottomBar from '@/components/question/BottomBar';
import { PersonSummary } from '@/components/question/PersonSummary';
import { QuestionActionConfirm } from '@/components/question/QuestionActionConfirm';
import { formatBudgetCents } from '@/components/question/questionForm';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSubmitContentReport } from '@/hooks/useModeration';
import { useToast } from '@/hooks/use-toast';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import {
  useQuestionAnswerViewer,
  useCanonicalQuestion,
  useCanonicalAnswers,
  useCreateCanonicalAnswer,
  useCloseCanonicalQuestion,
} from '@/hooks/useQuestionAnswerV1';
import {
  questionAnswerErrorText,
  QuestionAnswerUiError,
} from '@/lib/adapters/questionAnswerV1';
import {
  buildFromState,
  navigateBackOr,
  navigateToAuthWithReturn,
} from '@/utils/navigation';
import { copyTextToClipboard } from '@/utils/clipboard';
import { PRODUCT_CHANNEL_CATALOG } from '../../packages/shared-types/src/product-channels';
import type { AnswerOrderV1 } from '../../packages/shared-types/src/question-answer-v1';

const readSession = (key: string) => {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
};
const saveSession = (key: string, value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    /* Navigation still works without persistence. */
  }
};
const ContentSkeleton = () => (
  <div
    className="animate-pulse space-y-6 px-4 py-6"
    role="status"
    aria-label="正在加载问题内容"
  >
    <div className="h-5 w-32 rounded bg-slate-100" />
    <div className="h-7 w-full rounded bg-slate-100" />
    <div className="h-7 w-3/4 rounded bg-slate-100" />
    {[0, 1, 2].map((i) => (
      <div key={i} className="space-y-3 border-t border-app-border-subtle pt-6">
        <div className="h-11 w-11 rounded-full bg-slate-100" />
        <div className="h-4 w-full rounded bg-slate-100" />
        <div className="h-4 w-5/6 rounded bg-slate-100" />
      </div>
    ))}
  </div>
);

const QuestionContent = ({
  id,
  viewer,
}: {
  id: string;
  viewer: string | null;
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const stateKey = `canonical-question-ui:${id}:${viewer ?? 'anon'}`;
  const [order, setOrder] = useState<AnswerOrderV1>(() =>
    readSession(`${stateKey}:order`) === 'latest' ? 'latest' : 'comprehensive',
  );
  const origin = useRef<unknown>(location.state);
  if (!origin.current) {
    try {
      origin.current = JSON.parse(readSession(`${stateKey}:origin`) ?? 'null');
    } catch {
      /* Use route fallback. */
    }
  }
  useEffect(() => {
    if (location.state)
      saveSession(`${stateKey}:origin`, JSON.stringify(location.state));
  }, [location.state, stateKey]);
  const { prepareForNavigation } = usePageScrollMemory(
    `question:${id}:${viewer ?? 'anon'}`,
  );
  const query = useCanonicalQuestion(id, viewer);
  const question = query.data?.question;
  const answersQuery = useCanonicalAnswers(
    id,
    order,
    viewer,
    Boolean(question),
  );
  const createAnswer = useCreateCanonicalAnswer(viewer);
  const close = useCloseCanonicalQuestion(viewer);
  const report = useSubmitContentReport();
  const [answerOpen, setAnswerOpen] = useState(false);
  const [answerError, setAnswerError] = useState('');
  const [actionError, setActionError] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const back = () => {
    prepareForNavigation();
    navigateBackOr(navigate, '/', {
      location: { ...location, state: origin.current },
    });
  };
  const auth = () => {
    prepareForNavigation();
    navigateToAuthWithReturn(navigate, location);
  };
  const openPerson = (personId: string) => {
    prepareForNavigation();
    navigate(`/person/${personId}`, { state: buildFromState(location) });
  };
  const beginAnswer = () => {
    if (question?.status !== 'open') return;
    if (!viewer) {
      auth();
      return;
    }
    setAnswerError('');
    setAnswerOpen(true);
  };
  const submitAnswer = async ({ message }: { message: string }) => {
    if (!question || question.status !== 'open' || createAnswer.isPending)
      return;
    setAnswerError('');
    try {
      await createAnswer.mutateAsync({
        p_question_id: question.questionId,
        p_body: message,
      });
      if (!active.current) return;
      setAnswerOpen(false);
      toast({ title: '回答已提交' });
    } catch (cause) {
      if (!active.current) return;
      setAnswerError(questionAnswerErrorText(cause));
      if (
        cause instanceof QuestionAnswerUiError &&
        cause.key === 'QUESTION_CLOSED'
      )
        void query.refetch();
    }
  };
  const closeQuestion = async () => {
    if (!question || close.isPending) return;
    setActionError('');
    try {
      await close.mutateAsync({ p_question_id: question.questionId });
      if (active.current) setCloseOpen(false);
    } catch (cause) {
      if (active.current) {
        setCloseOpen(false);
        setActionError(questionAnswerErrorText(cause));
      }
    }
  };
  const share = async () => {
    try {
      await copyTextToClipboard(window.location.href);
      toast({ title: '分享链接已复制' });
    } catch {
      toast({
        title: '分享失败',
        description: '当前设备无法复制链接，请稍后重试。',
        variant: 'destructive',
      });
    }
  };
  const submitReport = () => {
    if (!viewer) {
      auth();
      return;
    }
    if (!question || report.isPending) return;
    report.mutate({
      targetId: question.questionId,
      targetType: 'question',
      reason: '疑似违规或垃圾内容',
      details: `来自问题详情页：${question.title}`,
    });
  };
  const notFound =
    !id ||
    (!query.isPending && !query.isError && !question) ||
    (query.error instanceof QuestionAnswerUiError &&
      ['TARGET_NOT_FOUND_OR_INACCESSIBLE', 'INVALID_INPUT'].includes(
        query.error.key,
      ));
  return (
    <div className="app-container min-h-[100dvh] bg-app-page pb-28">
      <SubPageHeader
        title="问题详情"
        variant="content"
        onBack={back}
        right={
          question ? (
            <Button
              variant="ghost"
              className="h-11 w-11 p-0 text-slate-600"
              aria-label="分享问题"
              onClick={() => void share()}
            >
              <Share2 size={18} />
            </Button>
          ) : undefined
        }
      />
      {notFound ? (
        <div className="px-4 py-16">
          <h2 className="text-lg font-semibold text-slate-800">
            问题不存在或暂时无法访问
          </h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            链接可能已失效，或内容已不可见。
          </p>
          <Button
            variant="ghost"
            className="mt-4 h-11 text-app-action"
            onClick={back}
          >
            返回
          </Button>
        </div>
      ) : query.isError ? (
        <div role="alert" className="px-4 py-16">
          <h2 className="text-lg font-semibold text-slate-800">
            问题暂时加载失败
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            网络或服务似乎遇到了问题，请稍后重试。
          </p>
          <Button
            variant="ghost"
            className="mt-4 h-11 text-app-action"
            onClick={() => void query.refetch()}
          >
            重试
          </Button>
        </div>
      ) : query.isPending ? (
        <ContentSkeleton />
      ) : question ? (
        <main className="px-4">
          <section className="border-b border-app-border-subtle py-6">
            <PersonSummary
              person={question.requester}
              personId={question.requesterPersonId}
              createdAt={question.createdAt}
              onOpenPerson={openPerson}
            />
            <h1 className="mt-5 break-words text-[22px] font-semibold leading-8 text-slate-900">
              {question.title}
            </h1>
            <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-slate-700">
              {question.context}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-slate-500">
              <span>
                {
                  PRODUCT_CHANNEL_CATALOG.find(
                    (channel) => channel.slug === question.primaryChannel,
                  )?.label
                }
              </span>
              <span>{question.answerCount} 个回答</span>
              <span>{question.status === 'closed' ? '已关闭' : '开放中'}</span>
            </div>
            {question.deepExchangeBudgetMaxCents !== null ? (
              <div className="mt-4 border-l-2 border-app-action/20 pl-3">
                <p className="text-sm text-slate-700">
                  深入交流预算 最高 ¥
                  {formatBudgetCents(question.deepExchangeBudgetMaxCents)}
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  仅表示后续深入交流意愿，公开回答仍然免费。
                </p>
              </div>
            ) : null}
            {question.status === 'closed' ? (
              <p className="mt-4 text-sm leading-6 text-slate-500">
                问题已关闭，仍可查看已有回答。
              </p>
            ) : null}
            <div className="mt-3 flex items-center justify-end gap-2">
              <Button
                variant="ghost"
                className="h-11 gap-1.5 px-2 text-xs text-slate-500"
                aria-label="举报问题"
                disabled={report.isPending}
                onClick={submitReport}
              >
                <Flag size={14} />
                {report.isPending ? '提交中…' : '举报'}
              </Button>
              {viewer === question.requesterPersonId &&
              question.status === 'open' ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-11 w-11 p-0 text-slate-500"
                      aria-label="问题管理"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="min-h-11"
                      onSelect={() => setCloseOpen(true)}
                    >
                      关闭问题
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}
            </div>
            {actionError && (
              <p role="alert" className="text-sm text-red-700">
                {actionError}
              </p>
            )}
          </section>
          <section className="py-6" aria-label="公开回答">
            <header className="mb-5 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-semibold text-slate-900">
                {question.answerCount} 个回答
              </h2>
              <div className="flex" aria-label="回答排序">
                {(
                  [
                    { value: 'comprehensive', label: '综合' },
                    { value: 'latest', label: '最新' },
                  ] as const
                ).map((item) => (
                  <Button
                    key={item.value}
                    variant="ghost"
                    className={`h-11 px-3 text-xs ${order === item.value ? 'text-app-action' : 'text-slate-500'}`}
                    aria-pressed={order === item.value}
                    onClick={() => {
                      setOrder(item.value);
                      saveSession(`${stateKey}:order`, item.value);
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
            </header>
            {answersQuery.isPending ? (
              <p
                role="status"
                className="animate-pulse py-5 text-sm text-slate-500"
              >
                正在加载回答…
              </p>
            ) : null}
            {answersQuery.isError ? (
              <div role="alert" className="mb-4 text-sm text-slate-600">
                回答暂时无法加载。
                <Button
                  variant="ghost"
                  className="h-11 text-app-action"
                  onClick={() => void answersQuery.refetch()}
                >
                  重试
                </Button>
              </div>
            ) : null}
            {!answersQuery.isPending &&
            !answersQuery.isError &&
            answersQuery.data?.pages[0]?.answers.length === 0 ? (
              <div className="py-6">
                <h3 className="font-semibold text-slate-800">还没有回答</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  如果你经历过类似的事，可以分享你的经验。
                </p>
                {question.status === 'open' ? (
                  <Button
                    variant="ghost"
                    className="mt-3 h-11 px-0 text-app-action"
                    onClick={beginAnswer}
                  >
                    我来回答
                  </Button>
                ) : null}
              </div>
            ) : null}
            <AnswerList
              answers={
                answersQuery.data?.pages.flatMap((page) => page.answers) ?? []
              }
              viewer={viewer}
              closed={question.status === 'closed'}
              onAuth={auth}
              onOpenPerson={openPerson}
            />
            {answersQuery.hasNextPage ? (
              <Button
                variant="ghost"
                className="mt-4 h-11 w-full text-app-action"
                disabled={answersQuery.isFetchingNextPage}
                onClick={() => void answersQuery.fetchNextPage()}
              >
                {answersQuery.isFetchingNextPage ? '加载中…' : '加载更多回答'}
              </Button>
            ) : null}
          </section>
          {question.status === 'open' ? (
            <BottomBar
              onAnswer={beginAnswer}
              loading={createAnswer.isPending}
            />
          ) : null}
          <AnswerDialog
            open={answerOpen}
            onOpenChange={setAnswerOpen}
            onSubmit={(payload) => void submitAnswer(payload)}
            submitting={createAnswer.isPending}
            error={answerError}
            disabled={question.status === 'closed'}
          />
          <QuestionActionConfirm
            open={closeOpen}
            onOpenChange={setCloseOpen}
            title="关闭这个问题？"
            description="关闭后不能再新增回答或回复，现有内容仍保留。当前版本不支持重新打开。"
            pending={close.isPending}
            onConfirm={() => void closeQuestion()}
          />
        </main>
      ) : null}
    </div>
  );
};
const QuestionDetail = () => {
  const { id = '' } = useParams();
  const { viewer, loading } = useQuestionAnswerViewer();
  if (loading)
    return (
      <div className="app-container min-h-screen bg-app-page">
        <SubPageHeader title="问题详情" variant="content" />
        <ContentSkeleton />
      </div>
    );
  return (
    <QuestionContent
      key={`${id}:${viewer ?? 'anon'}`}
      id={id}
      viewer={viewer}
    />
  );
};
export default QuestionDetail;
