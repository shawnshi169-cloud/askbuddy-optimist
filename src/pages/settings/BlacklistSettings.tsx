import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import SubPageHeader from '@/components/layout/SubPageHeader';

const BlacklistSettings = () => (
  <main className="min-h-[100dvh] bg-app-page pb-[calc(env(safe-area-inset-bottom)+2rem)]">
    <SubPageHeader title="黑名单管理" variant="content" />
    <div className="p-4">
      <Card className="rounded-[20px] border-app-border-subtle shadow-sm">
        <CardContent className="space-y-3 p-5">
          <h2 className="text-base font-semibold text-foreground">黑名单功能暂不可用</h2>
          <p className="text-sm leading-6 text-muted-foreground">
            当前未提供可核实的黑名单和屏蔽管理能力。本页不展示用户列表，也不能屏蔽用户或解除屏蔽。
          </p>
          <p className="text-sm leading-6 text-muted-foreground">这不表示你的黑名单为空。</p>
        </CardContent>
      </Card>
    </div>
  </main>
);

export default BlacklistSettings;
