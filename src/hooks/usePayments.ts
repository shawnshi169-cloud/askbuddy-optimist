import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { PAYMENT_CAPABILITIES } from '../../packages/shared-api/src/capabilities';

export type RechargeProvider = 'wechat' | 'alipay' | 'stripe';

export const PAYMENT_UNAVAILABLE_MESSAGE = '支付功能暂未开放';

export const useCreateRechargePayment = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (_params: { points: number; provider: RechargeProvider }) => {
      if (!user) {
        throw new Error('请先登录');
      }
      if (!PAYMENT_CAPABILITIES.wechatPrepay.productionReady) {
        throw new Error(PAYMENT_UNAVAILABLE_MESSAGE);
      }

      throw new Error('支付能力配置异常');
    },
    onError: (error: Error) => {
      toast({
        title: '创建支付单失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};
