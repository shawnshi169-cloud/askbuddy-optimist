import React from 'react';
import { SectionHeader } from '@/components/ui2';

interface SearchSectionProps {
  title: string;
  children: React.ReactNode;
  onViewMore?: () => void;
}

const SearchSection: React.FC<SearchSectionProps> = ({ title, children, onViewMore }) => (
  <section>
    <SectionHeader
      title={title}
      trailing={onViewMore ? (
        <button
          type="button"
          className="inline-flex min-h-11 items-center px-1 text-sm font-medium text-app-action focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30"
          onClick={onViewMore}
        >
          查看更多
        </button>
      ) : undefined}
    />
    <div className="mt-2 divide-y divide-app-border-subtle border-y border-app-border-subtle bg-white">
      {children}
    </div>
  </section>
);

export default SearchSection;
