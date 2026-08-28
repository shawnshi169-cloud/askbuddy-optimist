import React from 'react';
import { cn } from '@/lib/utils';

interface SectionHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  subtitle?: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  leading,
  trailing,
  className,
  ...props
}) => (
  <div className={cn('flex items-start justify-between gap-4', className)} {...props}>
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {leading}
        <h2 className="app-section-title">{title}</h2>
      </div>
      {subtitle ? <p className="app-section-subtitle">{subtitle}</p> : null}
    </div>
    {trailing ? <div className="shrink-0">{trailing}</div> : null}
  </div>
);

export default SectionHeader;
