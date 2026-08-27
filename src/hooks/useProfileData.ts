import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OrderRecord {
  id: string;
  buyer_id: string;
  seller_id: string | null;
  order_type: string;
  status: string;
  title: string | null;
  amount: number;
  point_amount: number;
  currency: string;
  created_at: string;
  paid_at: string | null;
}

export interface PointTransactionRecord {
  id: string;
  user_id: string;
  direction: 'credit' | 'debit';
  amount: number;
  biz_type: string;
  note: string | null;
  created_at: string;
}

export interface EarningTransactionRecord {
  id: string;
  user_id: string;
  direction: 'income' | 'expense' | 'adjustment';
  amount: number;
  status: 'pending' | 'available' | 'settled' | 'reversed';
  biz_type: string;
  note: string | null;
  created_at: string;
  settled_at: string | null;
}

export interface MyEarningsData {
  pointTransactions: PointTransactionRecord[];
  earningTransactions: EarningTransactionRecord[];
}

export interface FollowingWithProfile {
  follower_id: string;
  followee_id: string;
  following_id: string;
  created_at: string;
  profile: {
    user_id: string;
    nickname: string | null;
    avatar_url: string | null;
    bio: string | null;
  } | null;
}

export const usePointAccountBalance = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['point-account-balance', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { data, error } = await supabase
        .from('point_accounts')
        .select('available_balance')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return Number(data?.available_balance ?? 0);
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Profile stats aggregation
export const useProfileStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['profile-stats', user?.id],
    queryFn: async () => {
      if (!user) return { orders: 0, answers: 0, favorites: 0, following: 0 };

      const [ordersRes, answersRes, favoritesRes, followingRes] = await Promise.all([
        supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`),
        supabase.from('answers').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('favorites').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', user.id),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      if (answersRes.error) throw answersRes.error;
      if (favoritesRes.error) throw favoritesRes.error;
      if (followingRes.error) throw followingRes.error;

      return {
        orders: ordersRes.count ?? 0,
        answers: answersRes.count ?? 0,
        favorites: favoritesRes.count ?? 0,
        following: followingRes.count ?? 0,
      };
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// My favorites with question data
export const useMyFavorites = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-favorites', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: favorites, error } = await supabase
        .from('favorites')
        .select('*, questions(*)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return favorites || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// My answers with question data
export const useMyAnswers = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-answers', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data: answers, error } = await supabase
        .from('answers')
        .select('*, questions(id, title)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return answers || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// My orders
export const useMyOrders = (statusFilter?: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-orders', user?.id, statusFilter],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('orders')
        .select('*')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as OrderRecord[];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// My following with profile data
export const useMyFollowing = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-following', user?.id],
    queryFn: async (): Promise<FollowingWithProfile[]> => {
      if (!user) return [];

      const { data: following, error } = await supabase
        .from('follows')
        .select('*')
        .eq('follower_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (!following || following.length === 0) return [];

      const followingIds = Array.from(new Set(following.map((item) => item.followee_id)));
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url, bio')
        .in('user_id', followingIds);

      if (profileError) throw profileError;

      const profileMap = new Map((profiles || []).map((profile) => [profile.user_id, profile]));
      return following.map((item) => ({
        ...item,
        following_id: item.followee_id,
        profile: profileMap.get(item.followee_id) || null,
      }));
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// My earnings (points transactions)
export const useMyEarnings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['my-earnings', user?.id],
    queryFn: async () => {
      if (!user) {
        return {
          pointTransactions: [],
          earningTransactions: [],
        } as MyEarningsData;
      }

      const [pointRes, earningRes] = await Promise.all([
        supabase
          .from('point_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('earning_transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
      ]);

      if (pointRes.error) throw pointRes.error;
      if (earningRes.error) throw earningRes.error;

      return {
        pointTransactions: (pointRes.data || []) as PointTransactionRecord[],
        earningTransactions: (earningRes.data || []) as EarningTransactionRecord[],
      } as MyEarningsData;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
};

// Unfollow user
export const useUnfollow = () => {
  const { user } = useAuth();

  return async (followingId: string) => {
    if (!user) throw new Error('请先登录');
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('followee_id', followingId);
    if (error) throw error;
  };
};
