import React from 'react';

export const SearchResultsSkeleton = () => (
  <div role="status" aria-label="正在搜索" className="animate-pulse">
    <div className="grid grid-cols-5 border-b border-app-border-subtle py-3">
      {[0, 1, 2, 3, 4].map((item) => <div key={item} className="mx-auto h-4 w-8 rounded-full bg-slate-100" />)}
    </div>
    <div className="pt-6">
      <div className="h-5 w-20 rounded-full bg-slate-100" />
      <div className="mt-2 divide-y divide-app-border-subtle border-y border-app-border-subtle bg-white">
        {[0, 1, 2].map((item) => (
          <div key={item} className="py-4">
            <div className="h-4 w-4/5 rounded-full bg-slate-100" />
            <div className="mt-3 h-3 w-full rounded-full bg-slate-100" />
            <div className="mt-2 h-3 w-3/4 rounded-full bg-slate-100" />
            <div className="mt-3 h-3 w-2/5 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
    <div className="pt-6">
      <div className="h-5 w-24 rounded-full bg-slate-100" />
      <div className="mt-2 divide-y divide-app-border-subtle border-y border-app-border-subtle bg-white">
        {[0, 1].map((item) => (
          <div key={item} className="flex gap-3 py-4">
            <div className="h-12 w-12 shrink-0 rounded-full bg-slate-100" />
            <div className="flex-1 space-y-2 pt-1">
              <div className="h-4 w-2/5 rounded-full bg-slate-100" />
              <div className="h-3 w-3/5 rounded-full bg-slate-100" />
              <div className="h-3 w-full rounded-full bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

interface SearchEmptyStateProps {
  title: string;
  description?: string;
  primaryLabel?: string;
  onPrimary?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  children?: React.ReactNode;
}

export const SearchEmptyState: React.FC<SearchEmptyStateProps> = ({
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  children,
}) => (
  <div className="py-10 text-center">
    <h2 className="text-[17px] font-semibold leading-6 text-slate-800">{title}</h2>
    {description ? <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">{description}</p> : null}
    {children}
    {(primaryLabel && onPrimary) || (secondaryLabel && onSecondary) ? (
      <div className="mt-5 flex flex-col items-center justify-center gap-2 sm:flex-row">
        {primaryLabel && onPrimary ? (
          <button type="button" className="app-btn-action min-w-32" onClick={onPrimary}>{primaryLabel}</button>
        ) : null}
        {secondaryLabel && onSecondary ? (
          <button type="button" className="app-btn-quiet min-w-24" onClick={onSecondary}>{secondaryLabel}</button>
        ) : null}
      </div>
    ) : null}
  </div>
);

export const SearchErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="py-10 text-center" role="alert">
    <h2 className="text-[17px] font-semibold leading-6 text-slate-800">搜索暂时不可用</h2>
    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">
      网络或服务似乎遇到了问题，请稍后重试。
    </p>
    <button type="button" className="app-btn-action mt-5 min-w-28" onClick={onRetry}>重试</button>
  </div>
);
