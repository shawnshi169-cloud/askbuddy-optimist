import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { MessageCircle, Heart, Send, Users, Loader2, Trash2, Star } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { TOPIC_PUBLISH_UNAVAILABLE_MESSAGE, useTopicDetail, useCreateDiscussion, useToggleDiscussionLike, useDeleteDiscussion } from '@/hooks/useHotTopics';
import { useIsFollowingTopic, useToggleTopicFollow } from '@/hooks/useTopicFollowers';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import PageStateCard from '@/components/common/PageStateCard';
import { navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import SubPageHeader from '@/components/layout/SubPageHeader';

const TopicDetail = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [newComment, setNewComment] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const fromHotRank = Boolean((location.state as { fromHotRank?: boolean } | null)?.fromHotRank);

  const { data, isLoading, error } = useTopicDetail(topicId || '');
  const createDiscussion = useCreateDiscussion();
  const toggleLike = useToggleDiscussionLike();
  const deleteDiscussion = useDeleteDiscussion();
  const { data: isFollowing } = useIsFollowingTopic(topicId || '');
  const toggleFollow = useToggleTopicFollow();

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

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !topicId) return;

    try {
      await createDiscussion.mutateAsync({
        topic_id: topicId,
        content: newComment.trim()
      });
      setNewComment('');
    } catch {
      // The mutation renders the canonical unavailable/error state and keeps the draft.
    }
  };

  const handleLike = (discussionId: string) => {
    if (!topicId) return;
    toggleLike.mutate({ discussionId, topicId });
  };

  const handleDelete = (discussionId: string) => {
    if (!topicId) return;
    setPendingDeleteId(discussionId);
  };

  const handleBack = () => {
    if (fromHotRank) {
      sessionStorage.setItem('page-scroll-memory:index', '0');
      navigate('/', { replace: true });
      return;
    }
    navigateBackOr(navigate, '/', { location });
  };

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-white via-slate-50/80 to-slate-50 flex items-center justify-center p-4">
        <PageStateCard variant="loading" title="正在加载专题内容…" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-white via-slate-50/80 to-slate-50 flex items-center justify-center p-4">
        <PageStateCard
          variant="error"
          title="暂时无法打开专题"
          description="内容可能已下线，或当前链接已失效。"
          actionLabel="返回上页"
          onAction={handleBack}
        />
      </div>
    );
  }

  const { topic, discussions } = data;
  const articleBody = topic.description?.split(/\n+/).filter(Boolean) || [];
  const contentBlocks = articleBody.length > 0
    ? articleBody
    : [
        `这是「${topic.title}」专题页，你可以把它当作一篇会持续更新的内容推文来阅读。`,
        '上方是本期主题摘要，下方则是所有用户围绕这个主题发起的评论和讨论。',
        '如果你也有经验、观点或补充材料，可以直接在底部输入框继续参与。',
      ];

  return (
    <div className="app-container min-h-[100dvh] bg-gradient-to-b from-white via-slate-50/80 to-slate-50 pb-24">
      <SubPageHeader title={topic.title} onBack={handleBack} headerClassName="border-white/10 bg-app-teal" />

      <div className="px-4 pt-4">
        <div className="surface-card rounded-3xl overflow-hidden">
          {topic.cover_image ? (
            <div className="h-44">
              <img
                src={topic.cover_image}
                alt={topic.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-36 bg-gradient-to-r from-teal-100 via-cyan-100 to-white" />
          )}

          <div className="p-5">
          <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
            问问热榜专题
          </span>
          <h2 className="mt-4 text-[21px] font-semibold leading-8 text-slate-900">{topic.title}</h2>
          <p className="mt-3 text-[15px] leading-7 text-slate-600">
            {topic.description || '这是一篇围绕某个热点主题持续更新的内容推文，欢迎你阅读后在下方继续评论讨论。'}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <MessageCircle size={16} />
              {topic.discussions_count} 条讨论
            </span>
            <span className="flex items-center gap-1">
              <Users size={16} />
              {topic.participants_count} 人参与
            </span>
            <span>{formatTime(topic.updated_at)}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {user ? (
              <Button
                variant={isFollowing ? 'default' : 'secondary'}
                size="sm"
                onClick={() => {
                  if (topicId) {
                    toggleFollow.mutate(topicId, {
                      onSuccess: (followed) => {
                        toast.success(followed ? '已关注话题' : '已取消关注');
                      }
                    });
                  }
                }}
                disabled={toggleFollow.isPending}
                className="rounded-full"
              >
                <Star size={14} className={cn('mr-1', isFollowing && 'fill-current')} />
                {isFollowing ? '已关注专题' : '关注专题'}
              </Button>
            ) : null}
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              阅读 2 分钟
            </span>
          </div>
          </div>
        </div>
      </div>

      <div className="px-4 mt-5">
        <div className="surface-card rounded-3xl p-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-semibold">专题正文</h3>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
              类似推文阅读
            </span>
          </div>
          <div className="mt-4 space-y-4 text-[15px] leading-8 text-slate-700">
            {contentBlocks.map((block, index) => (
              <p key={`${topic.id}-block-${index}`}>{block}</p>
            ))}
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">继续阅读</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                浏览专题正文后，继续往下看评论区，快速了解不同观点和补充经验。
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-900">相关话题</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {['申请经验', '效率提升', '真实分享'].map((item) => (
                  <span key={item} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 border border-slate-200">
                    #{item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Discussions */}
      <div className="mt-5 px-4">
        <div className="surface-card rounded-3xl overflow-hidden">
        <div className="border-b px-4 py-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold">评论讨论 ({discussions.length})</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">正文在上面，评论区在下面，阅读和讨论分层更清晰。</p>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1 text-xs">
              <span className="rounded-full bg-white px-3 py-1 text-slate-700 shadow-sm">按热度</span>
              <span className="px-3 py-1 text-slate-500">最新</span>
            </div>
          </div>
        </div>

        {discussions.length === 0 ? (
          <div className="p-4">
            <PageStateCard
              compact
              title="还没有评论"
              description="你可以先来发第一条评论。"
              icon={<MessageCircle className="mx-auto h-10 w-10 text-muted-foreground/30" />}
            />
          </div>
        ) : (
          <div className="divide-y">
            {discussions.map((discussion) => (
              <div key={discussion.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={discussion.profile_avatar || undefined} />
                    <AvatarFallback>
                      {(discussion.profile_nickname || '匿')[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">
                        {discussion.profile_nickname || '匿名用户'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(discussion.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                      {discussion.content}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <button
                        onClick={() => handleLike(discussion.id)}
                        className={cn(
                          "flex items-center gap-1 text-sm transition-colors",
                          discussion.is_liked
                            ? "text-red-500"
                            : "text-muted-foreground hover:text-red-500"
                        )}
                      >
                        <Heart
                          size={16}
                          className={discussion.is_liked ? "fill-current" : ""}
                        />
                        {discussion.likes_count > 0 && discussion.likes_count}
                      </button>
                      {user?.id === discussion.user_id && (
                        <button
                          onClick={() => handleDelete(discussion.id)}
                          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Comment Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 safe-area-inset-bottom">
        {user ? (
          <div className="flex items-end gap-2">
            <Textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={TOPIC_PUBLISH_UNAVAILABLE_MESSAGE}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              rows={1}
            />
            <Button
              onClick={handleSubmitComment}
              disabled={!newComment.trim() || createDiscussion.isPending}
              size="icon"
              className="shrink-0"
            >
              {createDiscussion.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send size={18} />
              )}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => navigateToAuthWithReturn(navigate, location)}
            className="w-full"
            variant="outline"
          >
            登录后继续讨论
          </Button>
        )}
      </div>

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>删除这条评论？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后将无法恢复，请确认是否继续。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full">取消</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (!topicId || !pendingDeleteId) return;
                deleteDiscussion.mutate({ discussionId: pendingDeleteId, topicId });
                setPendingDeleteId(null);
              }}
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TopicDetail;
