import React from 'react';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export type SearchTab = 'all' | 'question' | 'expert' | 'post' | 'skill';

const SEARCH_TABS: Array<{ value: SearchTab; label: string }> = [
  { value: 'all', label: '综合' },
  { value: 'question', label: '问题' },
  { value: 'expert', label: '人' },
  { value: 'post', label: '动态' },
  { value: 'skill', label: '服务' },
];

interface SearchResultTabsProps {
  value: SearchTab;
}

const SearchResultTabs: React.FC<SearchResultTabsProps> = ({ value }) => (
  <TabsList
    aria-label="搜索结果类型"
    className="grid h-auto w-full grid-cols-5 rounded-none border-b border-app-border-subtle bg-transparent p-0"
  >
    {SEARCH_TABS.map((tab) => (
      <TabsTrigger
        key={tab.value}
        value={tab.value}
        className="relative min-h-11 rounded-none px-1 py-3 text-[15px] font-medium text-slate-500 shadow-none transition-colors duration-150 focus-visible:z-10 focus-visible:ring-app-action/30 data-[state=active]:bg-transparent data-[state=active]:font-semibold data-[state=active]:text-app-action data-[state=active]:shadow-none"
      >
        {tab.label}
        {value === tab.value ? (
          <span aria-hidden className="absolute inset-x-0 bottom-0 mx-auto h-0.5 w-7 rounded-full bg-app-action" />
        ) : null}
      </TabsTrigger>
    ))}
  </TabsList>
);

export default SearchResultTabs;
