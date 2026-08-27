
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useMyFollowing } from '@/hooks/useProfileData';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { Card, CardContent } from '@/components/ui/card';
import PageStateCard from '@/components/common/PageStateCard';
import { buildFromState } from '@/utils/navigation';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';

const MyFollowing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: following, isLoading, error, refetch } = useMyFollowing();
  usePageScrollMemory('profile-following');

  return (
    <div className="pb-8 min-h-[100dvh] bg-slate-50">
      <SubPageHeader title="我的关注" />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <PageStateCard variant="loading" compact title="正在加载关注…" className="w-full max-w-sm" />
        </div>
      ) : error ? (
        <div className="p-5 pt-6">
          <PageStateCard
            variant="error"
            title="关注列表加载失败"
            description={error instanceof Error ? error.message : '请检查网络后重试'}
            actionLabel="重试"
            onAction={() => refetch()}
          />
        </div>
      ) : following && following.length > 0 ? (
        <div className="p-4 space-y-4">
          {following.map((item) => (
            <Card
              key={item.following_id}
              className="surface-card rounded-3xl border-none shadow-sm"
            >
              <CardContent className="p-4">
                <button
                  type="button"
                  className="flex w-full items-center gap-3 text-left"
                  onClick={() => navigate(`/expert-profile/${item.following_id}`, { state: buildFromState(location) })}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={item.profile?.avatar_url || ''} />
                    <AvatarFallback>{item.profile?.nickname?.charAt(0) || '?'}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-medium text-slate-900">
                      {item.profile?.nickname || '未知用户'}
                    </h3>
                    <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                      {item.profile?.bio || '已关注，随时可以回到主页查看动态和服务信息。'}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-muted-foreground" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="p-5 pt-6">
          <PageStateCard
            title="暂未关注任何人"
            description="关注感兴趣的达人后，可以更快找到熟悉的主页和服务入口。"
            actionLabel="发现更多专家"
            onAction={() => navigate('/discover', { state: buildFromState(location) })}
            icon={<Users size={64} className="mx-auto text-muted-foreground/30" />}
          />
        </div>
      )}

    </div>
  );
};

export default MyFollowing;
