import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  label?: string;
}

const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  label = '已核验',
  className,
  ...props
}) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 rounded-full bg-app-action-soft px-2 py-1 text-[11px] font-medium leading-none text-app-action',
      className,
    )}
    {...props}
  >
    <Check aria-hidden size={12} strokeWidth={2.5} />
    {label}
  </span>
);

export default VerificationBadge;
