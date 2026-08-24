import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type SkillOffer = Database['public']['Tables']['skill_offers']['Row'];
export type SkillCategory = Database['public']['Tables']['skill_categories']['Row'];

interface SaveSkillOfferInput {
  offerId?: string;
  categoryId?: string | null;
  title: string;
  description: string;
  priceAmount: number;
}

export const useSkillCategories = () =>
  useQuery({
    queryKey: ['skill-categories'],
    queryFn: async (): Promise<SkillCategory[]> => {
      const { data, error } = await supabase
        .from('skill_categories')
        .select('id, name, slug, parent_id, is_active, sort_order, created_at, updated_at')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
    staleTime: 5 * 60_000,
  });

export const useMyLatestSkillOffer = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-latest-skill-offer', user?.id],
    queryFn: async (): Promise<SkillOffer | null> => {
      if (!user) return null;

      const { data, error } = await supabase
        .from('skill_offers')
        .select('*')
        .eq('expert_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useSaveSkillOffer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: SaveSkillOfferInput): Promise<SkillOffer> => {
      if (!user) throw new Error('请先登录');

      const payload = {
        category_id: input.categoryId || null,
        title: input.title,
        description: input.description,
        pricing_mode: 'per_session',
        price_amount: input.priceAmount,
        price_currency: 'CNY',
        status: 'published',
        is_remote_supported: true,
        delivery_mode: 'online',
      } as const;

      if (input.offerId) {
        const { data, error } = await supabase
          .from('skill_offers')
          .update(payload)
          .eq('id', input.offerId)
          .eq('expert_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from('skill_offers')
        .insert({ expert_id: user.id, ...payload })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['my-latest-skill-offer', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['skill-offers'] });
      queryClient.invalidateQueries({ queryKey: ['experts'] });
      toast({
        title: variables.offerId ? '技能已更新' : '技能已发布',
        description: '服务信息已保存到技能供给列表。',
      });
    },
    onError: (error: Error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' });
    },
  });
};
