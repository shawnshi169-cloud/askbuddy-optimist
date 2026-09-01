import React, { useEffect, useState } from 'react';
import { Bookmark, BookmarkCheck, Coins, Eye, Flag, MessageCircle, Share2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import AnswerDialog from '@/components/AnswerDialog';
import AnswerList, { type AnswerFeedItem } from '@/components/question/AnswerList';
import BottomBar from '@/components/question/BottomBar';
import Tags from '@/components/question/Tags';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAcceptAnswer } from '@/hooks/useAcceptAnswer';
import { useSubmitContentReport } from '@/hooks/useModeration';
import {
  useCreateAnswer,
  useQuestionDetail,
  useQuestionFavoriteState,
  useToggleFavorite,
} from '@/hooks/useQuestions';
import { useToast } from '@/hooks/use-toast';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';
import { demoQuestionDetails } from '@/lib/demoData';
import { buildFromState, navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import { copyTextToClipboard } from '@/utils/clipboard';

const formatTime = (dateString?: string | null) => {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true, locale: zhCN });
};

const QuestionDetailSkeleton = ({ onBack }: { onBack: () => void }) => (
  <div className="app-container min-h-[100dvh] bg-app-page pb-28">
    <SubPageHeader title="问题详情" variant="content" onBack={onBack} />
    <main className="animate-pulse px-4" aria-label="正在加载问题内容">
      <section className="border-b border-app-border-subtle py-6">
        <div className="h-4 w-28 rounded bg-slate-100" />
        <div className="mt-5 h-7 w-11/12 rounded bg-slate-100" />
        <div className="mt-3 h-7 w-3/4 rounded bg-slate-100" />
        <div className="mt-5 h-4 w-full rounded bg-slate-100" />
        <div className="mt-2 h-4 w-5/6 rounded bg-slate-100" />
      </section>
      <section className="py-6">
        <div className="h-5 w-24 rounded bg-slate-100" />
        {[0, 1].map((item) => (
          <div key={item} className="border-b border-app-border-subtle py-5 last:border-0">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-full bg-slate-100" />
              <div className="space-y-2">
                <div className="h-4 w-24 rounded bg-slate-100" />
                <div className="h-3 w-36 rounded bg-slate-100" />
              </div>
            </div>
            <div className="mt-4 h-4 w-full rounded bg-slate-100" />
            <div className="mt-2 h-4 w-4/5 rounded bg-slate-100" />
          </div>
        ))}
      </section>
    </main>
  </div>
);

const QuestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const requestedDemoQuestion = !!id?.startsWith('demo-question-');
  const isDemoQuestion = presentationFixturesEnabled && requestedDemoQuestion;
  const questionId = id || '';

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuestionDetail(requestedDemoQuestion ? '' : questionId);
  const createAnswer = useCreateAnswer();
  const toggleFavorite = useToggleFavorite();
  const favoriteState = useQuestionFavoriteState(isDemoQuestion ? '' : questionId);
  const acceptAnswer = useAcceptAnswer();
  const submitReport = useSubmitContentReport();
  const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState(false);

  const goBack = () => navigateBackOr(navigate, '/', { location });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  if (requestedDemoQuestion && !presentationFixturesEnabled) {
    return (
      <div className="app-container min-h-[100dvh] bg-app-page">
        <SubPageHeader title="问题详情" variant="content" onBack={goBack} />
        <main className="flex min-h-[65dvh] flex-col items-center justify-center px-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">演示问题不可用</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">当前运行环境未启用展示数据。</p>
          <Button type="button" variant="outline" className="mt-5 h-11 rounded-full px-6" onClick={goBack}>
            返回
          </Button>
        </main>
      </div>
    );
  }

  if (!requestedDemoQuestion && isLoading) {
    return <QuestionDetailSkeleton onBack={goBack} />;
  }

  const demoData = isDemoQuestion
    ? demoQuestionDetails[questionId as keyof typeof demoQuestionDetails]
    : null;
  const resolvedData = isDemoQuestion ? demoData : data;

  if (error || !resolvedData) {
    return (
      <div className="app-container min-h-[100dvh] bg-app-page">
        <SubPageHeader title="问题详情" variant="content" onBack={goBack} />
        <main className="flex min-h-[65dvh] flex-col items-center justify-center px-6 text-center">
          <h2 className="text-lg font-semibold text-slate-900">问题暂时加载失败</h2>
          <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
            网络或服务似乎遇到了问题，请稍后重试。
          </p>
          {!requestedDemoQuestion ? (
            <Button
              type="button"
              variant="action"
              className="mt-5 h-11 rounded-full px-7"
              onClick={() => void refetch()}
            >
              重试
            </Button>
          ) : null}
          <Button type="button" variant="ghost" className="mt-2 h-11 rounded-full px-6" onClick={goBack}>
            返回
          </Button>
        </main>
      </div>
    );
  }

  const { question, answers } = resolvedData;
  const questionAuthorId = ('author_id' in question && question.author_id)
    ? question.author_id
    : question.user_id;
  const questionTime = formatTime(question.created_at);
  const answerItems: AnswerFeedItem[] = answers.map((answer) => ({
    id: answer.id,
    name: answer.profile_nickname || '匿名用户',
    avatar: answer.profile_avatar || null,
    headline: 'expert_headline' in answer ? answer.expert_headline || null : null,
    content: answer.content,
    time: formatTime(answer.created_at),
    expertId: 'expert_id' in answer ? answer.expert_id || null : null,
    accepted: answer.is_accepted,
  }));

  const handleAnswerDialogSubmit = (payload: { message: string }) => {
    if (!user) {
      toast({ title: '请先登录', variant: 'destructive' });
      navigateToAuthWithReturn(navigate, location);
      return;
    }

    if (isDemoQuestion) {
      toast({
        title: '这是演示问题',
        description: '展示数据不会写入真实回答。',
      });
      setIsAnswerDialogOpen(false);
      return;
    }

    createAnswer.mutate({
      question_id: questionId,
      content: payload.message,
    }, {
      onSuccess: () => setIsAnswerDialogOpen(false),
    });
  };

  const handleCollect = () => {
    if (!user) {
      toast({ title: '请先登录', variant: 'destructive' });
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    if (isDemoQuestion) {
      toast({ title: '这是演示问题', description: '展示数据不会写入收藏。' });
      return;
    }
    toggleFavorite.mutate(questionId);
  };

  const handleShareQuestion = async () => {
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

  const handleReportQuestion = () => {
    if (!user) {
      toast({ title: '请先登录', variant: 'destructive' });
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    if (isDemoQuestion) {
      toast({ title: '这是演示问题', description: '展示数据不会提交举报。' });
      return;
    }

    submitReport.mutate({
      targetId: question.id,
      targetType: 'question',
      reason: '疑似违规或垃圾内容',
      details: `来自问题详情页：${question.title}`,
    });
  };

  const handleAcceptAnswer = (answerId: string) => {
    if (!user) {
      toast({ title: '请先登录', variant: 'destructive' });
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    acceptAnswer.mutate({ answerId, questionId }, {
      onSuccess: () => toast({ title: '已采纳回答' }),
      onError: () => toast({
        title: '采纳失败',
        description: '当前无法采纳这条回答，请稍后重试。',
        variant: 'destructive',
      }),
    });
  };

  const openPerson = (expertId: string) => {
    navigate(`/expert-profile/${expertId}`, { state: buildFromState(location) });
  };

  const isQuestionOwner = user?.id === questionAuthorId;
  const hasAcceptedAnswer = answers.some((answer) => answer.is_accepted);
  const acceptingAnswerId = acceptAnswer.isPending ? acceptAnswer.variables?.answerId || null : null;
  const tags = [...(question.tags || [])].slice(0, 4);

  return (
    <div className="app-container min-h-[100dvh] bg-app-page pb-28">
      <SubPageHeader
        title="问题详情"
        variant="content"
        onBack={goBack}
        right={(
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full text-slate-600 hover:bg-app-action-soft hover:text-app-action"
            onClick={() => void handleShareQuestion()}
            aria-label="复制问题分享链接"
          >
            <Share2 aria-hidden size={19} />
          </Button>
        )}
      />

      <main className="px-4">
        <section className="border-b border-app-border-subtle py-6" aria-labelledby="question-title">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={question.profile_avatar || undefined} alt={question.profile_nickname || '匿名用户'} />
              <AvatarFallback>{(question.profile_nickname || '匿').slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-800">
                {question.profile_nickname || '匿名用户'}
              </p>
              {questionTime ? <p className="mt-0.5 text-xs text-slate-400">{questionTime}</p> : null}
            </div>
          </div>

          <h1 id="question-title" className="mt-5 text-[22px] font-semibold leading-8 tracking-[-0.01em] text-slate-950">
            {question.title}
          </h1>

          {question.content ? (
            <p className="mt-4 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">
              {question.content}
            </p>
          ) : null}

          {tags.length > 0 ? <div className="mt-4"><Tags tags={tags} /></div> : null}

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <MessageCircle aria-hidden size={14} />
              {answers.length} 个回答
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Eye aria-hidden size={14} />
              {question.view_count ?? 0} 人看过
            </span>
            {question.bounty_points > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-700">
                <Coins aria-hidden size={14} />
                {question.bounty_points} 积分
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex items-center gap-1 border-t border-app-border-subtle pt-2">
            {(!user || !favoriteState.isError) ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-11 rounded-full px-3 text-xs text-slate-600 hover:bg-slate-50"
                onClick={handleCollect}
                disabled={toggleFavorite.isPending || (!!user && favoriteState.isLoading)}
                aria-label={favoriteState.data ? '取消收藏问题' : '收藏问题'}
              >
                {favoriteState.data ? (
                  <BookmarkCheck aria-hidden size={15} className="mr-1.5 text-app-action" />
                ) : (
                  <Bookmark aria-hidden size={15} className="mr-1.5" />
                )}
                {favoriteState.data ? '已收藏' : '收藏问题'}
              </Button>
            ) : null}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-11 rounded-full px-3 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700"
              onClick={handleReportQuestion}
              disabled={submitReport.isPending}
              aria-label="举报问题"
            >
              <Flag aria-hidden size={15} className="mr-1.5" />
              {submitReport.isPending ? '提交中…' : '举报'}
            </Button>
          </div>
        </section>

        <section className="py-6" aria-labelledby="answers-heading">
          <div className="mb-5">
            <h2 id="answers-heading" className="text-[17px] font-semibold text-slate-900">
              {answers.length} 个回答
            </h2>
          </div>

          {answerItems.length > 0 ? (
            <AnswerList
              answers={answerItems}
              onOpenPerson={openPerson}
              onAccept={handleAcceptAnswer}
              canAccept={isQuestionOwner && !hasAcceptedAnswer && !isDemoQuestion}
              acceptingAnswerId={acceptingAnswerId}
            />
          ) : (
            <div className="border-y border-app-border-subtle py-10 text-center">
              <h3 className="text-base font-semibold text-slate-800">还没有回答</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-500">
                如果你经历过类似的事，可以分享你的经验。
              </p>
            </div>
          )}
        </section>
      </main>

      <BottomBar
        onAnswer={() => setIsAnswerDialogOpen(true)}
        loading={createAnswer.isPending}
      />
      <AnswerDialog
        open={isAnswerDialogOpen}
        onOpenChange={setIsAnswerDialogOpen}
        onSubmit={handleAnswerDialogSubmit}
        submitting={createAnswer.isPending}
      />
    </div>
  );
};

export default QuestionDetail;
