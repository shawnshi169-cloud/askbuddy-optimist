import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { CONSULTATION_CAPABILITY } from '../../packages/shared-api/src/capabilities';

type ConsultationType = 'text' | 'voice' | 'video';

export const getConsultationAmount = (basePrice: number | null | undefined, type: ConsultationType) => {
  const safeBasePrice = Math.max(Number(basePrice || 50), 1);
  const multiplier = type === 'voice' ? 2 : type === 'video' ? 4 : 1;
  return safeBasePrice * multiplier;
};

export const CONSULTATION_UNAVAILABLE_MESSAGE = '咨询功能正在准备中';

export const useCreateConsultationOrder = () => {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (_input: { expertId: string; consultType: ConsultationType }) => {
      if (CONSULTATION_CAPABILITY.availability === 'unavailable') {
        throw new Error(CONSULTATION_UNAVAILABLE_MESSAGE);
      }

      throw new Error('咨询能力配置异常');
    },
    onError: (error: Error) => {
      toast({ title: '预约失败', description: error.message, variant: 'destructive' });
    },
  });
};
