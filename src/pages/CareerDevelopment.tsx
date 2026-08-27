
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ChevronLeft, 
  Briefcase, 
  FileText, 
  Video, 
  Clock, 
  Users, 
  User, 
  MessageCircleQuestion,
  Bell,
  MessageSquare,
  MessageCircle,
  Plus,
  Globe,
  Award,
  ChevronRight,
  Eye
} from 'lucide-react';
import { TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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

const CareerDevelopment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState(() => sessionStorage.getItem('channel:career:category') || 'all');
  const [activeTab, setActiveTab] = useState<'everyone' | 'experts'>(() => {
    const cached = sessionStorage.getItem('tab:career');
    return cached === 'experts' ? 'experts' : 'everyone';
  });
  const categoryRef = useRef<HTMLDivElement>(null);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  usePageScrollMemory('career');
  
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
    sessionStorage.setItem('tab:career', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('channel:career:category', activeCategory);
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
    { id: 'job', name: '求职', icon: <Briefcase size={16} /> },
    { id: 'resume', name: '简历', icon: <FileText size={16} /> },
    { id: 'interview', name: '面试', icon: <Video size={16} /> },
    { id: 'remote', name: '远程工作', icon: <Clock size={16} /> },
    { id: 'startup', name: '创业', icon: <Users size={16} /> }
  ];
  const categoryKeywords: Record<string, string[]> = {
    job: ['求职', '校招', '招聘', 'offer'],
    resume: ['简历', '履历', '项目经历', '作品集'],
    interview: ['面试', '笔试', '群面', '技术面'],
    remote: ['远程', '自由职业', '在家办公', 'remote'],
    startup: ['创业', '融资', 'BP', '商业计划'],
  };


  const { data: feed, isLoading, error: feedError, refetch } = useChannelFeed(
    'career-development',
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
      title="职业发展"
      pageClassName="bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white"
      headerGradientClass="bg-gradient-to-r from-green-500 to-teal-500"
      searchStripClass="bg-emerald-50/90 border-emerald-100/90"
      searchAccentRingClass="ring-emerald-400/25"
      searchInputAccentClass="focus-visible:ring-emerald-400/20 focus-visible:border-emerald-200"
      searchInputBorderClass="border-emerald-200/80"
      searchIconClass="text-emerald-500"
      searchNavigateToPath="/search?channel=career"
      featuredBadgeClass="bg-green-50 text-green-600"
      featuredHintClass="text-green-600"
      activeCategoryClass="bg-green-500 text-white shadow-sm border-green-500"
      tabUnderlineClass="bg-gradient-to-r from-green-500 to-teal-500"
      categories={categories}
      activeCategory={activeCategory}
      categoryRef={categoryRef}
      showRightIndicator={showRightIndicator}
      featuredTitle={featuredTopic?.title || featuredQuestion?.title || '求职、跳槽与面试策略速览'}
      featuredDescription={featuredTopic?.description || featuredQuestion?.content || '先看大厂求职、简历优化、远程工作和创业方向的热门讨论，再决定找谁继续咨询。'}
      featuredHint={featuredExpert ? `推荐顾问：${featuredExpert.name}` : '聚焦求职转化效率'}
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
                    accentBorderClass="border-green-50"
                    accentTextClass="text-green-600"
                    accentTagClass="bg-green-50 text-green-600"
                    accentSummaryClass="border-green-200 bg-green-50/60"
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
        ariaLabel="发布职业发展问题"
      />
    </ChannelPageScaffold>
  );
};

export default CareerDevelopment;
