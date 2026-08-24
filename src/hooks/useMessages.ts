import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

const isMissingRpcError = (error: unknown, functionName: string) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes(`public.${functionName}`) || message.includes('schema cache');
};

export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  message_type: string;
  read_at: string | null;
  created_at: string;
  sender_nickname?: string | null;
  sender_avatar?: string | null;
  receiver_nickname?: string | null;
  receiver_avatar?: string | null;
}

export interface Conversation {
  partner_id: string;
  partner_nickname: string | null;
  partner_avatar: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
  is_online?: boolean;
}

export const useConversations = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async (): Promise<Conversation[]> => {
      if (!user) return [];

      const rpcResult = await supabase.rpc('get_user_conversations');
      if (!rpcResult.error) {
        return (rpcResult.data || []).map((item) => ({
          partner_id: item.partner_id,
          partner_nickname: item.partner_nickname,
          partner_avatar: item.partner_avatar,
          last_message: item.last_message,
          last_message_time: item.last_message_time,
          unread_count: item.unread_count,
        }));
      }

      if (!isMissingRpcError(rpcResult.error, 'get_user_conversations')) {
        throw rpcResult.error;
      }

      const { data: messages, error } = await supabase
        .from('messages')
        .select('id,sender_id,receiver_id,content,read_at,created_at')
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(600);

      if (error) throw error;
      if (!messages || messages.length === 0) return [];

      const conversationMap = new Map<string, {
        partner_id: string;
        last_message: string;
        last_message_time: string;
        unread_count: number;
      }>();

      messages.forEach((message) => {
        const partnerId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
        if (!conversationMap.has(partnerId)) {
          conversationMap.set(partnerId, {
            partner_id: partnerId,
            last_message: message.content,
            last_message_time: message.created_at,
            unread_count: 0,
          });
        }

        if (message.receiver_id === user.id && !message.read_at) {
          const current = conversationMap.get(partnerId);
          if (current) {
            current.unread_count += 1;
          }
        }
      });

      const partnerIds = Array.from(conversationMap.keys());
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .in('user_id', partnerIds);

      if (profileError) throw profileError;

      const profileMap = new Map((profiles || []).map((profile) => [profile.user_id, profile]));

      return Array.from(conversationMap.values()).map((item) => ({
        ...item,
        partner_nickname: profileMap.get(item.partner_id)?.nickname || '用户',
        partner_avatar: profileMap.get(item.partner_id)?.avatar_url || null,
      }));
    },
    enabled: !!user,
    staleTime: 20_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
};

export const useMessagesWithUser = (partnerId: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['messages', user?.id, partnerId],
    queryFn: async (): Promise<Message[]> => {
      if (!user || !partnerId) return [];

      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`)
        .eq('is_hidden', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .in('user_id', [user.id, partnerId]);

      if (profileError) throw profileError;

      const profilesMap = new Map(
        (profiles || []).map((profile) => [profile.user_id, profile])
      );

      return (messages || []).map((message) => ({
        ...message,
        sender_nickname: profilesMap.get(message.sender_id)?.nickname || '用户',
        sender_avatar: profilesMap.get(message.sender_id)?.avatar_url || null,
        receiver_nickname: profilesMap.get(message.receiver_id)?.nickname || '用户',
        receiver_avatar: profilesMap.get(message.receiver_id)?.avatar_url || null,
      }));
    },
    enabled: !!user && !!partnerId,
    staleTime: 10_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!user || !partnerId) return;

    const channel = supabase
      .channel(`messages-${user.id}-${partnerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const nextMessage = payload.new as { sender_id?: string; receiver_id?: string } | undefined;
          const prevMessage = payload.old as { sender_id?: string; receiver_id?: string } | undefined;
          const candidate = nextMessage || prevMessage;

          if (!candidate) return;

          const belongsToThread =
            (candidate.sender_id === user.id && candidate.receiver_id === partnerId) ||
            (candidate.sender_id === partnerId && candidate.receiver_id === user.id);

          if (!belongsToThread) return;

          queryClient.invalidateQueries({ queryKey: ['messages', user.id, partnerId] });
          queryClient.invalidateQueries({ queryKey: ['conversations', user.id] });
          queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications', user.id] });
          queryClient.invalidateQueries({ queryKey: ['notifications-unread-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [partnerId, queryClient, user]);

  return query;
};

export const useSendMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      receiver_id: string;
      content: string;
      message_type?: string;
    }) => {
      if (!user) throw new Error('请先登录');

      const rpcResult = await supabase.rpc('send_direct_message', {
        p_receiver_id: data.receiver_id,
        p_content: data.content,
        p_message_type: data.message_type || 'text',
      });

      if (rpcResult.error) throw rpcResult.error;
      if (!rpcResult.data) throw new Error('发送失败：服务端未返回消息 ID');
      return rpcResult.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['messages', user?.id, variables.receiver_id] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
    },
    onError: (error: Error) => {
      toast({
        title: '发送失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useMarkMessagesAsRead = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (senderId: string) => {
      if (!user) throw new Error('请先登录');

      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('sender_id', senderId)
        .eq('receiver_id', user.id)
        .is('read_at', null);

      if (error) throw error;
    },
    onSuccess: (_, senderId) => {
      queryClient.invalidateQueries({ queryKey: ['messages', user?.id, senderId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['unread-count', user?.id] });
    },
  });
};

export const useDeleteMessage = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (messageId: string) => {
      if (!user) throw new Error('请先登录');

      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['conversations', user?.id] });
      toast({ title: '消息已删除' });
    },
    onError: (error: Error) => {
      toast({
        title: '删除失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [count, setCount] = useState(0);

  const query = useQuery({
    queryKey: ['unread-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;

      const { count, error } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_hidden', false)
        .is('read_at', null);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!user,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`unread-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['unread-count', user.id] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user]);

  useEffect(() => {
    if (query.data !== undefined) {
      setCount(query.data);
    }
  }, [query.data]);

  return { count, isLoading: query.isLoading };
};
