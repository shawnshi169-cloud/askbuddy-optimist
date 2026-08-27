import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AtSign, MessageCircleMore, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useMyFollowing } from '@/hooks/useProfileData';
import SubPageHeader from '@/components/layout/SubPageHeader';
import PageStateCard from '@/components/common/PageStateCard';
import { buildFromState } from '@/utils/navigation';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

type GroupFilter = 'all' | 'unread' | 'mention';

interface CommunityGroup {
  id: string;
  name: string;
  members: number;
  topic: string;
  avatarUrl: string;
  lastSender: string;
  lastMessage: string;
  timeLabel: string;
  unread: number;
  mentionCount: number;
  role: 'owner' | 'admin' | 'member';
  muted: boolean;
}

const MyCommunity = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: following, isLoading, error, refetch } = useMyFollowing();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<GroupFilter>('all');
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  usePageScrollMemory('profile-community');

  const groups = useMemo(() => {
    if (!presentationFixturesEnabled) return [];
    const baseGroups: CommunityGroup[] = (following || []).slice(0, 8).map((item, index: number) => ({
      id: item.following_id,
      name: `${item.profile?.nickname || '问友'}交流群`,
      members: 80 + index * 37,
      topic: index % 2 === 0 ? '经验分享' : '资料互助',
      lastSender: index % 2 === 0 ? '群主' : item.profile?.nickname || '问友',
      lastMessage: item.profile?.bio || '一起来交流经验、资源和最新动态。',
      timeLabel: index === 0 ? '刚刚' : index < 3 ? '今天' : '昨天',
      unread: index === 0 ? 3 : index === 1 ? 1 : 0,
      mentionCount: index === 0 ? 1 : 0,
      role: index === 0 ? 'owner' : index === 1 ? 'admin' : 'member',
      muted: index === 4,
      avatarUrl: item.profile?.avatar_url || '',
    }));

    const fallbackGroups: CommunityGroup[] = [
      {
        id: 'product',
        name: '产品设计交流群',
        members: 128,
        topic: '作品交流',
        lastSender: '张三',
        lastMessage: '大家有推荐的设计协同工具吗？',
        timeLabel: '10:30',
        unread: 5,
        mentionCount: 1,
        role: 'owner',
        muted: false,
        avatarUrl: '',
      },
      {
        id: 'frontend',
        name: '前端开发学习小组',
        members: 256,
        topic: '技术学习',
        lastSender: '李四',
        lastMessage: '我把这周 Vue3 学习资料整理到群文件了。',
        timeLabel: '昨天',
        unread: 0,
        mentionCount: 0,
        role: 'admin',
        muted: true,
        avatarUrl: '',
      },
      {
        id: 'career',
        name: '求职信息共享',
        members: 512,
        topic: '求职内推',
        lastSender: '王五',
        lastMessage: '最近大厂春招内推汇总更新了，置顶可看。',
        timeLabel: '昨天',
        unread: 12,
        mentionCount: 0,
        role: 'member',
        muted: false,
        avatarUrl: '',
      },
    ];

    const merged = baseGroups.length > 0 ? baseGroups : fallbackGroups;
    return merged
      .filter((group) => {
        const keyword = search.trim().toLowerCase();
        if (!keyword) return true;
        return (
          group.name.toLowerCase().includes(keyword) ||
          group.lastMessage.toLowerCase().includes(keyword)
        );
      })
      .filter((group) => {
        if (filter === 'unread') return group.unread > 0;
        if (filter === 'mention') return group.mentionCount > 0;
        return true;
      });
  }, [following, search, filter, presentationFixturesEnabled]);

  const unreadCount = groups.reduce((sum, group) => sum + group.unread, 0);
  const mentionCount = groups.reduce((sum, group) => sum + group.mentionCount, 0);

  return (
    <div className="min-h-[100dvh] bg-muted pb-8">
      <SubPageHeader title="我的社群" />

      {presentationFixturesEnabled && isLoading ? (
        <div className="px-4 pt-5">
          <PageStateCard variant="loading" compact title="正在加载群聊会话…" />
        </div>
      ) : presentationFixturesEnabled && error ? (
        <div className="px-4 pt-5">
          <PageStateCard
            variant="error"
            compact
            title="群聊会话加载失败"
            description={error instanceof Error ? error.message : '请检查网络后重试'}
            actionLabel="重试"
            onAction={() => refetch()}
          />
        </div>
      ) : (
        <div className="space-y-4 px-4 pt-4">
          <div className="surface-card rounded-3xl p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">群聊会话</p>
              <span className="text-xs text-muted-foreground">{groups.length} 个群</span>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="搜索群名或消息内容"
                  className="h-11 rounded-2xl border-slate-200 bg-white pl-9 shadow-sm focus:border-app-teal/30 focus-visible:ring-0"
                />
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`rounded-full px-3 py-1.5 text-xs font-medium ${filter === 'all' ? 'app-soft-surface-bg app-accent-text' : 'bg-slate-100 text-slate-500'}`}
              >
                全部
              </button>
              <button
                type="button"
                onClick={() => setFilter('unread')}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${filter === 'unread' ? 'app-soft-surface-bg app-accent-text' : 'bg-slate-100 text-slate-500'}`}
              >
                <MessageCircleMore size={12} />
                未读 {unreadCount > 0 ? unreadCount : ''}
              </button>
              <button
                type="button"
                onClick={() => setFilter('mention')}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium ${filter === 'mention' ? 'app-soft-surface-bg app-accent-text' : 'bg-slate-100 text-slate-500'}`}
              >
                <AtSign size={12} />
                @我 {mentionCount > 0 ? mentionCount : ''}
              </button>
            </div>
          </div>

          {groups.length > 0 ? (
            <div className="space-y-2 pb-4">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="surface-card rounded-3xl border-none shadow-sm"
                >
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => navigate(`/profile/community/${group.id}`, { state: { ...buildFromState(location), group } })}
                  >
                    <CardContent className="p-3.5">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 rounded-2xl">
                          <AvatarImage src={group.avatarUrl} />
                          <AvatarFallback className="app-header-soft-bg app-accent-text rounded-2xl">
                            {group.name[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-[15px] font-semibold text-foreground">{group.name}</div>
                              <div className="mt-1 truncate text-sm text-muted-foreground">
                                <span className="font-medium text-slate-600">{group.lastSender}：</span>
                                {group.lastMessage}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className="text-xs text-muted-foreground">{group.timeLabel}</span>
                              {group.unread > 0 && (
                                <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[11px] font-medium text-white">
                                  {group.unread > 99 ? '99+' : group.unread}
                                </span>
                              )}
                              {group.mentionCount > 0 && (
                                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-500">
                                  @{group.mentionCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-muted-foreground">
                            {group.members} 人 · {group.muted ? '消息免打扰' : '消息提醒中'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </button>
                </Card>
              ))}
            </div>
          ) : (
            <PageStateCard
              compact
              title={presentationFixturesEnabled ? '没有匹配的群聊' : '社群功能暂未开放'}
              description={presentationFixturesEnabled ? '试试切换筛选条件或搜索其他关键词。' : '当前没有可用的真实社群数据。'}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default MyCommunity;
