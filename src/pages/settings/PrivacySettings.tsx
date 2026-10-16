import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { buildFromState, navigateToAuthWithReturn } from '@/utils/navigation';

const PrivacySettings = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const openExperiences = () => {
    if (loading) return;
    if (!user) {
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    navigate('/profile/experiences', { state: buildFromState(location) });
  };

  return (
    <main className="min-h-[100dvh] bg-app-page pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <SubPageHeader title="隐私设置" variant="content" />
      <div className="space-y-4 p-4">
        <Card className="rounded-[20px] border-app-border-subtle shadow-sm">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-base font-semibold text-foreground">资料与互动隐私设置暂不可用</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              目前不提供个人主页、教育背景、工作资料或话题的可见性开关，也不提供关注、私信、活动与在线状态、已读回执或社交推荐控制。
            </p>
            <p className="text-sm leading-6 text-muted-foreground">
              此前保存的偏好不代表这些限制已经生效。本页不会更改或删除这些历史偏好。
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-app-border-subtle shadow-sm">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-base font-semibold text-foreground">单条经历的可见性</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              你可以在「我的经历」中，将自己的一条经历设为公开或私密。这只影响该条经历，不会改变整个个人主页的可见性。
            </p>
            <Button className="app-btn-primary min-h-11 w-full" disabled={loading} onClick={openExperiences}>
              {loading ? '正在确认登录状态…' : user ? '管理经历可见性' : '登录后管理经历可见性'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default PrivacySettings;
