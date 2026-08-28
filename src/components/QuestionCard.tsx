import React from 'react';
import { MessageCircle, Award, Eye } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { useLocation, useNavigate } from 'react-router-dom';
import { buildFromState } from '@/utils/navigation';

interface QuestionCardProps {
  id: string;
  title: string;
  description?: string;
  asker: {
    name: string;
    avatar: string | null;
  };
  time?: string;
  tags: string[];
  points: number | null;
  viewCount?: string;
  answerCount?: number | null;
  delay?: number;
  variant?: 'default' | 'homeFeed';
}

const QuestionCard: React.FC<QuestionCardProps> = ({
  id,
  title,
  description,
  asker,
  time,
  tags,
  points,
  viewCount,
  answerCount,
  delay = 0,
  variant = 'default',
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const openQuestionDetail = () => {
    navigate(`/question/${id}`, { state: buildFromState(location) });
  };

  const openQuestionDetailForAnswer = () => {
    navigate(`/question/${id}`, {
      state: { ...buildFromState(location), intent: 'answer' },
    });
  };

  if (variant === 'homeFeed') {
    const metadata = [
      answerCount !== null && answerCount !== undefined ? `${answerCount}个回答` : null,
      viewCount ? `${viewCount}人看过` : null,
    ].filter(Boolean);

    return (
      <article className="border-b border-app-border-subtle last:border-b-0">
        <button
          type="button"
          className="block w-full px-1 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/25 active:bg-app-action-soft/50"
          onClick={openQuestionDetail}
        >
          <div className="flex items-start justify-between gap-3">
            <h3 className="app-content-title min-w-0 flex-1">{title}</h3>
            {points !== null && points > 0 ? (
              <span className="shrink-0 rounded-full bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-700">
                {points} 积分
              </span>
            ) : null}
          </div>

          {description ? (
            <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{description}</p>
          ) : null}

          {tags.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tags.slice(0, 3).map((tag) => (
                <span key={tag} className="rounded-full bg-app-action-soft px-2 py-1 text-[11px] font-medium text-app-action">
                  #{tag}
                </span>
              ))}
            </div>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
            <span className="min-w-0 truncate">
              {asker.name}{time ? ` · ${time}` : ''}
            </span>
            {metadata.length > 0 ? <span className="shrink-0">{metadata.join(' · ')}</span> : null}
          </div>
        </button>
      </article>
    );
  }

  return (
    <>
      <div
        className="surface-card rounded-3xl p-4 transition-all duration-300 animate-fade-in hover:shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        style={{ animationDelay: `${delay}s` }}
      >
        <button
          type="button"
          className="mb-2 block w-full text-left"
          onClick={openQuestionDetail}
        >
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-base text-left text-foreground leading-7">{title}</h3>
            {viewCount && (
              <div className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
                <Eye size={14} className="flex-shrink-0" />
                <span>{viewCount}</span>
              </div>
            )}
          </div>
        </button>
        
        {description && (
          <button type="button" className="mb-3 block w-full text-left" onClick={openQuestionDetail}>
            <p className="text-sm text-muted-foreground line-clamp-2 leading-6">{description}</p>
          </button>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Avatar className="w-8 h-8 border app-soft-border">
              <AvatarImage src={asker.avatar || undefined} alt={asker.name} className="object-cover" />
              <AvatarFallback>{asker.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div className="text-left">
              <div className="text-xs font-medium text-foreground">{asker.name}</div>
              {time ? <div className="text-xs text-muted-foreground">{time}</div> : null}
            </div>
          </div>
          
          <span className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-orange-50 text-amber-600 text-xs px-2.5 py-1 rounded-full font-medium border border-amber-100 shadow-sm">
            <Award size={14} className="text-amber-500" />
            {points === null ? '积分未提供' : `${points} 积分`}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag, index) => (
              <span key={index} className="inline-block text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium border border-border">
                #{tag}
              </span>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <button
              className="h-8 min-w-[78px] bg-primary text-primary-foreground px-3 rounded-full text-xs font-medium inline-flex items-center justify-center gap-1 shadow-sm hover:shadow-md hover:bg-primary/90 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              onClick={(event) => {
                event.stopPropagation();
                openQuestionDetailForAnswer();
              }}
            >
              <MessageCircle size={12} />
              回答
            </button>
          </div>
        </div>
      </div>
      
    </>
  );
};

export default QuestionCard;
