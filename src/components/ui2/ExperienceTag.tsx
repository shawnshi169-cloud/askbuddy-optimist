import React from 'react';
import { cn } from '@/lib/utils';

interface ExperienceTagProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
}

const ExperienceTag: React.FC<ExperienceTagProps> = ({ children, className, ...props }) => (
  <span
    className={cn(
      'inline-flex items-center rounded-full border border-app-border-subtle bg-slate-50 px-2.5 py-1 text-xs font-medium leading-4 text-slate-600',
      className,
    )}
    {...props}
  >
    #{children}
  </span>
);

export default ExperienceTag;
