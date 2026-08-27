import React, { useEffect, useState } from "react";
import Header from "@/components/question/Header";
import Tags from "@/components/question/Tags";
import Actions from "@/components/question/Actions";
import AnswerList from "@/components/question/AnswerList";
import ShareDialog from "@/components/question/ShareDialog";
import BottomBar from "@/components/question/BottomBar";
import AnswerDialog from "@/components/AnswerDialog";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuestionDetail, useCreateAnswer, useToggleFavorite } from "@/hooks/useQuestions";
import { useAcceptAnswer } from "@/hooks/useAcceptAnswer";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useSubmitContentReport } from '@/hooks/useModeration';
import { demoQuestionDetails } from '@/lib/demoData';
import PageStateCard from "@/components/common/PageStateCard";
import { buildFromState, navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import { copyTextToClipboard } from '@/utils/clipboard';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

// 分享选项
const SHARE_OPTIONS = [
  { id: "internal", name: "站内用户", icon: <Users size={20} className="text-primary" /> },
  { id: "wechat", name: "微信", icon: <div className="w-5 h-5 bg-green-500 rounded-md flex items-center justify-center text-white font-bold text-xs">W</div> },
  { id: "qq", name: "QQ", icon: <div className="w-5 h-5 bg-blue-400 rounded-md flex items-center justify-center text-white font-bold text-xs">Q</div> },
  { id: "douyin", name: "抖音", icon: <div className="w-5 h-5 bg-black rounded-md flex items-center justify-center text-white font-bold text-xs">抖</div> }
];

const QuestionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const requestedDemoQuestion = !!id?.startsWith('demo-question-');
  const isDemoQuestion = presentationFixturesEnabled && requestedDemoQuestion;

  // 获取问题数据
  const { data, isLoading, error } = useQuestionDetail(requestedDemoQuestion ? '' : id || '');
  const createAnswer = useCreateAnswer();
  const toggleFavorite = useToggleFavorite();
  const acceptAnswer = useAcceptAnswer();
  const submitReport = useSubmitContentReport();

  // 状态管理
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isAnswerDialogOpen, setIsAnswerDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [answerContent, setAnswerContent] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  // 格式化时间
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: zhCN 
      });
    } catch {
      return '刚刚';
    }
  };

  // 格式化浏览量
  const formatViewCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  if (requestedDemoQuestion && !presentationFixturesEnabled) {
    return (
      <div className="app-container min-h-[100dvh] bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white flex items-center justify-center p-4">
        <PageStateCard variant="error" title="演示问题不可用" description="当前运行环境未启用展示数据。" />
      </div>
    );
  }

  if (!requestedDemoQuestion && isLoading) {
    return (
      <div className="app-container min-h-[100dvh] bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white flex items-center justify-center p-4">
        <PageStateCard variant="loading" title="正在加载问题内容…" />
      </div>
    );
  }

  const demoData = isDemoQuestion ? demoQuestionDetails[id as keyof typeof demoQuestionDetails] : null;
  const resolvedData = isDemoQuestion ? demoData : data;

  if (error || !resolvedData) {
    return (
      <div className="app-container min-h-[100dvh] bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white flex items-center justify-center p-4">
        <PageStateCard
          variant="error"
          title="暂时无法加载问题"
          description="链接可能已失效，或当前网络不稳定。"
          actionLabel="返回上页"
          onAction={() => navigateBackOr(navigate, '/', { location })}
        />
      </div>
    );
  }

  const { question, answers } = resolvedData;

  // 回答弹窗提交
  const handleAnswerDialogSubmit = (payload: { timeSlots: string[]; message: string }) => {
    if (!user) {
      toast({ title: "请先登录", variant: "destructive" });
      navigateToAuthWithReturn(navigate, location);
      return;
    }

    if (!payload.message.trim()) {
      toast({ title: "请输入回答内容", variant: "destructive" });
      return;
    }

    if (isDemoQuestion) {
      toast({ title: '这是演示问题', description: '当前用于前端展示，回答提交流程已保留但不会写入真实数据。' });
      setIsAnswerDialogOpen(false);
      setAnswerContent('');
      return;
    }

    createAnswer.mutate({
      question_id: id!,
      content: payload.message
    }, {
      onSuccess: () => {
        setIsAnswerDialogOpen(false);
        setAnswerContent('');
      }
    });
  };

  // 收藏操作
  const handleCollect = () => {
    if (!user) {
      toast({ title: "请先登录", variant: "destructive" });
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    if (isDemoQuestion) {
      toast({ title: '这是演示问题', description: '收藏流程在真实问题上可正常使用。' });
      return;
    }
    toggleFavorite.mutate(id!);
  };

  // 分享弹窗
  const handleShareDialog = () => setIsShareDialogOpen(true);

  // 分享
  const handleShareQuestion = async (_optionId: string) => {
    try {
      await copyTextToClipboard(window.location.href);
      setIsShareDialogOpen(false);
      toast({ title: '分享链接已复制' });
    } catch (shareError) {
      toast({
        title: '分享失败',
        description: shareError instanceof Error ? shareError.message : '无法复制分享链接',
        variant: 'destructive',
      });
    }
  };

  const handleReportQuestion = () => {
    if (!user) {
      toast({ title: "请先登录", variant: "destructive" });
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    if (isDemoQuestion) {
      toast({ title: '这是演示问题', description: '演示问题不需要举报。' });
      return;
    }

    submitReport.mutate({
      targetId: question.id,
      targetType: 'question',
      reason: '疑似违规或垃圾内容',
      details: `来自问题详情页：${question.title}`,
    });
  };

  // 查看用户资料
  const handleViewUserProfile = (userId: string) => {
    navigate(`/expert-profile/${userId}`, { state: buildFromState(location) });
  };

  // 回复
  const handleReply = (answerId: string) => {
    toast({ title: `回复回答` });
  };

  // 采纳回答
  const handleAcceptAnswer = (answerId: string) => {
    if (!user) {
      toast({ title: "请先登录", variant: "destructive" });
      return;
    }
    acceptAnswer.mutate({ answerId, questionId: id! }, {
      onSuccess: () => {
        toast({ title: "已采纳回答，积分已转移" });
      },
      onError: (error: Error) => {
        toast({ title: error.message || "采纳失败", variant: "destructive" });
      }
    });
  };

  const isQuestionOwner = user?.id === question.user_id;
  const hasAcceptedAnswer = answers.some(a => a.is_accepted);

  // 转换回答数据格式
  const formattedAnswers = answers.map(answer => ({
    id: answer.id,
    name: answer.profile_nickname || '匿名用户',
    avatar: answer.profile_avatar || null,
    title: '回答者',
    content: answer.content,
    time: formatTime(answer.created_at),
    viewCount: answer.likes_count,
    best: answer.is_accepted
  }));

  return (
    <div className="app-container bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white pb-24 min-h-[100dvh]">
      <Header
        title="问题详情"
        asker={{
          name: question.profile_nickname || '匿名用户',
          avatar: question.profile_avatar || null,
          id: question.user_id
        }}
        time={formatTime(question.created_at)}
        viewCount={formatViewCount(question.view_count)}
        points={question.bounty_points}
        onBack={() => navigateBackOr(navigate, '/', { location })}
        onViewUser={handleViewUserProfile}
      />
      <div className="mx-4 mb-5 mt-4 surface-card rounded-3xl p-5 animate-fade-in">
        <div className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">问题正文</div>
        <h1 className="mt-3 text-[21px] font-bold leading-8 text-gray-800 text-left">{question.title}</h1>
        <div className="mt-4 text-[15px] text-gray-700 leading-7 text-left mb-5">
          {question.content && question.content.length > 100 && !isDescriptionExpanded ? (
            <>
              <p>{question.content.substring(0, 100)}...</p>
              <button
                className="text-primary text-xs mt-2 hover:underline flex items-center"
                onClick={() => setIsDescriptionExpanded(true)}
                aria-label="展开全部描述"
              >
                展开全部
              </button>
            </>
          ) : (
            <>
              <p>{question.content || '暂无详细描述'}</p>
              {question.content && question.content.length > 100 && (
                <button
                  className="text-primary text-xs mt-2 hover:underline flex items-center"
                  onClick={() => setIsDescriptionExpanded(false)}
                  aria-label="收起描述"
                >
                  收起
                </button>
              )}
            </>
          )}
        </div>
        <Tags tags={question.tags || []} />
        <div className="mt-5">
          <Actions onCollect={handleCollect} onShare={handleShareDialog} />
        </div>
        <div className="mt-4 flex justify-end">
          <button
            className="text-xs text-muted-foreground hover:text-foreground"
            onClick={handleReportQuestion}
            disabled={submitReport.isPending}
          >
            {submitReport.isPending ? '提交中...' : '举报内容'}
          </button>
        </div>
      </div>
      <div className="px-4 mb-5">
        <div className="surface-card rounded-3xl p-5">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="font-semibold text-lg text-left text-slate-900">回答 ({answers.length})</h2>
            <p className="mt-1 text-xs text-slate-500">优先查看高质量回答，再决定是否继续补充提问。</p>
          </div>
          <button
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-primary flex items-center"
            aria-label="按热度排序"
          >
            按热度排序
          </button>
        </div>
        {formattedAnswers.length > 0 ? (
          <AnswerList
            answers={formattedAnswers}
            onViewUser={handleViewUserProfile}
            onReply={handleReply}
            onAccept={handleAcceptAnswer}
            canAccept={isQuestionOwner && !hasAcceptedAnswer}
          />
        ) : (
          <PageStateCard compact title="还没有回答" description="你可以成为第一个回答的人。" />
        )}
        </div>
      </div>
      <BottomBar
        onAnswer={() => setIsAnswerDialogOpen(true)}
        onInvite={handleShareDialog}
        loading={createAnswer.isPending}
      />
      <AnswerDialog
        open={isAnswerDialogOpen}
        onOpenChange={setIsAnswerDialogOpen}
        askerTimeSlots={[
          { id: "today14", label: "今天 14:00-15:00" },
          { id: "today19", label: "今天 19:00-20:00" },
          { id: "weekend", label: "周末可约" }
        ]}
        onSubmit={handleAnswerDialogSubmit}
      />
      <ShareDialog
        open={isShareDialogOpen}
        onOpenChange={setIsShareDialogOpen}
        options={SHARE_OPTIONS}
        onShare={handleShareQuestion}
      />
    </div>
  );
};
export default QuestionDetail;
