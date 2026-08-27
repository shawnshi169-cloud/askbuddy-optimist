import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Heart, MessageCircle, Reply, Sparkles } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useMarkAllAsRead, useMarkAsRead, useNotifications } from '@/hooks/useNotifications';
import type { Notification } from '@/hooks/useNotifications';
import { formatTime } from '@/utils/format';
import PageStateCard from '@/components/common/PageStateCard';
import { buildFromState, navigateBackOr } from '@/utils/navigation';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

const socialTypes = new Set(['new_like', 'new_comment', 'comment_reply', 'new_answer']);

const presentationInteractionFixtures = [
  {
    id: 'demo-interaction-1',
    title: '测试留学顾问 赞了你的动态',
    content: '“英国硕士申请时间线应该怎么安排？” 这条动态收到了新的点赞',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    is_read: false,
    sender_nickname: '测试留学顾问',
    sender_avatar: 'https://randomuser.me/api/portraits/women/48.jpg',
    type: 'new_like',
  },
  {
    id: 'demo-interaction-2',
    title: '测试求职教练 评论了你',
    content: '“简历里可以把课程项目改成结果导向的描述，会更容易被看见。”',
    created_at: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
    is_read: true,
    sender_nickname: '测试求职教练',
    sender_avatar: 'https://randomuser.me/api/portraits/men/52.jpg',
    type: 'new_comment',
  },
  {
    id: 'demo-interaction-3',
    title: '3 位用户参与了你关注的话题',
    content: '“留学申请” 话题里有新的讨论，适合回去继续看看。',
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(),
    is_read: true,
    sender_nickname: null,
    sender_avatar: null,
    type: 'comment_reply',
  },
];

const iconMap = {
  new_like: { icon: Heart, color: 'text-pink-500', bg: 'bg-pink-50' },
  new_comment: { icon: MessageCircle, color: 'text-sky-500', bg: 'bg-sky-50' },
  comment_reply: { icon: Reply, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  new_answer: { icon: Sparkles, color: 'text-amber-500', bg: 'bg-amber-50' },
} as const;

type InteractionItem = Pick<
  Notification,
  'id' | 'title' | 'content' | 'created_at' | 'is_read' | 'related_type' | 'related_id' | 'sender_id' | 'sender_nickname' | 'sender_avatar' | 'type'
>;

const DiscoverInteractions = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    data: notifications = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useNotifications();
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const [presentationFixtureState, setPresentationFixtureState] = useState(presentationInteractionFixtures);

  const realInteractions = useMemo(() => {
    const filtered = notifications.filter((item) => socialTypes.has(item.type) || item.sender_id);
    return filtered;
  }, [notifications]);
  const usingPresentationFixtures = presentationFixturesEnabled
    && !isLoading
    && !isError
    && realInteractions.length === 0;
  const interactions: InteractionItem[] = usingPresentationFixtures
    ? presentationFixtureState
    : realInteractions;

  useEffect(() => {
    if (usingPresentationFixtures) setPresentationFixtureState(presentationInteractionFixtures);
  }, [usingPresentationFixtures]);

  const unreadCount = interactions.filter((item) => !item.is_read).length;

  const handleClick = (item: InteractionItem) => {
    if (!item.is_read) {
      if (usingPresentationFixtures) {
        setPresentationFixtureState((prev) => prev.map((entry) => (entry.id === item.id ? { ...entry, is_read: true } : entry)));
      } else {
        markAsRead.mutate(item.id);
      }
    }

    if (item.related_type === 'question' && item.related_id) {
      navigate(`/question/${item.related_id}`, { state: buildFromState(location) });
      return;
    }
    if (item.related_type === 'post' && item.related_id) {
      navigate('/discover', { state: buildFromState(location) });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-6">
      <SubPageHeader
        title="互动提醒"
        onBack={() => navigateBackOr(navigate, '/discover', { location })}
        right={
          unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (usingPresentationFixtures) {
                  setPresentationFixtureState((prev) => prev.map((entry) => ({ ...entry, is_read: true })));
                  return;
                }
                markAllAsRead.mutate();
              }}
              className="h-8 rounded-full bg-white/20 px-3 text-xs text-white hover:bg-white/25 hover:text-white"
            >
              <CheckCheck size={14} className="mr-1" />
              全部已读
            </Button>
          ) : (
            <div className="w-10" />
          )
        }
      />

      <div className="px-4 pt-4">
        <div className="app-header-soft-bg app-soft-border rounded-3xl border p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90">
              <Bell size={16} className="text-app-teal" />
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">社交互动提醒</div>
              <p className="mt-1 text-[11px] text-slate-500">点赞、评论、回复和话题互动会优先显示在这里</p>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">最新互动</h2>
            <p className="mt-1 text-xs text-slate-500">更贴近广场场景的即时反馈</p>
          </div>
          {unreadCount > 0 ? (
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-slate-500 shadow-sm">
              {unreadCount} 条未读
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-4 space-y-3 px-4">
        {isError ? (
          <PageStateCard
            variant="error"
            compact
            title="互动提醒加载失败"
            description={error instanceof Error ? error.message : '网络开小差了，请稍后重试。'}
            actionLabel="重试"
            onAction={() => {
              void refetch();
            }}
          />
        ) : isLoading && notifications.length === 0 ? (
          [1, 2, 3].map((item) => (
            <div key={item} className="surface-card rounded-3xl p-4 animate-pulse-soft">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded-full bg-slate-100" />
                  <div className="h-3 w-3/4 rounded-full bg-slate-100" />
                </div>
              </div>
            </div>
          ))
        ) : interactions.length === 0 ? (
          <PageStateCard
            compact
            title="还没有互动提醒"
            description="发动态、参与讨论后，新的点赞和评论会出现在这里。"
          />
        ) : (
          interactions.map((item) => {
            const style = iconMap[item.type as keyof typeof iconMap] || iconMap.new_comment;
            const Icon = style.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className={`surface-card flex w-full items-start gap-3 rounded-3xl border p-4 text-left transition-shadow hover:shadow-md ${
                  item.is_read ? 'border-slate-100' : 'app-soft-border app-soft-muted-bg'
                }`}
              >
                {item.sender_avatar ? (
                  <Avatar className="h-11 w-11 ring-2 ring-white">
                    <AvatarImage src={item.sender_avatar} />
                    <AvatarFallback>{(item.sender_nickname || '互')[0]}</AvatarFallback>
                  </Avatar>
                ) : (
                  <span className={`flex h-11 w-11 items-center justify-center rounded-full ${style.bg}`}>
                    <Icon size={18} className={style.color} />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{item.title}</div>
                      <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-600">{item.content}</p>
                    </div>
                    {!item.is_read ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-destructive" /> : null}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-400">{formatTime(item.created_at)}</div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};

export default DiscoverInteractions;
