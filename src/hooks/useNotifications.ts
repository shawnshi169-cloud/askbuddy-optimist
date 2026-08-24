import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  target_id: string | null;
  target_type: string | null;
  // Compatibility aliases are normalized only at this adapter boundary.
  content: string | null;
  related_id: string | null;
  related_type: string | null;
  sender_id: string | null;
  is_read: boolean;
  created_at: string;
  sender_nickname?: string | null;
  sender_avatar?: string | null;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<Notification[]> => {
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      if (!data || data.length === 0) return [];

      const senderIds = Array.from(
        new Set(
          data
            .map((item) => item.sender_id)
            .filter((senderId): senderId is string => Boolean(senderId))
        )
      );

      const profiles = senderIds.length > 0
        ? await supabase
            .from('profiles')
            .select('user_id, nickname, avatar_url')
            .in('user_id', senderIds)
        : { data: [], error: null };

      if (profiles.error) throw profiles.error;

      const profileMap = new Map(
        (profiles.data || []).map((profile) => [profile.user_id, profile])
      );

      return data.map((notification) => ({
        ...notification,
        body: notification.body ?? notification.content,
        target_id: notification.target_id ?? notification.related_id,
        target_type: notification.target_type ?? notification.related_type,
        content: notification.body ?? notification.content,
        related_id: notification.target_id ?? notification.related_id,
        related_type: notification.target_type ?? notification.related_type,
        created_at: notification.created_at || notification.updated_at,
        is_read: notification.is_read ?? false,
        sender_nickname: notification.sender_id ? profileMap.get(notification.sender_id)?.nickname || null : null,
        sender_avatar: notification.sender_id ? profileMap.get(notification.sender_id)?.avatar_url || null : null,
      }));
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`notifications-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  return query;
};

export const useUnreadCount = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['notifications-unread-count', user?.id],
    queryFn: async (): Promise<number> => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
  });
};

export const useMarkAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const rpcResult = await supabase.rpc('mark_notifications_read', {
        p_notification_ids: [notificationId],
      });

      if (rpcResult.error) throw rpcResult.error;
      return rpcResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
  });
};

export const useMarkAllAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const rpcResult = await supabase.rpc('mark_notifications_read', {
        p_notification_ids: null,
      });

      if (rpcResult.error) throw rpcResult.error;
      return rpcResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user?.id] });
    },
  });
};
