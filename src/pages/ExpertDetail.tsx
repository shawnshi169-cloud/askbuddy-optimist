
import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { 
  Award, 
  MessageSquare, 
  Clock, 
  Package, 
  MapPin, 
  ChevronDown, 
    ChevronUp
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useExpertDetail } from '@/hooks/useExperts';
import { useAuth } from '@/contexts/AuthContext';
import { CONSULTATION_UNAVAILABLE_MESSAGE, getConsultationAmount } from '@/hooks/useConsultationOrders';
import { demoExperts } from '@/lib/demoData';
import PageStateCard from '@/components/common/PageStateCard';
import { buildFromState, navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { isNativeApp } from '@/utils/platform';
import { useToast } from '@/hooks/use-toast';
import { CONSULTATION_CAPABILITY } from '../../packages/shared-api/src/capabilities';

const ExpertDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [selectedConsultType, setSelectedConsultType] = useState<'text' | 'voice' | 'video'>('text');
  const isDemoExpert = !!id?.startsWith('demo-expert-');
  const nativeMode = isNativeApp();

  const { data: expert, isLoading } = useExpertDetail(isDemoExpert ? '' : id || '');

  const resolvedExpert = isDemoExpert ? demoExperts.find((item) => item.id === id) : expert;

  if (!isDemoExpert && isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-white via-slate-50/80 to-slate-50 p-4">
        <PageStateCard variant="loading" title="正在加载达人信息…" />
      </div>
    );
  }

  if (!resolvedExpert) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-white via-slate-50/80 to-slate-50 p-4">
        <PageStateCard
          variant="error"
          title="暂时无法打开达人信息"
          description="该专家可能已下架，或当前链接已失效。"
          actionLabel="返回上页"
          onAction={() => navigateBackOr(navigate, '/', { location })}
        />
      </div>
    );
  }

  const displayName = resolvedExpert.nickname || '专家';
  const description = resolvedExpert.bio || '';
  const basePrice = resolvedExpert.consultation_price || 50;
  const amounts = {
    text: getConsultationAmount(basePrice, 'text'),
    voice: getConsultationAmount(basePrice, 'voice'),
    video: getConsultationAmount(basePrice, 'video'),
  };

  return (
    <div className="app-container bg-gradient-to-b from-white via-slate-50/80 to-slate-50 pb-20 min-h-[100dvh]">
      <SubPageHeader title="咨询页" onBack={() => navigateBackOr(navigate, '/', { location })} />
      
      <div className="px-4 pb-6 pt-4 space-y-5">
        {/* Expert Header */}
        <div className="surface-card rounded-3xl p-5">
          <div className="flex items-start justify-between mb-4">
            <div className="flex gap-4">
              <Avatar className="w-16 h-16 border-2 border-primary/20">
                <AvatarImage src={resolvedExpert.avatar_url || ''} alt={displayName} className="object-cover" />
                <AvatarFallback className="text-lg">{displayName[0]}</AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
                  {resolvedExpert.is_verified && (
                    <span className="bg-primary/10 text-primary text-xs px-1.5 py-0.5 rounded-full border border-primary/20 flex items-center">
                      <Award size={10} className="mr-0.5" /> 已认证
                    </span>
                  )}
                </div>
                <p className="text-sm text-primary">{resolvedExpert.title}</p>
                {resolvedExpert.location && (
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin size={12} className="mr-1" />
                    <span>{resolvedExpert.location}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-1.5 text-right">
              <div className="flex items-center justify-end text-yellow-500 gap-1">
                <Award size={14} />
                <span className="text-sm font-medium">{resolvedExpert.rating || 0}</span>
              </div>
              <div className="flex items-center justify-end text-primary gap-1 text-xs">
                <Clock size={12} />
                <span>{resolvedExpert.response_rate || 0}% 响应率</span>
              </div>
              <div className="flex items-center justify-end text-accent gap-1 text-xs">
                <Package size={12} />
                <span>{resolvedExpert.order_count || 0}单</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4 rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">适合立即咨询</p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  这里更聚焦咨询方式、价格和下单动作，适合直接做服务决策。
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="rounded-full whitespace-nowrap"
                onClick={() => navigate(`/expert-profile/${resolvedExpert.id}`, { state: buildFromState(location) })}
              >
                查看主页
              </Button>
            </div>
          </div>

          {/* Description */}
          {description && (
            <Collapsible 
              className="w-full border border-border rounded-2xl p-4 bg-muted/40 mb-4"
              open={isDescriptionExpanded}
              onOpenChange={setIsDescriptionExpanded}
            >
              <div className="text-sm text-foreground leading-relaxed">
                {description.length > 140 && !isDescriptionExpanded ? (
                  <>
                    <p>{description.substring(0, 140)}...</p>
                    <CollapsibleTrigger className="text-primary text-xs mt-2 hover:underline flex items-center">
                      展开全部 <ChevronDown size={12} className="ml-1" />
                    </CollapsibleTrigger>
                  </>
                ) : (
                  <>
                    <p>{description}</p>
                    {description.length > 140 && (
                      <CollapsibleTrigger className="text-primary text-xs mt-2 hover:underline flex items-center">
                        收起 <ChevronUp size={12} className="ml-1" />
                      </CollapsibleTrigger>
                    )}
                  </>
                )}
              </div>
              <CollapsibleContent />
            </Collapsible>
          )}
          
          {/* Tags */}
          {resolvedExpert.tags && resolvedExpert.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {resolvedExpert.tags.map((tag: string, index: number) => (
                <span key={index} className="bg-primary/10 text-primary text-xs px-2.5 py-1 rounded-full border border-primary/20">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {/* Consult Options */}
        <div className="surface-card rounded-3xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">咨询方式</h3>
          <div className="flex gap-3">
            {(['text', 'voice', 'video'] as const).map((type) => (
              <button
                key={type}
                className={`flex-1 py-2.5 px-3 rounded-2xl text-sm font-medium transition-all ${
                  selectedConsultType === type
                    ? 'bg-primary/10 text-primary border-2 border-primary/30'
                    : 'bg-muted text-muted-foreground border border-border'
                }`}
                onClick={() => setSelectedConsultType(type)}
              >
                <div>{type === 'text' ? '文本咨询' : type === 'voice' ? '语音咨询' : '视频咨询'}</div>
                <div className="text-xs mt-1">{amounts[type]}积分</div>
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Action Buttons */}
      <div
        className={`fixed bottom-0 z-[60] bg-card/98 border-t border-border p-3 flex gap-3 backdrop-blur-sm ${nativeMode ? 'left-0 right-0' : 'left-1/2 right-auto w-full max-w-md -translate-x-1/2'}`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={() => {
            if (!user) { navigateToAuthWithReturn(navigate, location); return; }
            if (CONSULTATION_CAPABILITY.availability === 'unavailable') {
              toast({
                title: CONSULTATION_UNAVAILABLE_MESSAGE,
                description: '当前不会创建咨询订单或扣除积分。',
                variant: 'destructive',
              });
            }
          }}
        >
          预约咨询
        </Button>
        <Button
          className="flex-1 rounded-full"
          onClick={() => {
            if (!user) { navigateToAuthWithReturn(navigate, location); return; }
            navigate(`/chat/${resolvedExpert.user_id}`, { state: buildFromState(location) });
          }}
        >
          <MessageSquare size={16} className="mr-2" />
          立即咨询
        </Button>
      </div>

    </div>
  );
};

export default ExpertDetail;
