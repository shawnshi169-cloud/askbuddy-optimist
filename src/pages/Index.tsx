import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import SearchBar from '../components/SearchBar';
import CategorySection from '../components/CategorySection';
import QuestionCard from '../components/QuestionCard';
import BottomNav from '../components/BottomNav';
import { Sparkles, MessageSquare, ArrowUpRight, Bell, MapPin, ChevronDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuestions } from '@/hooks/useQuestions';
import { useHotTopics } from '@/hooks/useHotTopics';
import { useExperts } from '@/hooks/useExperts';
import { useUnreadCount } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { demoExperts, demoQuestions } from '@/lib/demoData';
import PageStateCard from '@/components/common/PageStateCard';
import ChannelExpertCard from '@/components/channel/ChannelExpertCard';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import { mapExpertToUIModel, mapQuestionToUIModel, mergeUniqueById } from '@/lib/adapters/contentAdapters';
import { isNativeApp } from '@/utils/platform';
import { buildFromState } from '@/utils/navigation';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

interface LocationState {
  location?: string;
}

const Index = () => {
  const routeLocation = useLocation();
  const navigate = useNavigate();
  const locationState = routeLocation.state as LocationState;
  const nativeMode = isNativeApp();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  
  const [activeTab, setActiveTab] = useState<'everyone' | 'experts'>(() => {
    const cached = sessionStorage.getItem('tab:index');
    return cached === 'experts' ? 'experts' : 'everyone';
  });
  const [currentLocation, setCurrentLocation] = useState<string>('深圳');
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);
  const searchCollapsedRef = useRef(false);
  
  // 使用真实数据
  const {
    data: questions,
    isLoading,
    error: questionsError,
    refetch: refetchQuestions,
  } = useQuestions();
  const {
    data: hotTopics,
    isLoading: isLoadingTopics,
    error: hotTopicsError,
    refetch: refetchHotTopics,
  } = useHotTopics();
  const {
    data: dbExperts,
    error: expertsError,
    refetch: refetchExperts,
  } = useExperts();
  const { data: unreadCount } = useUnreadCount();
  
  useEffect(() => {
    const storedLocation = localStorage.getItem('currentLocation') || '深圳';
    setCurrentLocation(storedLocation);
  }, []);

  usePageScrollMemory('index');

  useEffect(() => {
    sessionStorage.setItem('tab:index', activeTab);
  }, [activeTab]);
  
  useEffect(() => {
    if (locationState?.location) {
      setCurrentLocation(locationState.location);
    }
  }, [locationState]);

  useEffect(() => {
    let rafId: number | null = null;

    const onScroll = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const nextCollapsed = window.scrollY > 28;
        if (nextCollapsed === searchCollapsedRef.current) return;
        searchCollapsedRef.current = nextCollapsed;
        setIsSearchCollapsed(nextCollapsed);
      });
    };

    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const presentationTopicFixtures = [
    {
      id: '1',
      title: '大学生灵活就业圈',
      imageUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=225&q=80',
      description: '灵活就业、副业尝试、真实岗位体验都在这里持续更新。'
    },
    {
      id: '2',
      title: '留学申请季交流空间',
      imageUrl: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=400&h=225&q=80',
      description: '把申请时间线、文书经验和 offer 节奏做成一份可持续更新的热榜专题。'
    }
  ];

  // 格式化时间
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: zhCN 
      });
    } catch {
      return '刚刚';
    }
  };

  // 格式化浏览量
  const formatViewCount = (count: number) => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  const realExperts = (dbExperts || []).map((item) => mapExpertToUIModel(item));
  const experts = presentationFixturesEnabled
    ? mergeUniqueById(realExperts, demoExperts.map((item) => mapExpertToUIModel(item)))
    : realExperts;

  const realQuestions = (questions || []).map((item) => mapQuestionToUIModel(item));
  const homepageQuestions = presentationFixturesEnabled
    ? mergeUniqueById(realQuestions, demoQuestions.map((item) => mapQuestionToUIModel(item)))
    : realQuestions;

  const handleViewQuestionDetail = (questionId: string) => {
    navigate(`/question/${questionId}`, { state: buildFromState(routeLocation) });
  };

  const handleViewExpertProfile = (expertId: string) => {
    navigate(`/expert-profile/${expertId}`, { state: buildFromState(routeLocation) });
  };
  const hotTopicNavState = { ...buildFromState(routeLocation), fromHotRank: true };

  const fixedHeader = (
    <div className={`fixed top-0 z-[90] w-full shadow-sm ${nativeMode ? 'left-0' : 'left-1/2 max-w-md -translate-x-1/2'}`}>
      <div className="app-header-bg">
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="flex h-12 items-center justify-between px-4">
          <div className="text-[17px] font-semibold text-white">问问</div>
          <div className="flex items-center gap-2">
            <button
              className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white transition-all duration-200 ${
                isSearchCollapsed ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-90 opacity-0'
              }`}
              onClick={() => navigate('/search', { state: buildFromState(routeLocation) })}
              aria-label="打开搜索"
            >
              <Search size={16} />
            </button>
            <button
              className="relative flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white"
              onClick={() => navigate('/notifications', { state: buildFromState(routeLocation) })}
            >
              <Bell size={16} />
              {(unreadCount || 0) > 0 ? (
                <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
              ) : null}
            </button>
            <button
              className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-1 text-xs text-white"
              onClick={() => navigate('/city-selector', { state: buildFromState(routeLocation) })}
            >
              <MapPin size={12} className="text-white" />
              <span>{currentLocation}</span>
              <ChevronDown size={12} />
            </button>
          </div>
        </div>
        <div
          className={`overflow-hidden border-t border-white/20 app-header-soft-bg transition-all duration-200 ${
            isSearchCollapsed ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'
          }`}
        >
          <div className="py-3">
            <SearchBar
              className="py-0"
              clickToNavigate
              navigateToPath="/search"
              accentRingClassName="ring-app-teal/35"
              inputAccentClassName="focus-visible:ring-app-teal/25 focus-visible:border-app-teal/60"
              inputBorderClassName="border-[rgb(160,237,224)]"
              iconClassName="text-app-teal"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="app-container bg-white pb-16">
      {typeof document !== 'undefined' ? createPortal(fixedHeader, document.body) : null}

      <div
        className="transition-[padding-top] duration-200"
        style={{
          paddingTop: isSearchCollapsed
            ? 'calc(env(safe-area-inset-top) + 3.5rem)'
            : 'calc(env(safe-area-inset-top) + 11rem)'
        }}
      >
        <CategorySection />
      
        <div className="mb-6 pt-3">
        <div className="mb-4 app-page-padding flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-50">
                <Sparkles size={16} className="text-amber-500" />
              </span>
              <h2 className="text-lg font-bold tracking-[-0.01em] animate-fade-in animate-delay-2">
                问问热榜
              </h2>
            </div>
            <p className="app-section-subtitle">
              左右滑动浏览专题，快速获取高质量经验。
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="rounded-full px-3 text-xs text-primary hover:bg-primary/10"
            onClick={() => hotTopics?.[0] && navigate(`/topic/${hotTopics[0].id}`, { state: hotTopicNavState })}
            disabled={!hotTopics || hotTopics.length === 0}
          >
            进入专题
          </Button>
        </div>
        
        {isLoadingTopics ? (
          <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide" data-no-swipe-back="true">
            {[1, 2, 3].map((item) => (
              <div key={item} className="w-[280px] shrink-0 animate-pulse-soft">
                <div className="surface-card overflow-hidden rounded-3xl">
                  <div className="h-[124px] app-neutral-soft-bg" />
                  <div className="space-y-3 p-4">
                    <div className="h-4 w-3/4 rounded-full app-neutral-soft-bg" />
                    <div className="h-3 w-full rounded-full app-neutral-soft-bg" />
                    <div className="h-3 w-5/6 rounded-full app-neutral-soft-bg" />
                    <div className="h-3 w-1/2 rounded-full app-neutral-soft-bg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : hotTopicsError ? (
          <div className="px-4 pb-2">
            <PageStateCard
              compact
              variant="error"
              title="热榜加载失败"
              description={hotTopicsError instanceof Error ? hotTopicsError.message : '请稍后重试'}
              actionLabel="重试"
              onAction={() => refetchHotTopics()}
            />
          </div>
        ) : hotTopics && hotTopics.length > 0 ? (
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory" data-no-swipe-back="true">
            {hotTopics.map((topic, index) => (
              <div
                key={topic.id}
                className="shrink-0 w-[280px] snap-start opacity-0 animate-slide-in-left"
                style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
              >
                <div className="surface-card overflow-hidden rounded-3xl">
                  <button
                    type="button"
                    className="block w-full text-left"
                    onClick={() => navigate(`/topic/${topic.id}`, { state: hotTopicNavState })}
                  >
                    <div className="relative h-[112px]">
                      <img
                        src={topic.cover_image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=800&h=600&q=80'}
                        alt={topic.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-3">
                        <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-foreground">
                          热榜专题
                        </span>
                        <span className="flex items-center gap-1 rounded-full bg-slate-900/70 px-2.5 py-1 text-[11px] text-white">
                          <MessageSquare size={12} />
                          {topic.discussions_count}
                        </span>
                      </div>
                    </div>
                  </button>
                  <div className="p-4">
                    <button
                      type="button"
                      className="block w-full text-left"
                      onClick={() => navigate(`/topic/${topic.id}`, { state: hotTopicNavState })}
                    >
                      <h3 className="text-[15px] font-semibold leading-6 text-foreground">{topic.title}</h3>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                        {topic.description || '点击进入专题详情，查看完整内容并继续参与讨论。'}
                      </p>
                    </button>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{topic.participants_count} 人正在围观</span>
                      <button
                        type="button"
                        className="flex items-center gap-1 font-medium text-primary"
                        onClick={() => navigate(`/topic/${topic.id}`, { state: hotTopicNavState })}
                      >
                        点进查看
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : presentationFixturesEnabled ? (
          <div className="flex gap-4 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory" data-no-swipe-back="true">
            {presentationTopicFixtures.map((activity) => (
              <div key={activity.id} className="shrink-0 w-[280px] snap-start">
                <div className="surface-card overflow-hidden rounded-3xl">
                  <div className="relative h-[112px]">
                    <img
                      src={activity.imageUrl}
                      alt={activity.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute left-3 top-3">
                      <span className="w-fit rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-foreground">
                        推荐专题
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="text-[15px] font-semibold leading-6 text-foreground">{activity.title}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{activity.description}</p>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>下滑即可评论讨论</span>
                      <span className="flex items-center gap-1 font-medium text-primary">
                        即将开放
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 pb-2">
            <PageStateCard
              compact
              title="热榜暂时为空"
              description="当前没有可展示的真实专题。"
            />
          </div>
        )}
      </div>
      
      <div className="bg-white app-page-padding pb-20 pt-2">
        <div className="relative mb-5 after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-0 after:h-px after:bg-[rgb(205,239,231)]">
          <div className="flex gap-6">
            <button 
              className={`pb-3.5 text-base font-semibold relative transition-colors ${activeTab === 'everyone' ? 'text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('everyone')}
            >
              大家都在问
              {activeTab === 'everyone' && (
                <span className="absolute bottom-0 left-1/2 h-[2.5px] w-10 -translate-x-1/2 rounded-full bg-primary transition-all duration-300 ease-in-out"></span>
              )}
            </button>
            <button 
              className={`pb-3.5 text-base font-semibold relative transition-colors ${activeTab === 'experts' ? 'text-foreground' : 'text-muted-foreground'}`}
              onClick={() => setActiveTab('experts')}
            >
              找TA问问
              {activeTab === 'experts' && (
                <span className="absolute bottom-0 left-1/2 h-[2.5px] w-10 -translate-x-1/2 rounded-full bg-primary transition-all duration-300 ease-in-out"></span>
              )}
            </button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="space-y-4">
            {activeTab === 'everyone' ? (
              [1, 2, 3].map((item) => (
                <div key={item} className="surface-card rounded-2xl p-4 animate-pulse-soft shadow-sm">
                  <div className="mb-3 h-5 w-3/4 rounded-full app-neutral-soft-bg"></div>
                  <div className="mb-3 h-3 w-full rounded-full app-neutral-soft-bg"></div>
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="w-8 h-8 app-neutral-soft-bg rounded-full"></div>
                    <div>
                      <div className="h-3 app-neutral-soft-bg rounded-full w-24"></div>
                      <div className="h-3 app-neutral-soft-bg rounded-full w-16 mt-1"></div>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <div className="flex space-x-2">
                      <div className="h-4 app-neutral-soft-bg rounded-full w-12"></div>
                      <div className="h-4 app-neutral-soft-bg rounded-full w-12"></div>
                    </div>
                    <div className="h-6 app-neutral-soft-bg rounded-full w-16"></div>
                  </div>
                </div>
              ))
            ) : (
              <div className="surface-card rounded-2xl p-5 animate-pulse-soft shadow-sm">
                <div className="flex items-center mb-4 gap-3">
                  <div className="w-16 h-16 app-neutral-soft-bg rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 app-neutral-soft-bg rounded-full w-1/3 mb-2"></div>
                    <div className="h-3 app-neutral-soft-bg rounded-full w-1/2 mb-2"></div>
                    <div className="h-3 app-neutral-soft-bg rounded-full w-3/4"></div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-3 app-neutral-soft-bg rounded-full w-full"></div>
                  <div className="h-3 app-neutral-soft-bg rounded-full w-5/6"></div>
                </div>
                <div className="flex gap-2 mt-4">
                  <div className="h-6 app-neutral-soft-bg rounded-full w-16"></div>
                  <div className="h-6 app-neutral-soft-bg rounded-full w-16"></div>
                </div>
                <div className="h-10 app-neutral-soft-bg rounded-full w-full mt-4"></div>
              </div>
            )}
          </div>
        ) : (
          activeTab === 'everyone' ? (
            <div className="space-y-4">
              {questionsError ? (
                <PageStateCard
                  compact
                  variant="error"
                  title="问题列表加载失败"
                  description={questionsError instanceof Error ? questionsError.message : '请稍后重试'}
                  actionLabel="重试"
                  onAction={() => refetchQuestions()}
                />
              ) : homepageQuestions.length > 0 ? (
                homepageQuestions.map((question, index) => (
                  <div
                    key={question.id}
                    className="opacity-0 animate-slide-up"
                    style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
                  >
                    <QuestionCard
                      id={question.id}
                      title={question.title}
                      description={question.content || undefined}
                      asker={{
                        name: question.askerName,
                        avatar: question.askerAvatar
                      }}
                      time={formatTime(question.createdAt)}
                      tags={question.tags || []}
                      points={question.bountyPoints}
                      viewCount={formatViewCount(question.viewCount)}
                      delay={0.4 + index * 0.1}
                    />
                  </div>
                ))
              ) : (
                <PageStateCard
                  compact
                  title="还没有问题"
                  description="点击右下角“+”发布第一个问题。"
                />
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {expertsError ? (
                <PageStateCard
                  compact
                  variant="error"
                  title="专家列表加载失败"
                  description={expertsError instanceof Error ? expertsError.message : '请稍后重试'}
                  actionLabel="重试"
                  onAction={() => refetchExperts()}
                />
              ) : experts.length > 0 ? experts.map((expert, index) => (
                <div
                  key={expert.id}
                  className="opacity-0 animate-slide-up"
                  style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'forwards' }}
                >
                  <ChannelExpertCard
                    expert={expert}
                    accentBorderClass="app-soft-border"
                    accentTextClass="text-app-teal"
                    accentTagClass="app-soft-surface-bg app-accent-text app-soft-border border"
                    accentSummaryClass="app-soft-border app-soft-surface-bg"
                    ctaClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                    onOpen={() => handleViewExpertProfile(expert.id)}
                    onConsult={() => navigate(`/expert/${expert.id}`, { state: buildFromState(routeLocation) })}
                  />
                </div>
              )) : (
                <PageStateCard
                  compact
                  title="还没有可展示的专家"
                  description="先去“发布技能”完善专家资料。"
                />
              )}
            </div>
          )
        )}
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
};

export default Index;
