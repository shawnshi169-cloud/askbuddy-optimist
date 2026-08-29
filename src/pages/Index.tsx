import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import SearchBar from '../components/SearchBar';
import CategorySection from '../components/CategorySection';
import QuestionCard from '../components/QuestionCard';
import BottomNav from '../components/BottomNav';
import { Bell, MapPin, ChevronDown, Search } from 'lucide-react';
import { useQuestions } from '@/hooks/useQuestions';
import { useHotTopics } from '@/hooks/useHotTopics';
import { useExperts } from '@/hooks/useExperts';
import { useUnreadCount } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { demoExperts, demoQuestions } from '@/lib/demoData';
import HomeHotRank, { HomeHotRankSkeleton } from '@/components/home/HomeHotRank';
import HomeSectionState from '@/components/home/HomeSectionState';
import PersonRecommendationCard, { PersonRecommendationSkeleton } from '@/components/home/PersonRecommendationCard';
import { SectionHeader } from '@/components/ui2';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import { mapExpertToUIModel, mapQuestionToUIModel, mergeUniqueById } from '@/lib/adapters/contentAdapters';
import { isNativeApp } from '@/utils/platform';
import { buildFromState } from '@/utils/navigation';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

interface LocationState {
  location?: string;
}

const QuestionFeedSkeleton = () => (
  <div className="divide-y divide-app-border-subtle" role="status" aria-label="正在加载问题">
    {[0, 1, 2].map((item) => (
      <div key={item} className="animate-pulse py-4">
        <div className="h-4 w-4/5 rounded-full bg-slate-100" />
        <div className="mt-3 h-3 w-full rounded-full bg-slate-100" />
        <div className="mt-2 h-3 w-3/4 rounded-full bg-slate-100" />
        <div className="mt-3 flex gap-2">
          <div className="h-5 w-14 rounded-full bg-slate-100" />
          <div className="h-5 w-16 rounded-full bg-slate-100" />
        </div>
        <div className="mt-3 h-3 w-2/5 rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

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
    isLoading: isLoadingQuestions,
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
    isLoading: isLoadingExperts,
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

  const formatTime = (dateString: string | null) => {
    if (!dateString) return undefined;
    try {
      return formatDistanceToNow(new Date(dateString), { 
        addSuffix: true, 
        locale: zhCN 
      });
    } catch {
      return undefined;
    }
  };

  // 格式化浏览量
  const formatViewCount = (count: number | null) => {
    if (count === null) return undefined;
    if (count >= 1000) {
      return (count / 1000).toFixed(1) + 'k';
    }
    return count.toString();
  };

  const realExperts = (dbExperts || []).map((item) => mapExpertToUIModel(item));
  const experts = presentationFixturesEnabled ? (
    mergeUniqueById(realExperts, demoExperts.map((item) => mapExpertToUIModel(item)))
  ) : realExperts;

  const realQuestions = (questions || []).map((item) => mapQuestionToUIModel(item));
  const homepageQuestions = presentationFixturesEnabled
    ? mergeUniqueById(realQuestions, demoQuestions.map((item) => mapQuestionToUIModel(item)))
    : realQuestions;

  const hotTopicNavState = { ...buildFromState(routeLocation), fromHotRank: true };
  const navigateWithHistory = (path: string) => navigate(path, { state: buildFromState(routeLocation) });
  const openTopic = (topicId: string) => navigate(`/topic/${topicId}`, { state: hotTopicNavState });

  const fixedHeader = (
    <header className={`fixed top-0 z-[90] w-full border-b border-app-action/10 bg-app-brand-mint ${nativeMode ? 'left-0' : 'left-1/2 max-w-md -translate-x-1/2'}`}>
      <div style={{ height: 'env(safe-area-inset-top)' }} />
      <div className="flex h-14 items-center justify-between px-4">
        <div className="text-xl font-semibold tracking-[-0.02em] text-slate-800">问问</div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`flex h-11 w-11 items-center justify-center rounded-full text-app-action transition-[opacity,transform,background-color] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 ${isSearchCollapsed ? 'pointer-events-auto scale-100 bg-white/35 opacity-100' : 'pointer-events-none scale-95 opacity-0'}`}
            onClick={() => navigateWithHistory('/search')}
            aria-label="打开搜索"
            aria-hidden={!isSearchCollapsed}
            tabIndex={isSearchCollapsed ? 0 : -1}
          >
            <Search aria-hidden size={19} />
          </button>
          <button
            type="button"
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/35 text-app-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 active:scale-[0.98]"
            onClick={() => navigateWithHistory('/notifications')}
            aria-label="打开通知"
          >
            <Bell aria-hidden size={19} />
            {(unreadCount || 0) > 0 ? <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-app-brand-mint" /> : null}
          </button>
          <button
            type="button"
            className="flex h-11 items-center gap-1 rounded-full bg-white/35 px-2.5 text-xs font-medium text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 active:scale-[0.98]"
            onClick={() => navigateWithHistory('/city-selector')}
            aria-label={`切换城市，当前${currentLocation}`}
          >
            <MapPin aria-hidden size={14} className="text-app-action" />
            <span>{currentLocation}</span>
            <ChevronDown aria-hidden size={13} className="text-app-action" />
          </button>
        </div>
      </div>
      <div className={`overflow-hidden border-t border-app-action/10 transition-[max-height,opacity] duration-200 ${isSearchCollapsed ? 'max-h-0 opacity-0' : 'max-h-24 opacity-100'}`}>
        <SearchBar
          variant="home"
          className="pb-4 pt-3"
          placeholder="搜问题、经历或人"
          clickToNavigate
          navigateToPath="/search"
          accentRingClassName="ring-app-action/20"
          inputAccentClassName="focus-visible:border-app-action/45 focus-visible:ring-app-action/15"
          inputBorderClassName="border-app-border-subtle"
          iconClassName="text-app-action"
        />
      </div>
    </header>
  );

  return (
    <div className="app-container app-page-bg pb-16">
      {typeof document !== 'undefined' ? createPortal(fixedHeader, document.body) : null}

      <div
        className="transition-[padding-top] duration-200"
        style={{
          paddingTop: isSearchCollapsed
            ? 'calc(env(safe-area-inset-top) + 3.5rem)'
            : 'calc(env(safe-area-inset-top) + 8.25rem)'
        }}
      >
        <CategorySection variant="home" />
      
        {isLoadingTopics ? (
          <HomeHotRankSkeleton />
        ) : hotTopicsError ? (
          <section className="border-y border-app-border-subtle bg-white px-4 py-6">
            <SectionHeader title="问问热榜" subtitle="最近大家都在讨论" />
            <div className="mt-4">
              <HomeSectionState
                variant="error"
                title="热榜加载失败"
                description={hotTopicsError instanceof Error ? hotTopicsError.message : '请稍后重试'}
                actionLabel="重试"
                onAction={() => void refetchHotTopics()}
              />
            </div>
          </section>
        ) : hotTopics && hotTopics.length > 0 ? (
          <HomeHotRank topics={hotTopics} onOpenTopic={openTopic} />
        ) : (
          <section className="border-y border-app-border-subtle bg-white px-4 py-6">
            <SectionHeader title="问问热榜" subtitle="最近大家都在讨论" />
            <div className="mt-4">
              <HomeSectionState title="热榜暂时为空" description="当前没有可展示的真实专题。" />
            </div>
          </section>
        )}

      <section className="mt-2 bg-white px-4 pb-24 pt-6">
        <div className="border-b border-app-border-subtle">
          <div className="flex gap-7" role="tablist" aria-label="首页内容">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'everyone'}
              className={`relative min-h-11 pb-3 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/25 ${activeTab === 'everyone' ? 'text-app-action' : 'text-slate-500'}`}
              onClick={() => setActiveTab('everyone')}
            >
              大家都在问
              {activeTab === 'everyone' ? <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-8 rounded-full bg-app-action" /> : null}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'experts'}
              className={`relative min-h-11 pb-3 text-[15px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/25 ${activeTab === 'experts' ? 'text-app-action' : 'text-slate-500'}`}
              onClick={() => setActiveTab('experts')}
            >
              找TA问问
              {activeTab === 'experts' ? <span className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-8 rounded-full bg-app-action" /> : null}
            </button>
          </div>
        </div>

        <div className="pt-2">
          {activeTab === 'everyone' ? (
            isLoadingQuestions ? (
              <QuestionFeedSkeleton />
            ) : questionsError ? (
              <div className="pt-4">
                <HomeSectionState
                  variant="error"
                  title="问题列表加载失败"
                  description={questionsError instanceof Error ? questionsError.message : '请稍后重试'}
                  actionLabel="重试"
                  onAction={() => void refetchQuestions()}
                />
              </div>
            ) : homepageQuestions.length > 0 ? (
              <div>
                {homepageQuestions.map((question) => (
                  <QuestionCard
                    key={question.id}
                    variant="homeFeed"
                    id={question.id}
                    title={question.title}
                    description={question.content || undefined}
                    asker={{ name: question.askerName, avatar: question.askerAvatar }}
                    time={formatTime(question.createdAt)}
                    tags={question.tags || []}
                    points={question.bountyPoints}
                    answerCount={question.answersCount}
                    viewCount={formatViewCount(question.viewCount)}
                  />
                ))}
              </div>
            ) : (
              <div className="pt-4">
                <HomeSectionState
                  title="暂时没有新的问题"
                  actionLabel="提个问题"
                  onAction={() => navigateWithHistory('/new')}
                />
              </div>
            )
          ) : isLoadingExperts ? (
            <div className="space-y-3 pt-4" role="status" aria-label="正在加载人物推荐">
              <PersonRecommendationSkeleton />
              <PersonRecommendationSkeleton />
            </div>
          ) : expertsError ? (
            <div className="pt-4">
              <HomeSectionState
                variant="error"
                title="人物推荐加载失败"
                description={expertsError instanceof Error ? expertsError.message : '请稍后重试'}
                actionLabel="重试"
                onAction={() => void refetchExperts()}
              />
            </div>
          ) : experts.length > 0 ? (
            <div className="space-y-3 pt-4">
              {experts.map((person) => (
                <PersonRecommendationCard
                  key={person.id}
                  person={person}
                  onOpen={() => navigateWithHistory(`/expert-profile/${person.id}`)}
                />
              ))}
            </div>
          ) : (
            <div className="pt-4">
              <HomeSectionState
                title="暂时没有找到合适的人"
                description="可以先看看大家正在讨论的问题。"
                actionLabel="看看大家的问题"
                onAction={() => setActiveTab('everyone')}
              />
            </div>
          )}
        </div>
      </section>
      </div>

      <BottomNav />
    </div>
  );
};

export default Index;
