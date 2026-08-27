
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  ChevronLeft, 
  Camera, 
  Music, 
  Palette, 
  Dumbbell, 
  Utensils,
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

const HobbiesSkills = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeCategory, setActiveCategory] = useState(() => sessionStorage.getItem('channel:hobbies:category') || 'all');
  const [activeTab, setActiveTab] = useState<'everyone' | 'experts'>(() => {
    const cached = sessionStorage.getItem('tab:hobbies');
    return cached === 'experts' ? 'experts' : 'everyone';
  });
  const categoryRef = useRef<HTMLDivElement>(null);
  const [showRightIndicator, setShowRightIndicator] = useState(false);
  usePageScrollMemory('hobbies');
  
  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN });
    } catch { return '刚刚'; }
  };

  const formatViewCount = (count: number) => {
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
    sessionStorage.setItem('tab:hobbies', activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem('channel:hobbies:category', activeCategory);
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
    { id: 'photography', name: '摄影', icon: <Camera size={16} /> },
    { id: 'music', name: '音乐', icon: <Music size={16} /> },
    { id: 'art', name: '艺术', icon: <Palette size={16} /> },
    { id: 'fitness', name: '健身', icon: <Dumbbell size={16} /> },
    { id: 'cooking', name: '烹饪', icon: <Utensils size={16} /> }
  ];
  const categoryKeywords: Record<string, string[]> = {
    photography: ['摄影', '拍照', '镜头', '修图'],
    music: ['音乐', '作曲', '编曲', '乐器', '钢琴'],
    art: ['艺术', '绘画', '素描', '油画', '水彩'],
    fitness: ['健身', '减脂', '训练', '增肌', '体态'],
    cooking: ['烹饪', '做饭', '菜谱', '烘焙', '料理'],
  };


  const { data: feed, isLoading, error: feedError, refetch } = useChannelFeed(
    'hobbies-skills',
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
      title="兴趣技能"
      pageClassName="bg-gradient-to-b from-[rgb(248,253,251)] via-white to-white"
      headerGradientClass="bg-gradient-to-r from-pink-500 to-rose-500"
      searchStripClass="bg-rose-50/90 border-rose-100/90"
      searchAccentRingClass="ring-rose-400/25"
      searchInputAccentClass="focus-visible:ring-rose-400/20 focus-visible:border-rose-200"
      searchInputBorderClass="border-rose-200/80"
      searchIconClass="text-rose-400"
      searchNavigateToPath="/search?channel=hobbies"
      featuredBadgeClass="bg-rose-50 text-rose-600"
      featuredHintClass="text-rose-600"
      activeCategoryClass="bg-rose-500 text-white shadow-sm border-rose-500"
      tabUnderlineClass="bg-gradient-to-r from-rose-500 to-pink-500"
      categories={categories}
      activeCategory={activeCategory}
      categoryRef={categoryRef}
      showRightIndicator={showRightIndicator}
      featuredTitle={featuredTopic?.title || featuredQuestion?.title || '摄影、音乐与创作技能精选'}
      featuredDescription={featuredTopic?.description || featuredQuestion?.content || '把摄影、音乐、艺术、健身和烹饪里最值得看的高质量内容先整理出来，适合快速浏览。'}
      featuredHint={featuredExpert ? `推荐达人：${featuredExpert.name}` : '适合先看精选再提问'}
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
                    accentBorderClass="border-rose-50"
                    accentTextClass="text-rose-600"
                    accentTagClass="bg-rose-50 text-rose-600"
                    accentSummaryClass="border-rose-200 bg-rose-50/50"
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
        ariaLabel="发布兴趣技能需求"
      />
    </ChannelPageScaffold>
  );
};

export default HobbiesSkills;
