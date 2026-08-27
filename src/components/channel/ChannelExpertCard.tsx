import React from 'react';
import { Award, Clock, MessageSquare, Users } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface ChannelExpertCardProps {
  expert: {
    id: string;
    name: string;
    avatar: string | null;
    title: string;
    description: string;
    tags: string[];
    rating: number | null;
    responseRate: string | null;
    orderCount: string | null;
  };
  accentBorderClass: string;
  accentTextClass: string;
  accentTagClass: string;
  accentSummaryClass: string;
  ctaClassName: string;
  onOpen: () => void;
  onConsult: () => void;
}

const ChannelExpertCard: React.FC<ChannelExpertCardProps> = ({
  expert,
  accentBorderClass,
  accentTextClass,
  accentTagClass,
  accentSummaryClass,
  ctaClassName,
  onOpen,
  onConsult,
}) => {
  return (
    <div
      className="surface-card cursor-pointer rounded-2xl p-3.5 shadow-sm transition-all duration-200 hover:shadow-md"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="block w-full text-left">
        <div className="flex items-start justify-between">
        <div className="flex items-center gap-2 text-left">
          <Avatar className={`h-10 w-10 border ${accentBorderClass}`}>
            <AvatarImage src={expert.avatar || undefined} alt={expert.name} className="object-cover" />
            <AvatarFallback>{expert.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="text-sm font-semibold leading-5 text-foreground">{expert.name}</h3>
            <p className={`text-xs ${accentTextClass}`}>{expert.title}</p>
          </div>
        </div>

        <div className="flex flex-col items-end">
          <div className="flex items-center gap-1 text-yellow-500">
            <Award size={12} />
            <span className="text-xs font-medium">{expert.rating ?? '暂无'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-primary">
            <Clock size={10} />
            <span>{expert.responseRate ?? '暂无'}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users size={10} />
            <span>{expert.orderCount ?? '暂无'}</span>
          </div>
        </div>
        </div>
      </div>

      <div className="mt-2 flex">
        <div className={`mr-2 line-clamp-2 flex-1 rounded-r-md border-l-2 pl-2 py-0.5 text-left text-xs leading-5 text-muted-foreground ${accentSummaryClass}`}>
          {expert.description}
        </div>

        <Button
          onClick={(event) => {
            event.stopPropagation();
            onConsult();
          }}
          className={`h-9 min-w-[94px] rounded-full px-3 text-xs text-white shadow-md transition-all hover:shadow-lg active:translate-y-0 ${ctaClassName}`}
        >
          <MessageSquare size={10} className="mr-1" />
          找我问问
        </Button>
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        {expert.tags.map((tag, index) => (
          <span key={index} className={`rounded-full px-2 py-0.5 text-xs ${accentTagClass}`}>
            #{tag}
          </span>
        ))}
      </div>
    </div>
  );
};

export default ChannelExpertCard;
