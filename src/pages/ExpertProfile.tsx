import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  Award,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  MessageSquare,
  Package,
  Star,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useExpertDetail } from '@/hooks/useExperts';
import { demoExperts } from '@/lib/demoData';
import PageStateCard from '@/components/common/PageStateCard';
import { buildFromState, navigateBackOr } from '@/utils/navigation';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { isNativeApp } from '@/utils/platform';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

type EducationItem = string | { school?: string; degree?: string };
type ExperienceItem = string | { company?: string; position?: string; title?: string };
type TimeSlotItem = string | { day?: string; time?: string; label?: string };

const ExpertProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const requestedDemoExpert = !!id?.startsWith('demo-expert-');
  const isDemoExpert = presentationFixturesEnabled && requestedDemoExpert;
  const { data: expert, isLoading, error } = useExpertDetail(requestedDemoExpert ? '' : id || '');
  const nativeMode = isNativeApp();
  const [isBioExpanded, setIsBioExpanded] = useState(false);
  const resolvedExpert = isDemoExpert ? demoExperts.find((item) => item.id === id) : expert;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [id]);

  if (requestedDemoExpert && !presentationFixturesEnabled) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white p-4">
        <PageStateCard variant="error" title="演示专家不可用" description="当前运行环境未启用展示数据。" />
      </div>
    );
  }

  if (!requestedDemoExpert && isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white p-4">
        <PageStateCard variant="loading" title="正在加载个人主页…" />
      </div>
    );
  }

  if (error || !resolvedExpert) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white flex flex-col items-center justify-center px-6 text-center">
        <PageStateCard
          variant="error"
          title="暂时无法打开个人主页"
          description="该专家可能已下架，或当前链接已失效。"
          actionLabel="回到首页"
          onAction={() => navigateBackOr(navigate, '/', { location })}
        />
      </div>
    );
  }

  const education = (Array.isArray(resolvedExpert.education) ? resolvedExpert.education : []) as EducationItem[];
  const experience = (Array.isArray(resolvedExpert.experience) ? resolvedExpert.experience : []) as ExperienceItem[];
  const timeSlots = (Array.isArray(resolvedExpert.available_time_slots) ? resolvedExpert.available_time_slots : []) as TimeSlotItem[];
  const displayName = resolvedExpert.nickname || '专家';
  const responseRate = `${Number(resolvedExpert.response_rate || 0)}%`;
  const coverImage =
    resolvedExpert.cover_image ||
    'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&h=480&q=80';

  return (
    <div className="min-h-[100dvh] bg-[rgb(248,253,251)] pb-24">
      <SubPageHeader title="个人主页" onBack={() => navigateBackOr(navigate, '/', { location })} />

      <div className="pt-0">
      <div className="relative">
        <div
          className="w-full h-44 bg-cover bg-center"
          style={{ backgroundImage: `url(${coverImage})`, backgroundPosition: 'center center' }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-transparent" />
        </div>

      <div className="relative px-4 pb-5 -mt-12">
          <div className="surface-card rounded-3xl p-5">
            <div className="flex justify-between items-end gap-3">
              <div className="flex items-end gap-3">
                <Avatar className="w-20 h-20 border-4 border-white shadow-md">
                  <AvatarImage src={resolvedExpert.avatar_url || ''} alt={displayName} />
                  <AvatarFallback>{displayName.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="pb-1">
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl font-bold text-gray-800">{displayName}</h1>
                    {resolvedExpert.is_verified && (
                      <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full flex items-center">
                        <CheckCircle size={12} className="mr-1" />
                        已认证
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{resolvedExpert.title}</p>
                  <div className="flex items-center text-gray-500 text-xs mt-1">
                    <MapPin size={12} className="mr-1" />
                    <span>{resolvedExpert.location || '未设置地区'}</span>
                  </div>
                </div>
              </div>

              <Button
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate(`/expert/${resolvedExpert.id}`, { state: buildFromState(location) })}
              >
                前往咨询页
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-3 mt-5 bg-slate-50 rounded-xl p-3">
              <div className="text-center">
                <div className="flex items-center justify-center text-yellow-500 gap-1 font-semibold">
                  <Star size={14} />
                  <span>{Number(resolvedExpert.rating || 0).toFixed(1)}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">评分</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center text-primary gap-1 font-semibold">
                  <Clock size={14} />
                  <span>{responseRate}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">回复率</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center text-primary gap-1 font-semibold">
                  <Package size={14} />
                  <span>{resolvedExpert.order_count || 0}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">订单数</div>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center text-primary gap-1 font-semibold">
                  <Award size={14} />
                  <span>{resolvedExpert.consultation_count || 0}</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">咨询数</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>

      <div className="px-4 space-y-5">
        <div className="surface-card rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800">服务信息</h2>
            <div className="text-sm text-primary font-semibold">{resolvedExpert.consultation_price || 0} 积分 / 次</div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="app-soft-surface-bg rounded-xl p-3">
              <div className="text-gray-500 mb-1">服务分类</div>
              <div className="font-medium text-gray-800">{resolvedExpert.category || '未设置'} / {resolvedExpert.subcategory || '未设置'}</div>
            </div>
            <div className="app-soft-surface-bg rounded-xl p-3">
              <div className="text-gray-500 mb-1">响应承诺</div>
              <div className="font-medium text-gray-800">{resolvedExpert.response_time || '未设置'}</div>
            </div>
          </div>
          {resolvedExpert.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {resolvedExpert.tags.map((tag, index) => (
                <span key={`${tag}-${index}`} className="bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-full">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card rounded-3xl p-5">
          <h2 className="text-base font-semibold text-gray-800 mb-3">个人介绍</h2>
          <Collapsible open={isBioExpanded} onOpenChange={setIsBioExpanded}>
            <div className="text-sm text-gray-700 leading-7">
              {resolvedExpert.bio && resolvedExpert.bio.length > 180 && !isBioExpanded ? (
                <>
                  <p>{resolvedExpert.bio.slice(0, 180)}...</p>
                  <CollapsibleTrigger className="text-primary text-xs mt-2 flex items-center">
                    展开全部 <ChevronDown size={12} className="ml-1" />
                  </CollapsibleTrigger>
                </>
              ) : (
                <>
                  <p>{resolvedExpert.bio || '该专家暂未填写介绍。'}</p>
                  {resolvedExpert.bio && resolvedExpert.bio.length > 180 && (
                    <CollapsibleTrigger className="text-primary text-xs mt-2 flex items-center">
                      收起 <ChevronUp size={12} className="ml-1" />
                    </CollapsibleTrigger>
                  )}
                </>
              )}
            </div>
            <CollapsibleContent />
          </Collapsible>
        </div>

        {(education.length > 0 || experience.length > 0) && (
          <div className="surface-card rounded-3xl p-5 space-y-4">
            {education.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-800 font-semibold">
                  <Calendar size={16} className="text-primary" />
                  教育经历
                </div>
                <div className="space-y-2">
                  {education.map((item, index: number) => (
                    <div key={`edu-${index}`} className="app-soft-surface-bg rounded-xl p-3 text-sm text-gray-700">
                      {typeof item === 'string' ? item : `${item.school || ''} ${item.degree || ''}`.trim()}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {experience.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2 text-gray-800 font-semibold">
                  <Briefcase size={16} className="text-primary" />
                  工作经历
                </div>
                <div className="space-y-2">
                  {experience.map((item, index: number) => (
                    <div key={`exp-${index}`} className="app-soft-surface-bg rounded-xl p-3 text-sm text-gray-700">
                      {typeof item === 'string' ? item : `${item.company || ''} ${item.position || item.title || ''}`.trim()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {timeSlots.length > 0 && (
          <div className="surface-card rounded-3xl p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-3">可预约时间</h2>
            <div className="space-y-2">
              {timeSlots.map((slot, index: number) => (
                <div key={`slot-${index}`} className="app-soft-surface-bg rounded-xl p-3 text-sm text-gray-700">
                  {typeof slot === 'string'
                    ? slot
                    : `${slot.day || ''} ${slot.time || slot.label || ''}`.trim() || '待与专家协商'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        className={`fixed bottom-0 z-[60] border-t bg-white/98 p-3 backdrop-blur-sm ${nativeMode ? 'left-0 right-0' : 'left-1/2 right-auto w-full max-w-md -translate-x-1/2'} flex gap-3`}
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <Button
          variant="outline"
          className="flex-1 rounded-full"
          onClick={() => navigate('/messages', { state: buildFromState(location) })}
        >
          <MessageSquare size={16} className="mr-2" />
          返回消息
        </Button>
        <Button
          className="flex-1 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          onClick={() => navigate(`/expert/${resolvedExpert.id}`, { state: buildFromState(location) })}
        >
          进入咨询页
        </Button>
      </div>
    </div>
  );
};

export default ExpertProfile;
