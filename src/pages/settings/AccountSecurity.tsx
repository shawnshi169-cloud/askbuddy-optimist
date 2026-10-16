import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import { buildFromState, navigateToAuthWithReturn } from '@/utils/navigation';

const AccountSecurity = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading } = useAuth();

  const openPasswordChange = () => {
    if (loading) return;
    if (!user) {
      navigateToAuthWithReturn(navigate, location);
      return;
    }
    navigate('/settings/change-password', { state: buildFromState(location) });
  };

  return (
    <main className="min-h-[100dvh] bg-app-page pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <SubPageHeader title="账号与安全" variant="content" />
      <div className="space-y-4 p-4">
        <Card className="rounded-[20px] border-app-border-subtle shadow-sm">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-base font-semibold text-foreground">登录密码</h2>
            <p className="text-sm leading-6 text-muted-foreground">登录后可前往密码修改页面设置新密码。</p>
            <Button className="app-btn-primary min-h-11 w-full" disabled={loading} onClick={openPasswordChange}>
              {loading ? '正在确认登录状态…' : user ? '修改密码' : '登录后修改密码'}
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-app-border-subtle shadow-sm">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-base font-semibold text-foreground">暂不可用的账号功能</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              本页暂不展示手机号或第三方账号绑定状态，也不提供绑定管理和账号找回设置。
            </p>
            <Button
              variant="outline"
              className="app-btn-secondary min-h-11 w-full"
              onClick={() => navigate('/settings/login-activity', { state: buildFromState(location) })}
            >
              查看登录活动功能说明
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-[20px] border-app-border-subtle shadow-sm">
          <CardContent className="space-y-3 p-5">
            <h2 className="text-base font-semibold text-foreground">账号注销暂不可用</h2>
            <p className="text-sm leading-6 text-muted-foreground">
              当前没有可用的账号注销功能，无法在本页删除账号或数据。
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
};

export default AccountSecurity;
