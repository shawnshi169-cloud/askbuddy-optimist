import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { AcceptAnswerV2Result } from '../../packages/shared-api/src/rpc-catalog';

export const useAcceptAnswer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ answerId, questionId }: { answerId: string; questionId: string }) => {
      const { data, error } = await supabase.rpc('accept_answer_v2', {
        p_answer_id: answerId,
        p_question_id: questionId,
      });
      if (error) throw error;

      const result = data as unknown as AcceptAnswerV2Result | null;
      if (!result?.ok) throw new Error('采纳失败：服务端未确认操作成功');
      return result;
    },
    onSuccess: (_, { questionId }) => {
      queryClient.invalidateQueries({ queryKey: ['question', questionId] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
