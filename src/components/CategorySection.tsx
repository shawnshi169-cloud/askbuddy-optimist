
import React from 'react';
import { GraduationCap, Briefcase, Home, Camera, Plane, Heart, TrendingUp, Smartphone, HelpCircle, LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCategories } from '@/hooks/useCategories';
import { buildFromState } from '@/utils/navigation';
import PageStateCard from '@/components/common/PageStateCard';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

type CategorySectionVariant = 'default' | 'home';

// Map icon names from DB to actual Lucide components
const iconMap: Record<string, LucideIcon> = {
  GraduationCap,
  Briefcase,
  Home,
  Camera,
  Plane,
  Heart,
  TrendingUp,
  Smartphone,
  HelpCircle,
};

// Map category names to routes
const routeMap: Record<string, string> = {
  '教育学习': '/education',
  '职业发展': '/career',
  '生活服务': '/lifestyle',
  '兴趣技能': '/hobbies',
};

// Gradient styles for each position
const gradients = [
  'from-blue-400 to-indigo-500',
  'from-green-400 to-teal-500',
  'from-orange-400 to-amber-500',
  'from-pink-400 to-rose-500',
  'from-cyan-400 to-sky-500',
  'from-red-400 to-pink-500',
  'from-yellow-400 to-orange-500',
  'from-indigo-400 to-purple-500',
  'from-gray-400 to-slate-500',
];

const homeAccents = [
  'bg-blue-50 text-blue-600',
  'bg-teal-50 text-teal-700',
  'bg-orange-50 text-orange-600',
  'bg-violet-50 text-violet-600',
];

const presentationCategoryFixtures = [
  { id: 'education', name: '教育学习', icon: 'GraduationCap', gradient: 'from-blue-400 to-indigo-500', path: '/education' },
  { id: 'career', name: '职业发展', icon: 'Briefcase', gradient: 'from-green-400 to-teal-500', path: '/career' },
  { id: 'lifestyle', name: '生活服务', icon: 'Home', gradient: 'from-orange-400 to-amber-500', path: '/lifestyle' },
  { id: 'hobbies', name: '兴趣技能', icon: 'Camera', gradient: 'from-pink-400 to-rose-500', path: '/hobbies' },
];

interface CategorySectionProps {
  variant?: CategorySectionVariant;
}

const CategorySection: React.FC<CategorySectionProps> = ({ variant = 'default' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: dbCategories, isLoading, isError, error, refetch } = useCategories();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();

  // Use first 4 categories for home page grid
  const categories = dbCategories && dbCategories.length > 0
    ? dbCategories.slice(0, 4).map((cat, index) => ({
        id: cat.id,
        name: cat.name,
        icon: cat.icon || 'HelpCircle',
        gradient: gradients[index] || gradients[0],
        path: routeMap[cat.name] || `/search?category=${encodeURIComponent(cat.name)}`,
      }))
    : presentationFixturesEnabled
      ? presentationCategoryFixtures
      : [];

  const handleCategoryClick = (path: string) => {
    navigate(path, { state: buildFromState(location) });
  };

  if (isLoading) {
    if (variant === 'home') {
      return (
        <div className="grid grid-cols-4 gap-3 px-4 py-5" role="status" aria-label="正在加载分类">
          {[0, 1, 2, 3].map((item) => (
            <div key={item} className="flex animate-pulse flex-col items-center gap-2">
              <div className="h-12 w-12 rounded-2xl bg-slate-100" />
              <div className="h-3 w-12 rounded-full bg-slate-100" />
            </div>
          ))}
        </div>
      );
    }
    return <PageStateCard compact variant="loading" title="正在加载分类…" className="mx-4 my-4" />;
  }

  if (isError && !presentationFixturesEnabled) {
    return (
      <PageStateCard
        compact
        variant="error"
        title="分类加载失败"
        description={error instanceof Error ? error.message : '请稍后重试'}
        actionLabel="重试"
        onAction={() => void refetch()}
        className={variant === 'home' ? 'app-surface mx-4 my-4 rounded-2xl shadow-none' : 'mx-4 my-4'}
      />
    );
  }

  if (categories.length === 0) {
    return (
      <PageStateCard
        compact
        title="暂无可用分类"
        className={variant === 'home' ? 'app-surface mx-4 my-4 rounded-2xl shadow-none' : 'mx-4 my-4'}
      />
    );
  }

  if (variant === 'home') {
    return (
      <div className="grid grid-cols-4 gap-3 px-4 py-5">
        {categories.map((category, index) => {
          const IconComponent = iconMap[category.icon] || HelpCircle;
          return (
            <button
              type="button"
              key={category.id}
              className="flex min-h-[76px] flex-col items-center justify-start gap-2 rounded-2xl px-1 py-1 text-slate-700 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 active:scale-[0.98]"
              onClick={() => handleCategoryClick(category.path)}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${homeAccents[index] || homeAccents[0]}`}>
                <IconComponent aria-hidden size={22} strokeWidth={2} />
              </span>
              <span className="text-center text-xs font-semibold leading-4">{category.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-4 pb-5 pt-4 animate-fade-in animate-delay-1">
      <div className="grid grid-cols-4 gap-4">
        {categories.map((category, index) => {
          const IconComponent = iconMap[category.icon] || HelpCircle;
          return (
            <button
              type="button"
              key={category.id}
              className="flex flex-col items-center animate-slide-up cursor-pointer"
              style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
              onClick={() => handleCategoryClick(category.path)}
            >
              <div className={`category-icon mb-2 bg-gradient-to-br ${category.gradient} shadow-[0_10px_18px_rgba(15,23,42,0.08)] hover:shadow-[0_12px_22px_rgba(15,23,42,0.12)] transform hover:scale-105 transition-all duration-300 rounded-2xl`}>
                <IconComponent size={22} />
              </div>
              <span className="text-xs text-center font-semibold leading-5 tracking-[-0.01em]">{category.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategorySection;
