import React from 'react';
import { AlertCircle, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HomeSectionStateProps {
  variant?: 'empty' | 'error';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const HomeSectionState: React.FC<HomeSectionStateProps> = ({
  variant = 'empty',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  const Icon = variant === 'error' ? AlertCircle : Inbox;

  return (
    <div className="app-surface px-5 py-8 text-center">
      <Icon
        aria-hidden
        className={variant === 'error' ? 'mx-auto h-8 w-8 text-red-400' : 'mx-auto h-8 w-8 text-slate-300'}
      />
      <p className="mt-3 text-sm font-semibold text-slate-800">{title}</p>
      {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      {actionLabel && onAction ? (
        <Button type="button" variant={variant === 'error' ? 'quiet' : 'action'} className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  );
};

export default HomeSectionState;
