import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronLeft, Image, Smile, Loader2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useMessagesWithUser, useSendMessage, useMarkMessagesAsRead } from '@/hooks/useMessages';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { demoConversations, demoMessagesByPartner } from '@/lib/demoData';
import PageStateCard from '@/components/common/PageStateCard';
import { navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import { useToast } from '@/hooks/use-toast';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

const ChatDetail: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { chatId } = useParams<{ chatId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const requestedDemoChat = !!chatId?.startsWith('demo-user-');
  const isDemoChat = presentationFixturesEnabled && requestedDemoChat;

  // Fetch partner profile
  const { data: partnerProfile } = useQuery({
    queryKey: ['profile', chatId],
    queryFn: async () => {
      if (!chatId) return null;
      const { data } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .eq('user_id', chatId)
        .maybeSingle();
      return data;
    },
    enabled: !!chatId && !requestedDemoChat,
  });

  // Real messages from database
  const { data: messages, isLoading } = useMessagesWithUser(requestedDemoChat ? '' : chatId || '');
  const sendMessage = useSendMessage();
  const { mutate: markMessagesAsRead } = useMarkMessagesAsRead();

  // Mark messages as read on mount
  useEffect(() => {
    if (chatId && user && !requestedDemoChat) {
      markMessagesAsRead(chatId);
    }
  }, [chatId, user, requestedDemoChat, markMessagesAsRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle visual viewport resize (keyboard) on mobile
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, []);

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN });
    } catch {
      return '刚刚';
    }
  };

  const formatSectionDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    if (isToday) return '今天';
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const demoConversation = isDemoChat ? demoConversations.find((item) => item.partner_id === chatId) : null;
  const resolvedMessages = useMemo(
    () =>
      isDemoChat
        ? (demoMessagesByPartner[chatId || ''] || []).map((msg) => ({
            ...msg,
            sender_id: msg.sender_id === 'current-user' ? user?.id || 'current-user' : msg.sender_id,
          }))
        : messages || [],
    [chatId, isDemoChat, messages, user?.id]
  );

  const groupedMessages = React.useMemo(() => {
    return resolvedMessages.map((msg, index) => {
      const prev = resolvedMessages[index - 1];
      const showDateDivider =
        !prev || new Date(prev.created_at).toDateString() !== new Date(msg.created_at).toDateString();
      return { ...msg, showDateDivider };
    });
  }, [resolvedMessages]);

  const handleSend = () => {
    if (!inputValue.trim() || !chatId) return;
    if (isDemoChat) {
      toast({
        title: '当前不可发送',
        description: '这是演示会话，没有可用的消息写入服务。',
        variant: 'destructive',
      });
      return;
    }
    const content = inputValue.trim();
    sendMessage.mutate({
      receiver_id: chatId,
      content,
    }, {
      onSuccess: () => {
        setInputValue('');
        inputRef.current?.focus();
      },
    });
  };

  const partnerName = demoConversation?.partner_nickname || partnerProfile?.nickname || '用户';
  const partnerAvatar = demoConversation?.partner_avatar || partnerProfile?.avatar_url || undefined;

  if (requestedDemoChat && !presentationFixturesEnabled) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <PageStateCard variant="error" title="演示会话不可用" description="当前运行环境未启用展示数据。" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center p-4">
        <PageStateCard
          compact
          variant="empty"
          title="登录后查看私信"
          description="登录后可查看历史会话并继续聊天。"
          actionLabel="去登录"
          onAction={() => navigateToAuthWithReturn(navigate, location)}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50">
      <div className="app-header-bg flex-shrink-0 shadow-sm" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="flex h-12 items-center px-4">
          <button onClick={() => navigateBackOr(navigate, '/messages', { location })} className="rounded-full p-1 text-white/95 -ml-1">
            <ChevronLeft size={24} />
          </button>
          <div className="ml-2 flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={partnerAvatar} alt={partnerName} />
              <AvatarFallback>{partnerName.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium text-white">{partnerName}</p>
              <p className="text-[11px] text-white/75">在线私信</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {!isDemoChat && isLoading ? (
          <div className="py-8">
            <PageStateCard variant="loading" compact title="正在加载聊天记录…" />
          </div>
        ) : groupedMessages.length > 0 ? (
          <div className="space-y-3">
          {groupedMessages.map((msg) => {
            const fromMe = msg.sender_id === user.id;
            return (
              <React.Fragment key={msg.id}>
                {msg.showDateDivider && (
                  <div className="flex justify-center">
                    <div className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 shadow-sm">
                      {formatSectionDate(msg.created_at)}
                    </div>
                  </div>
                )}
                <div className={`flex ${fromMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[78%] rounded-3xl px-4 py-3 text-sm ${
                    fromMe
                      ? 'rounded-br-xl border border-[#167567] bg-[#1d8b79] text-white shadow-[0_6px_16px_rgba(29,139,121,0.28)]'
                      : 'surface-card rounded-bl-xl border border-slate-100 text-foreground'
                  }`}>
                    <p className={`break-words leading-6 ${fromMe ? 'text-white' : ''}`}>{msg.content}</p>
                    <p className={`mt-2 text-[10px] ${fromMe ? 'text-white/80' : 'text-muted-foreground'}`}>
                      {formatTime(msg.created_at)}
                    </p>
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          </div>
        ) : (
          <div className="py-8">
            <PageStateCard compact title="还没有聊天记录" description="可以先发一条消息，开始这次对话。" />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div
        className="flex-shrink-0 border-t border-border bg-white/98 px-3 py-2 backdrop-blur-sm"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 6px)' }}
      >
        <div className="flex items-center gap-2 rounded-3xl border border-slate-200 bg-slate-50 px-2 py-2">
          <button className="flex-shrink-0 p-2 text-muted-foreground">
            <Smile size={20} />
          </button>
          <input
            ref={inputRef}
            className="min-w-0 flex-1 bg-transparent px-2 text-base leading-6 focus:outline-none"
            placeholder="输入消息..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            enterKeyHint="send"
          />
          <button className="flex-shrink-0 p-2 text-muted-foreground">
            <Image size={20} />
          </button>
          <button
            className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all ${
              inputValue.trim()
                ? 'bg-app-teal text-white shadow-sm active:scale-95'
                : 'bg-slate-200 text-slate-500'
            }`}
            onClick={handleSend}
            disabled={!inputValue.trim() || (!isDemoChat && sendMessage.isPending)}
          >
            {!isDemoChat && sendMessage.isPending ? <Loader2 size={14} className="animate-spin" /> : '发送'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatDetail;
