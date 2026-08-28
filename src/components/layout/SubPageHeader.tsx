import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { navigateBackOr } from '@/utils/navigation';
import { isNativeApp } from '@/utils/platform';
import { cn } from '@/lib/utils';

type SubPageHeaderVariant = 'legacy' | 'brand' | 'content';

interface SubPageHeaderProps {
  title: string;
  right?: React.ReactNode;
  onBack?: () => void;
  headerClassName?: string;
  variant?: SubPageHeaderVariant;
}

const variantClassNames: Record<SubPageHeaderVariant, { header: string; back: string }> = {
  legacy: {
    header: 'border-white/20 app-header-bg text-white shadow-sm',
    back: 'text-white hover:bg-white/15 hover:text-white',
  },
  brand: {
    header: 'border-app-action/10 bg-app-brand-mint text-slate-800',
    back: 'text-app-action hover:bg-white/35 hover:text-app-action',
  },
  content: {
    header: 'border-app-border-subtle bg-app-page/95 text-slate-800 backdrop-blur-sm',
    back: 'text-slate-700 hover:bg-app-action-soft hover:text-app-action',
  },
};

const SubPageHeader: React.FC<SubPageHeaderProps> = ({
  title,
  right,
  onBack,
  headerClassName,
  variant = 'legacy',
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const nativeMode = isNativeApp();

  return (
    <>
      <div
        className={cn(
          'fixed top-0 z-[90] w-full border-b',
          variantClassNames[variant].header,
          nativeMode ? 'left-0' : 'left-1/2 max-w-md -translate-x-1/2',
          headerClassName,
        )}
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex h-12 items-center justify-between px-4">
          <div className="flex min-w-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack || (() => navigateBackOr(navigate, '/', { location }))}
              className={cn('mr-2 h-11 w-11 shrink-0', variantClassNames[variant].back)}
              aria-label="返回"
            >
              <ArrowLeft size={24} />
            </Button>
            <h1 className="truncate text-lg font-semibold">{title}</h1>
          </div>
          {right ? <div className="ml-3 shrink-0">{right}</div> : <div className="w-10 shrink-0" />}
        </div>
      </div>
      <div aria-hidden style={{ height: 'calc(env(safe-area-inset-top) + 3rem)' }} />
    </>
  );
};

export default SubPageHeader;
