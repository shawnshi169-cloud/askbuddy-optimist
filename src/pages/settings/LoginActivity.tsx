import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import SubPageHeader from '@/components/layout/SubPageHeader';

const LoginActivity = () => (
  <main className="min-h-[100dvh] bg-app-page pb-[calc(env(safe-area-inset-bottom)+2rem)]">
    <SubPageHeader title="登录活动" variant="content" />
    <div className="p-4">
      <Card className="rounded-[20px] border-app-border-subtle shadow-sm">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-base font-semibold text-foreground">登录设备记录暂不可用</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            当前无法在这里查看真实登录设备、地点或时间，也不能通过本页退出其他设备。
          </p>
          <p className="text-sm leading-6 text-muted-foreground">本页不提供账号安全检查结果。</p>
        </CardContent>
      </Card>
    </div>
  </main>
);

export default LoginActivity;
