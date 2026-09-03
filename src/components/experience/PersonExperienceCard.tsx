import React from 'react';
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Eye,
  EyeOff,
  MapPin,
  Pencil,
  Trash2,
} from 'lucide-react';
import type {
  ExperienceVisibilityV1,
  OwnerPersonExperienceV1,
  PublicPersonExperienceV1,
} from '../../../packages/shared-types/src/experience-v1';
import { cn } from '@/lib/utils';
import ExperienceTransitionPath from './ExperienceTransitionPath';
import {
  EXPERIENCE_KIND_LABELS,
  formatExperienceTimeRange,
} from './experiencePresentation';

type ExperienceCardData = PublicPersonExperienceV1 | OwnerPersonExperienceV1;

interface PersonExperienceCardProps {
  experience: ExperienceCardData;
  ownerMode?: boolean;
  isFirst?: boolean;
  isLast?: boolean;
  busy?: boolean;
  onEdit?: () => void;
  onVisibilityChange?: (visibility: ExperienceVisibilityV1) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
}

const PersonExperienceCard: React.FC<PersonExperienceCardProps> = ({
  experience,
  ownerMode = false,
  isFirst = false,
  isLast = false,
  busy = false,
  onEdit,
  onVisibilityChange,
  onMoveUp,
  onMoveDown,
  onDelete,
}) => {
  const time = formatExperienceTimeRange(experience.timeRange);
  const location = experience.location?.label || experience.location?.city || null;
  const visibility = experience.visibility;

  return (
    <article className="app-surface rounded-[20px] border px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-app-action">
            {EXPERIENCE_KIND_LABELS[experience.kind]}
          </p>
          <h3 className="mt-1.5 text-[16px] font-semibold leading-6 text-slate-900">
            {experience.title}
          </h3>
        </div>
        {ownerMode ? (
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium',
              visibility === 'public'
                ? 'bg-app-action-soft text-app-action'
                : 'bg-slate-100 text-slate-500',
            )}
          >
            {visibility === 'public' ? <Eye aria-hidden size={12} /> : <EyeOff aria-hidden size={12} />}
            {visibility === 'public' ? '公开' : '仅自己可见'}
          </span>
        ) : null}
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-6 text-slate-700">
        {experience.description}
      </p>

      {time || location ? (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-500">
          {time ? (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden size={14} />
              {time}
            </span>
          ) : null}
          {location ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPin aria-hidden size={14} />
              {location}
            </span>
          ) : null}
        </div>
      ) : null}

      {experience.canShare.length > 0 ? (
        <div className="mt-4 border-t border-app-border-subtle pt-3">
          <p className="text-xs font-medium text-slate-500">可以和TA聊</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {experience.canShare.map((item) => (
              <span key={item} className="rounded-full bg-slate-50 px-2.5 py-1 text-xs text-slate-600">
                {item}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {experience.transitions.length > 0 ? (
        <div className="mt-4 space-y-2 border-t border-app-border-subtle pt-3">
          <p className="text-xs font-medium text-slate-500">经历中的转变</p>
          {experience.transitions.map((transition) => (
            <ExperienceTransitionPath key={transition.transitionId} transition={transition} />
          ))}
        </div>
      ) : null}

      {ownerMode ? (
        <div className="mt-4 grid grid-cols-5 border-t border-app-border-subtle pt-2">
          <button
            type="button"
            className="flex min-h-11 items-center justify-center text-slate-500 disabled:opacity-30"
            onClick={onMoveUp}
            disabled={busy || isFirst}
            aria-label="上移这段经历"
          >
            <ArrowUp aria-hidden size={18} />
          </button>
          <button
            type="button"
            className="flex min-h-11 items-center justify-center text-slate-500 disabled:opacity-30"
            onClick={onMoveDown}
            disabled={busy || isLast}
            aria-label="下移这段经历"
          >
            <ArrowDown aria-hidden size={18} />
          </button>
          <button
            type="button"
            className="flex min-h-11 items-center justify-center text-slate-500 disabled:opacity-40"
            onClick={() => onVisibilityChange?.(visibility === 'public' ? 'private' : 'public')}
            disabled={busy}
            aria-label={visibility === 'public' ? '设为仅自己可见' : '公开这段经历'}
          >
            {visibility === 'public' ? <EyeOff aria-hidden size={18} /> : <Eye aria-hidden size={18} />}
          </button>
          <button
            type="button"
            className="flex min-h-11 items-center justify-center text-slate-500 disabled:opacity-40"
            onClick={onEdit}
            disabled={busy}
            aria-label="编辑这段经历"
          >
            <Pencil aria-hidden size={18} />
          </button>
          <button
            type="button"
            className="flex min-h-11 items-center justify-center text-rose-500 disabled:opacity-40"
            onClick={onDelete}
            disabled={busy}
            aria-label="删除这段经历"
          >
            <Trash2 aria-hidden size={18} />
          </button>
        </div>
      ) : null}
    </article>
  );
};

export default PersonExperienceCard;
