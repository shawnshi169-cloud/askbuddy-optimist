import React from 'react';
import { Briefcase, Camera, GraduationCap, Home, type LucideIcon } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildFromState } from '@/utils/navigation';
import {
  PRODUCT_CHANNEL_CATALOG,
  type ProductChannelSlug,
} from '../../packages/shared-types/src/product-channels';

type CategorySectionVariant = 'default' | 'home';

interface ChannelPresentation {
  route: string;
  icon: LucideIcon;
  homeAccent: string;
  gradient: string;
}

const channelPresentation: Record<ProductChannelSlug, ChannelPresentation> = {
  'education-learning': {
    route: '/education',
    icon: GraduationCap,
    homeAccent: 'bg-blue-50 text-blue-600',
    gradient: 'from-blue-400 to-indigo-500',
  },
  'career-development': {
    route: '/career',
    icon: Briefcase,
    homeAccent: 'bg-teal-50 text-teal-700',
    gradient: 'from-green-400 to-teal-500',
  },
  'lifestyle-services': {
    route: '/lifestyle',
    icon: Home,
    homeAccent: 'bg-orange-50 text-orange-600',
    gradient: 'from-orange-400 to-amber-500',
  },
  'hobbies-skills': {
    route: '/hobbies',
    icon: Camera,
    homeAccent: 'bg-violet-50 text-violet-600',
    gradient: 'from-pink-400 to-rose-500',
  },
};

interface CategorySectionProps {
  variant?: CategorySectionVariant;
  onBeforeNavigate?: () => void;
}

const CategorySection: React.FC<CategorySectionProps> = ({
  variant = 'default',
  onBeforeNavigate,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const channels = PRODUCT_CHANNEL_CATALOG.map((channel) => ({
    ...channel,
    ...channelPresentation[channel.slug],
  }));

  const handleCategoryClick = (path: string) => {
    onBeforeNavigate?.();
    navigate(path, { state: buildFromState(location) });
  };

  if (variant === 'home') {
    return (
      <div className="grid grid-cols-4 gap-3 px-4 py-5">
        {channels.map((channel) => {
          const Icon = channel.icon;
          return (
            <button
              type="button"
              key={channel.slug}
              className="flex min-h-[76px] flex-col items-center justify-start gap-2 rounded-2xl px-1 py-1 text-slate-700 transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 active:scale-[0.98]"
              onClick={() => handleCategoryClick(channel.route)}
            >
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${channel.homeAccent}`}>
                <Icon aria-hidden size={22} strokeWidth={2} />
              </span>
              <span className="text-center text-xs font-semibold leading-4">{channel.label}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="px-4 pb-5 pt-4 animate-fade-in animate-delay-1">
      <div className="grid grid-cols-4 gap-4">
        {channels.map((channel, index) => {
          const Icon = channel.icon;
          return (
            <button
              type="button"
              key={channel.slug}
              className="flex cursor-pointer flex-col items-center animate-slide-up"
              style={{ animationDelay: `${index * 0.1 + 0.2}s` }}
              onClick={() => handleCategoryClick(channel.route)}
            >
              <div className={`category-icon mb-2 transform rounded-2xl bg-gradient-to-br ${channel.gradient} shadow-[0_10px_18px_rgba(15,23,42,0.08)] transition-all duration-300 hover:scale-105 hover:shadow-[0_12px_22px_rgba(15,23,42,0.12)]`}>
                <Icon size={22} />
              </div>
              <span className="text-center text-xs font-semibold leading-5 tracking-[-0.01em]">{channel.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default CategorySection;
