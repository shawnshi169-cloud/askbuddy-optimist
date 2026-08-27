
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ChevronLeft, 
  Home, 
  Briefcase, 
  Heart, 
  Umbrella, 
  Globe,
  Bell,
  MessageSquare,
  MessageCircle,
  Plus,
  Clock,
  Award,
  User,
  Users,
  Eye,
  ChevronRight
} from 'lucide-react';
import { TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from "@/components/ui/button";
import QuestionCard from '@/components/QuestionCard';
import { useChannelFeed } from '@/hooks/useChannelFeed';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import ChannelPageScaffold from '@/components/channel/ChannelPageScaffold';
import ChannelExpertCard from '@/components/channel/ChannelExpertCard';
import ChannelQuestionSkeleton from '@/components/channel/ChannelQuestionSkeleton';
import ChannelExpertSkeleton from '@/components/channel/ChannelExpertSkeleton';
import ChannelFloatingActionButton from '@/components/channel/ChannelFloatingActionButton';
import PageStateCard from '@/components/common/PageStateCard';
import { buildFromState, navigateBackOr } from '@/utils/navigation';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';

const LifestyleServices = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState(() => sessionStorage.getItem('channel:lifestyle:category') || 'all');
  const [activeTab, setActiveTab] = useState<'everyone' | 'experts'>(() => {
    const cached = sessionStorage.getItem('tab:lifestyle');
    return cached === 'experts' ? 'experts' : 'everyone';
  });
  const categoryRef = useRef<HTMLDivElement>(null);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  usePageScrollMemory('lifestyle');
  
  const formatTime = (dateString: string | null) => {
    if (!dateString) return '时间未知';
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN });
    } catch { return '刚刚'; }
  };

  const formatViewCount = (count: number | null) => {
    if (count === null) return undefined;
    if (count >= 1000) return (count / 1000).toFixed(1) + 'k';
    return count.toString();
  };

  useEffect(() => {
    const checkScroll = () => {
      if (categoryRef.current) {
        const { scrollWidth, clientWidth } = categoryRef.current;
        setShowRightIndicator(scrollWidth > clientWidth);
      }
    };

    checkScroll();
    window.addEventListener('resize', checkScroll);
    return () => window.removeEventListener('resize', checkScroll);
  }, []);

  useEffect(() => {
    sessionStorage.setItem('tab:lifestyle', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('channel:lifestyle:category', activeCategory);
  }, [activeCategory]);

  const scrollCategories = (direction: 'left' | 'right') => {
    if (categoryRef.current) {
      const scrollAmount = direction === 'left' ? -200 : 200;
      categoryRef.current.scrollBy({
        left: scrollAmount,
        behavior: 'smooth'
      });
    }
  };

  const categories = [
    { id: 'all', name: '全部', icon: <Calendar size={16} /> },
    { id: 'housing', name: '租房', icon: <Home size={16} /> },
    { id: 'legal', name: '法律', icon: <Briefcase size={16} /> },
    { id: 'emotional', name: '情感', icon: <Heart size={16} /> },
    { id: 'insurance', name: '保险', icon: <Umbrella size={16} /> },
    { id: 'overseas', name: '海外生活', icon: <Globe size={16} /> }
  ];
  const categoryKeywords: Record<string, string[]> = {
    housing: ['租房', '房东', '中介', '押金', '合租'],
    legal: ['法律', '合同', '仲裁', '维权', '纠纷'],
    emotional: ['情感', '恋爱', '关系', '沟通', '心理'],
    insurance: ['保险', '理赔', '保单', '医疗险', '重疾'],
    overseas: ['海外生活', '移民', '签证', '国际', '境外'],
  };


  const { data: feed, isLoading, error: feedError, refetch } = useChannelFeed(
    'lifestyle-services',
    activeCategory,
    { questionKeywords: categoryKeywords }
  );

  const filteredExperts = feed?.experts || [];
  const filteredQuestions = feed?.questions || [];
  const featuredQuestion = filteredQuestions[0];
  const featuredExpert = filteredExperts[0];
  const featuredTopic = feed?.featured;

  const handleSearch = () => {};

  const handleCategorySelect = (categoryId: string) => {
    setActiveCategory(categoryId);
  };

  const handleViewQuestionDetail = (questionId: string) => {
    navigate(`/question/${questionId}`, { state: buildFromState(location) });
  };

  const handleViewExpertProfile = (expertId: string) => {
    navigate(`/expert-profile/${expertId}`, { state: buildFromState(location) });
  };

  const handleViewFeatured = () => {
    if (featuredTopic?.id) {
      navigate(`/topic/${featuredTopic.id}`, { state: buildFromState(location) });
      return;
    }
    if (featuredQuestion) {
      handleViewQuestionDetail(featuredQuestion.id);
    }
  };

  return (
    <ChannelPageScaffold
      title="生活服务"
      pageClassName="bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white"
      headerGradientClass="bg-gradient-to-r from-orange-500 to-amber-500"
      searchStripClass="bg-orange-50/90 border-orange-100/90"
      searchAccentRingClass="ring-orange-400/25"
      searchInputAccentClass="focus-visible:ring-orange-400/20 focus-visible:border-orange-200"
      searchInputBorderClass="border-orange-200/80"
      searchIconClass="text-orange-400"
      searchNavigateToPath="/search?channel=lifestyle"
      featuredBadgeClass="bg-orange-50 text-orange-600"
      featuredHintClass="text-orange-600"
      activeCategoryClass="bg-orange-500 text-white shadow-sm border-orange-500"
      tabUnderlineClass="bg-gradient-to-r from-app-orange to-amber-500"
      categories={categories}
      activeCategory={activeCategory}
      categoryRef={categoryRef}
      showRightIndicator={showRightIndicator}
      featuredTitle={featuredTopic?.title || featuredQuestion?.title || '租房、法律与保险高频问题'}
      featuredDescription={featuredTopic?.description || featuredQuestion?.content || '把生活服务里最容易踩坑的场景先筛出来，先看精选问答，再决定是否继续咨询专家。'}
      featuredHint={featuredExpert ? `推荐顾问：${featuredExpert.name}` : '优先解决高频生活问题'}
      onBack={() => navigateBackOr(navigate, '/', { location })}
      onScrollCategories={scrollCategories}
      onSelectCategory={handleCategorySelect}
      onViewFeatured={(featuredTopic?.id || featuredQuestion) ? handleViewFeatured : undefined}
      activeTab={activeTab}
      onTabChange={setActiveTab}
    >
          <TabsContent value="everyone" className="mt-0">
            {isLoading ? (
              <ChannelQuestionSkeleton />
            ) : feedError ? (
              <PageStateCard
                compact
                variant="error"
                title="问题加载失败"
                description={feedError instanceof Error ? feedError.message : '请检查网络后重试'}
                actionLabel="重试"
                onAction={() => refetch()}
              />
            ) : filteredQuestions.length === 0 ? (
              <PageStateCard
                compact
                variant="empty"
                title="还没有相关问题"
                description="先发布一个问题，或者切换其它子类目看看。"
              />
            ) : (
              <div className="space-y-4">
                {filteredQuestions.map((question, index) => (
                  <QuestionCard
                    key={question.id}
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
                    delay={0.3 + index * 0.1}
                  />
                ))}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="experts" className="mt-0">
            {isLoading ? (
              <ChannelExpertSkeleton />
            ) : feedError ? (
              <PageStateCard
                compact
                variant="error"
                title="专家加载失败"
                description={feedError instanceof Error ? feedError.message : '请稍后重试'}
                actionLabel="重试"
                onAction={() => refetch()}
              />
            ) : filteredExperts.length === 0 ? (
              <PageStateCard
                compact
                variant="empty"
                title="该分类暂时没有专家"
                description="可以切换分类，或先浏览大家都在问。"
              />
            ) : (
              <div className="space-y-3">
                {filteredExperts.map((expert) => (
                  <ChannelExpertCard
                    key={expert.id}
                    expert={expert}
                    accentBorderClass="border-orange-50"
                    accentTextClass="text-orange-600"
                    accentTagClass="bg-orange-50 text-orange-600"
                    accentSummaryClass="border-orange-200 bg-orange-50/50"
                    ctaClassName="bg-primary text-primary-foreground hover:bg-primary/90"
                    onOpen={() => handleViewExpertProfile(expert.id)}
                    onConsult={() => navigate(`/expert/${expert.id}`, { state: buildFromState(location) })}
                  />
                ))}
              </div>
            )}
          </TabsContent>
      
      <ChannelFloatingActionButton
        className="bg-primary text-primary-foreground shadow-[0_12px_28px_rgba(73,170,155,0.28)]"
        onClick={() => navigate('/new', { state: buildFromState(location) })}
        ariaLabel="发布生活服务需求"
      />
    </ChannelPageScaffold>
  );
};

export default LifestyleServices;
