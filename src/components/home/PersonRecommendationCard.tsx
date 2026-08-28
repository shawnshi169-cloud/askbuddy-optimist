import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExperienceTag, VerificationBadge } from '@/components/ui2';
import type { UIExpertCardModel } from '@/lib/adapters/contentAdapters';

interface PersonRecommendationCardProps {
  person: UIExpertCardModel;
  onOpen: () => void;
}

const PersonRecommendationCard: React.FC<PersonRecommendationCardProps> = ({ person, onOpen }) => (
  <button
    type="button"
    className="app-surface block w-full p-4 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 active:scale-[0.99]"
    onClick={onOpen}
    aria-label={`查看${person.name}的个人主页`}
  >
    <div className="flex items-start gap-3">
      <Avatar className="h-14 w-14 shrink-0 border border-app-border-subtle">
        <AvatarImage src={person.avatar || undefined} alt={person.name} className="object-cover" />
        <AvatarFallback className="bg-app-action-soft text-app-action">
          {person.name.charAt(0)}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-[16px] font-semibold leading-6 text-slate-800">{person.name}</h3>
          {person.verified === true ? <VerificationBadge /> : null}
        </div>
        {person.title ? <p className="mt-0.5 text-[13px] leading-5 text-slate-600">{person.title}</p> : null}
        {person.description ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">{person.description}</p>
        ) : null}
      </div>
    </div>

    {person.tags.length > 0 ? (
      <div className="mt-3 flex flex-wrap gap-1.5">
        {person.tags.slice(0, 3).map((tag) => <ExperienceTag key={tag}>{tag}</ExperienceTag>)}
      </div>
    ) : null}

    <span className="mt-3 flex min-h-11 items-center justify-end gap-1 text-sm font-semibold text-app-action">
      问问TA
      <ArrowRight aria-hidden size={16} />
    </span>
  </button>
);

export const PersonRecommendationSkeleton = () => (
  <div className="app-surface animate-pulse p-4" aria-hidden>
    <div className="flex gap-3">
      <div className="h-14 w-14 rounded-full bg-slate-100" />
      <div className="flex-1 space-y-2 pt-1">
        <div className="h-4 w-2/5 rounded-full bg-slate-100" />
        <div className="h-3 w-3/5 rounded-full bg-slate-100" />
        <div className="h-3 w-full rounded-full bg-slate-100" />
      </div>
    </div>
    <div className="mt-3 flex gap-2">
      <div className="h-6 w-16 rounded-full bg-slate-100" />
      <div className="h-6 w-20 rounded-full bg-slate-100" />
    </div>
  </div>
);

export default PersonRecommendationCard;
