
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Coins } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { usePointAccountBalance } from '@/hooks/useProfileData';
import { useToast } from '@/hooks/use-toast';
import { PAYMENT_UNAVAILABLE_MESSAGE, type RechargeProvider } from '@/hooks/usePayments';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import { PAYMENT_CAPABILITIES } from '../../../packages/shared-api/src/capabilities';

const RECHARGE_OPTIONS = [
  { amount: 10, price: '¥1', label: '10积分', popular: false },
  { amount: 50, price: '¥5', label: '50积分', popular: false },
  { amount: 100, price: '¥10', label: '100积分', popular: true },
  { amount: 200, price: '¥20', label: '200积分', popular: false },
  { amount: 500, price: '¥50', label: '500积分', popular: false },
  { amount: 1000, price: '¥100', label: '1000积分', popular: false },
];

const PAYMENT_PROVIDERS: Array<{ key: RechargeProvider; label: string; badge: string }> = [
  { key: 'wechat', label: '微信支付', badge: '推荐' },
  { key: 'alipay', label: '支付宝', badge: '稳定' },
  { key: 'stripe', label: 'Stripe', badge: '国际' },
];

const PointsRecharge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { data: availableBalance = 0 } = usePointAccountBalance();
  const { toast } = useToast();
  const [selected, setSelected] = useState<number>(100);
  const [selectedProvider, setSelectedProvider] = useState<RechargeProvider>('wechat');

  const handleRecharge = async () => {
    if (!user) {
      navigateToAuthWithReturn(navigate, location);
      return;
    }

    if (!PAYMENT_CAPABILITIES.wechatPrepay.productionReady) {
      toast({
        title: PAYMENT_UNAVAILABLE_MESSAGE,
        description: '当前不会创建支付单、扣款或修改积分。',
        variant: 'destructive',
      });
      return;
    }

    toast({ title: '支付能力配置异常', variant: 'destructive' });
  };

  const selectedOption = RECHARGE_OPTIONS.find(o => o.amount === selected);

  return (
    <div className="min-h-[100dvh] bg-muted pb-8">
      <SubPageHeader
        title="积分充值"
        onBack={() => navigateBackOr(navigate, '/profile/earnings', { location })}
      />

      {/* Balance Card */}
      <div className="p-4">
        <Card className="border-none bg-gradient-to-r from-[rgb(121,213,199)] to-[rgb(160,237,224)] text-white shadow-lg">
          <CardContent className="p-5">
            <div className="flex items-center mb-2">
              <Coins className="mr-2" size={20} />
              <span className="text-sm opacity-80">当前积分余额</span>
            </div>
            <div className="text-3xl font-bold">{availableBalance}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recharge Options */}
      <div className="px-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">选择充值金额</h3>
        <div className="grid grid-cols-3 gap-3">
          {RECHARGE_OPTIONS.map((option) => (
            <button
              key={option.amount}
              className={`relative rounded-2xl p-4 text-center transition-all border-2 ${
                selected === option.amount
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-background hover:border-primary/40'
              }`}
              onClick={() => setSelected(option.amount)}
            >
              {option.popular && (
                <span className="absolute -top-2 right-2 bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full font-medium">
                  推荐
                </span>
              )}
              <div className={`text-lg font-bold ${selected === option.amount ? 'text-primary' : 'text-foreground'}`}>
                {option.label}
              </div>
              <div className="text-sm text-muted-foreground mt-1">{option.price}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Payment Method */}
      <div className="px-4 mt-6">
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">支付方式</h3>
        <div className="space-y-3">
          {PAYMENT_PROVIDERS.map((provider) => (
            <button
              key={provider.key}
              type="button"
              className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                selectedProvider === provider.key
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-background'
              }`}
              onClick={() => setSelectedProvider(provider.key)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-foreground">{provider.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    支付单创建后等待第三方回调确认到账
                  </div>
                </div>
                <span className="rounded-full bg-muted px-2 py-1 text-[10px] font-medium">
                  {provider.badge}
                </span>
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground mt-2">* 不再点击即到账，积分会在支付回调确认后入账</p>
      </div>

      {/* Submit Button */}
      <div className="px-4 mt-8">
        <Button
          className="h-12 w-full rounded-2xl text-base font-semibold shadow-md"
          onClick={handleRecharge}
        >
          {`${PAYMENT_UNAVAILABLE_MESSAGE}（${selectedOption?.price} → ${selected}积分）`}
        </Button>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          当前不会创建订单、调用旧充值接口或修改积分。
        </p>
      </div>
    </div>
  );
};

export default PointsRecharge;
