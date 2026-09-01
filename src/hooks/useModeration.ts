import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

export const useSubmitContentReport = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (params: {
      targetId: string;
      targetType: 'question' | 'answer' | 'discussion' | 'message' | 'profile';
      reason: string;
      details?: string;
    }) => {
      if (!user) {
        throw new Error('请先登录');
      }

      const { data, error } = await supabase.rpc('submit_content_report', {
        p_target_id: params.targetId,
        p_target_type: params.targetType,
        p_reason: params.reason,
        p_details: params.details || null,
      });

      if (error) {
        throw error;
      }

      return data as string;
    },
    onSuccess: () => {
      toast({ title: '举报已提交', description: '平台会尽快审核处理' });
    },
    onError: () => {
      toast({
        title: '举报失败',
        description: '举报暂时无法提交，请稍后重试。',
        variant: 'destructive',
      });
    },
  });
};
