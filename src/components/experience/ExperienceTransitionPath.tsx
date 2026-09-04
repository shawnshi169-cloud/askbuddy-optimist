import React from 'react';
import { ArrowRight } from 'lucide-react';
import type { ExperienceTransitionV1 } from '../../../packages/shared-types/src/experience-v1';
import { formatTransitionTime } from './experiencePresentation';

interface ExperienceTransitionPathProps {
  transition: ExperienceTransitionV1;
}

const ExperienceTransitionPath: React.FC<ExperienceTransitionPathProps> = ({ transition }) => {
  const time = formatTransitionTime(transition.occurredYear, transition.occurredMonth);

  return (
    <div className="flex min-w-0 items-center gap-2 text-[13px] text-slate-600">
      <span className="truncate">{transition.fromLabel}</span>
      <ArrowRight aria-hidden className="h-3.5 w-3.5 shrink-0 text-app-action" />
      <span className="truncate">{transition.toLabel}</span>
      {time ? <span className="ml-auto shrink-0 text-xs text-slate-400">{time}</span> : null}
    </div>
  );
};

export default ExperienceTransitionPath;
