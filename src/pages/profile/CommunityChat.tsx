import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Bell, FileText, ImagePlus, Send, Users } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { isNativeApp } from '@/utils/platform';
import { buildFromState } from '@/utils/navigation';
import { useToast } from '@/hooks/use-toast';
import PageStateCard from '@/components/common/PageStateCard';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

interface CommunityGroupState {
  id: string;
  name: string;
  members: number;
  topic: string;
  timeLabel: string;
  unread: number;
  lastSender?: string;
  lastMessage?: string;
  mentionCount?: number;
  role?: 'owner' | 'admin' | 'member';
  muted?: boolean;
}

interface GroupMessage {
  id: string;
  sender: string;
  content: string;
  time: string;
  mine?: boolean;
  type?: 'text' | 'notice';
}

const CommunityChat = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { groupId } = useParams();
  const nativeMode = isNativeApp();
  const { toast } = useToast();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const groupFromState = (location.state as { group?: CommunityGroupState } | null)?.group;

  const group: CommunityGroupState = useMemo(() => {
    if (groupFromState) return groupFromState;
    return {
      id: groupId || 'group',
      name: '社群讨论组',
      members: 156,
      topic: '经验互助',
      timeLabel: '刚刚',
      unread: 0,
      lastSender: '群助手',
      lastMessage: '欢迎来到群聊，先看置顶公告。',
      mentionCount: 0,
      role: 'member',
      muted: false,
    };
  }, [groupFromState, groupId]);

  const [messages] = useState<GroupMessage[]>([
    { id: 'n-1', sender: '群公告', content: '本群禁止广告与引流，优先讨论申请、求职与经验分享。', time: '今天 09:20', type: 'notice' },
    { id: 'm-1', sender: '群主', content: `欢迎来到 ${group.name}，先看公告和资料区。`, time: '09:31' },
    { id: 'm-2', sender: group.lastSender || '讨论区', content: group.lastMessage || '今天大家在讨论留学时间线。', time: '09:42' },
    { id: 'm-3', sender: '你', content: '收到，我先去看置顶资料。', time: '09:48', mine: true },
  ]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages.length]);

  const sendMessage = () => {
    const text = draft.trim();
    if (!text) return;
    toast({
      title: '当前不可发送',
      description: '社群聊天功能暂未开放，消息不会在本地伪造。',
      variant: 'destructive',
    });
  };

  if (!presentationFixturesEnabled) {
    return (
      <div className="min-h-[100dvh] bg-muted">
        <SubPageHeader title="社群聊天" />
        <div className="px-4 pt-5">
          <PageStateCard
            variant="error"
            compact
            title="社群聊天暂未开放"
            description="当前没有可用的真实群聊读取或发送能力。"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-muted pb-24">
      <SubPageHeader
        title={group.name}
        right={
          <button
            onClick={() => navigate(`/profile/community/${group.id}/info`, { state: { ...buildFromState(location), group } })}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/25"
            aria-label="群详情"
          >
            <Users size={16} />
          </button>
        }
      />

      <div className="space-y-3 px-4 py-4">
        <Card className="surface-card rounded-3xl border-none shadow-sm">
          <CardContent className="flex items-center justify-between gap-3 p-3.5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">群公告</p>
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">新成员建议先看群文件与常见问题，避免重复提问。</p>
            </div>
            <Bell size={15} className="app-accent-text shrink-0" />
          </CardContent>
        </Card>

        <div className="space-y-2 pb-24">
          {messages.map((message) => {
            if (message.type === 'notice') {
              return (
                <div key={message.id} className="mx-auto max-w-[92%] rounded-2xl bg-slate-100 px-3 py-2 text-center">
                  <p className="text-[12px] leading-5 text-slate-600">{message.content}</p>
                  <p className="mt-1 text-[11px] text-slate-400">{message.time}</p>
                </div>
              );
            }

            return (
              <div key={message.id} className={`flex items-start gap-2.5 ${message.mine ? 'justify-end' : 'justify-start'}`}>
                {!message.mine && (
                  <Avatar className="mt-5 h-8 w-8 shrink-0">
                    <AvatarFallback>{message.sender.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={`max-w-[82%] ${message.mine ? 'order-2' : ''}`}>
                  <div className={`mb-1 text-[11px] ${message.mine ? 'text-right text-slate-400' : 'text-slate-500'}`}>{message.sender}</div>
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${
                      message.mine
                        ? 'border border-[rgb(43,140,124)] bg-[rgb(43,140,124)] text-white shadow-sm'
                        : 'bg-white text-slate-700 shadow-sm'
                    }`}
                  >
                    {message.content}
                  </div>
                  <div className={`mt-1 text-[11px] ${message.mine ? 'text-right text-slate-400' : 'text-slate-400'}`}>{message.time}</div>
                </div>
              </div>
            );
          })}
          <div ref={messageEndRef} />
        </div>
      </div>

      <div
        className={`fixed bottom-0 z-[60] border-t bg-white/98 px-4 pt-2.5 backdrop-blur-sm ${nativeMode ? 'left-0 right-0' : 'left-1/2 right-auto w-full max-w-md -translate-x-1/2'}`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 10px)' }}
      >
        <div className="mb-2 flex items-center gap-2">
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <ImagePlus size={16} />
          </button>
          <button className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-600">
            <FileText size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
              }
            }}
            placeholder="发消息到群聊..."
            className="h-11 rounded-2xl border-slate-200 bg-slate-50"
          />
          <Button
            onClick={sendMessage}
            disabled={!draft.trim()}
            className="h-11 rounded-2xl px-4"
          >
            <Send size={16} className="mr-1.5" />
            暂不可发送
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CommunityChat;
