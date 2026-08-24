import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

export type SkillOffer = Database['public']['Tables']['skill_offers']['Row'];
export type SkillCategory = Database['public']['Tables']['skill_categories']['Row'];

interface CreateSkillOfferInput {
  categoryId?: string | null;
  title: string;
  description: string;
  priceAmount: number;
}

export const EXPERT_PROFILE_REQUIRED = 'EXPERT_PROFILE_REQUIRED';
export const EXPERT_PROFILE_REQUIRED_MESSAGE = '需要先完成专家/达人资料后才能发布技能';

class ExpertProfileRequiredError extends Error {
  readonly code = EXPERT_PROFILE_REQUIRED;

  constructor() {
    super(EXPERT_PROFILE_REQUIRED_MESSAGE);
    this.name = EXPERT_PROFILE_REQUIRED;
  }
}

const hasExpertProfile = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('experts')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data !== null;
};

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

export const useExpertProfilePrerequisite = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['expert-profile-prerequisite', user?.id],
    queryFn: async () => (user ? hasExpertProfile(user.id) : false),
    enabled: !!user,
    staleTime: 60_000,
  });
};

export const useCreateSkillOffer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSkillOfferInput): Promise<SkillOffer> => {
      if (!user) throw new Error('请先登录');

      if (!(await hasExpertProfile(user.id))) {
        throw new ExpertProfileRequiredError();
      }

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

      const { data, error } = await supabase
        .from('skill_offers')
        .insert({ expert_id: user.id, ...payload })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['skill-offers'] });
      queryClient.invalidateQueries({ queryKey: ['experts'] });
      toast({
        title: '技能已发布',
        description: '服务信息已保存到技能供给列表。',
      });
    },
    onError: (error: Error) => {
      toast({ title: '保存失败', description: error.message, variant: 'destructive' });
    },
  });
};
