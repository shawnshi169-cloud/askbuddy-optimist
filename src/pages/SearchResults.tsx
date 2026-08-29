import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import SearchBar from '@/components/SearchBar';
import {
  SearchEmptyState,
  SearchErrorState,
  SearchPersonItem,
  SearchPostItem,
  SearchQuestionItem,
  SearchResultTabs,
  SearchResultsSkeleton,
  SearchSection,
  SearchServiceItem,
  type SearchTab,
} from '@/components/search';
import {
  getSearchRelatedTerms,
  popularSearchTerms,
  useHotKeywords,
  useSearch,
} from '@/hooks/useSearch';
import { demoExperts, demoQuestions } from '@/lib/demoData';
import { buildFromState, navigateBackOr } from '@/utils/navigation';
import { isNativeApp } from '@/utils/platform';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

const SEARCH_HISTORY_KEY = 'searchHistory';
type QuestionSort = 'relevance' | 'latest';

const channelContexts = {
  education: { placeholder: '搜学校、申请、学习经历', iconClass: 'text-blue-500', backTo: '/education' },
  career: { placeholder: '搜求职、行业或职场经历', iconClass: 'text-app-action', backTo: '/career' },
  lifestyle: { placeholder: '搜租房、城市或生活经验', iconClass: 'text-orange-500', backTo: '/lifestyle' },
  hobbies: { placeholder: '搜兴趣、技能或相关经历', iconClass: 'text-violet-500', backTo: '/hobbies' },
  default: { placeholder: '搜问题、经历或人', iconClass: 'text-app-action', backTo: '/' },
} as const;

const SearchResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const nativeMode = isNativeApp();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';
  const channel = searchParams.get('channel') || 'default';
  const context = channelContexts[channel as keyof typeof channelContexts] || channelContexts.default;
  const historyStorageKey = `${SEARCH_HISTORY_KEY}:${channel}`;
  const uiStorageKey = `search-ui:${channel}`;
  const scrollMemoryKey = `search:${channel}:${initialQuery.trim().toLowerCase() || 'empty'}`;

  usePageScrollMemory(scrollMemoryKey);

  const readUiState = () => {
    const raw = sessionStorage.getItem(uiStorageKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as {
        activeTab?: SearchTab;
        questionSort?: QuestionSort | 'hot';
        questionCategoryFilter?: string;
      };
    } catch {
      return null;
    }
  };

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>(() => {
    const cached = readUiState()?.activeTab;
    return cached === 'question' || cached === 'expert' || cached === 'post' || cached === 'skill' ? cached : 'all';
  });
  const [questionSort, setQuestionSort] = useState<QuestionSort>(() => (
    readUiState()?.questionSort === 'latest' ? 'latest' : 'relevance'
  ));
  const [questionCategoryFilter, setQuestionCategoryFilter] = useState(
    () => readUiState()?.questionCategoryFilter || '全部',
  );
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);

  const { data: results, isLoading, error, refetch } = useSearch(debouncedQuery);
  const { data: hotKeywords = [] } = useHotKeywords('all');
  const { user } = useAuth();

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(searchQuery), 400);
    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const latestQuery = new URLSearchParams(location.search).get('q') || '';
    setSearchQuery((current) => current === latestQuery ? current : latestQuery);
    setDebouncedQuery((current) => current === latestQuery ? current : latestQuery);
  }, [location.search]);

  useEffect(() => {
    const nextParams = new URLSearchParams(location.search);
    const currentQuery = nextParams.get('q') || '';
    const currentSearchText = location.search.startsWith('?') ? location.search.slice(1) : location.search;

    if (debouncedQuery) nextParams.set('q', debouncedQuery);
    else if (currentQuery) nextParams.delete('q');

    const nextSearch = nextParams.toString();
    if (nextSearch !== currentSearchText) {
      navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
    }
  }, [debouncedQuery, location.pathname, location.search, navigate]);

  useEffect(() => {
    const stored = localStorage.getItem(historyStorageKey) || localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed: unknown = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((item): item is string => typeof item === 'string'));
      }
    } catch {
      localStorage.removeItem(historyStorageKey);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    sessionStorage.setItem(uiStorageKey, JSON.stringify({ activeTab, questionSort, questionCategoryFilter }));
  }, [activeTab, questionCategoryFilter, questionSort, uiStorageKey]);

  useEffect(() => {
    if (error) console.error('Search request failed', error);
  }, [error]);

  const commitSearch = (term: string) => {
    const normalized = term.trim();
    if (!normalized) return;
    setSearchQuery(normalized);
    setDebouncedQuery(normalized);
    setRecentSearches((current) => {
      const next = [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 8);
      localStorage.setItem(historyStorageKey, JSON.stringify(next));
      return next;
    });

    if (user) {
      void supabase
        .rpc('upsert_search_history', { p_query_text: normalized, p_query_type: 'all' })
        .then(({ error: historyError }) => {
          if (historyError) console.warn('Search history write failed', historyError.message);
        });
    }
  };

  const selectSearchTerm = (term: string) => {
    commitSearch(term);
    setSearchFocused(false);
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDebouncedQuery('');
    setSearchFocused(true);
  };

  const resultBatchSize = (results?.questions.length || 0)
    + (results?.experts.length || 0)
    + (results?.skills.length || 0)
    + (results?.posts.length || 0);
  const hasQuery = debouncedQuery.trim().length > 0;
  const hasResults = resultBatchSize > 0;
  const noResults = hasQuery && !isLoading && !error && !hasResults;
  const showSuggestions = searchFocused && searchQuery.trim().length > 0;
  const showDefaultState = !hasQuery && !showSuggestions;

  const displayHotTerms = useMemo(
    () => hotKeywords.length > 0 ? hotKeywords : presentationFixturesEnabled ? popularSearchTerms : [],
    [hotKeywords, presentationFixturesEnabled],
  );

  const suggestionTerms = useMemo(() => {
    const keyword = searchQuery.trim().toLowerCase();
    if (!keyword) return [] as string[];
    const relatedTerms = getSearchRelatedTerms(searchQuery);
    const candidates: Array<{ term: string; source: 'recent' | 'popular' | 'related' | 'content' }> = [
      ...recentSearches.map((term) => ({ term, source: 'recent' as const })),
      ...displayHotTerms.map((term) => ({ term, source: 'popular' as const })),
      ...relatedTerms.map((term) => ({ term, source: 'related' as const })),
      ...(presentationFixturesEnabled ? demoQuestions.flatMap((item) => [item.title, ...(item.tags || [])]).map((term) => ({ term, source: 'content' as const })) : []),
      ...(presentationFixturesEnabled ? demoExperts.flatMap((item) => [item.title || '', ...(item.tags || [])]).map((term) => ({ term, source: 'content' as const })) : []),
    ];
    const sourceScore = { recent: 45, related: 35, popular: 28, content: 12 } as const;
    const bestScoreByTerm = new Map<string, number>();
    const labelByTerm = new Map<string, string>();

    candidates.forEach(({ term, source }) => {
      const normalized = term.trim();
      if (!normalized) return;
      const lower = normalized.toLowerCase();
      if (!lower.includes(keyword)) return;
      let score = sourceScore[source];
      if (lower === keyword) score += 50;
      if (lower.startsWith(keyword)) score += 30;
      if (normalized.length <= 6) score += 8;
      if (score > (bestScoreByTerm.get(lower) ?? -1)) {
        bestScoreByTerm.set(lower, score);
        labelByTerm.set(lower, normalized);
      }
    });

    return Array.from(bestScoreByTerm.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([lower]) => labelByTerm.get(lower) || lower);
  }, [displayHotTerms, presentationFixturesEnabled, recentSearches, searchQuery]);

  const relatedTerms = useMemo(
    () => hasQuery ? getSearchRelatedTerms(debouncedQuery) : [],
    [debouncedQuery, hasQuery],
  );

  const questionCategoryOptions = useMemo(() => {
    const categories = (results?.questions || [])
      .map((item) => (item.category || '').trim())
      .filter(Boolean)
      .filter((item, index, all) => all.indexOf(item) === index)
      .slice(0, 6);
    return ['全部', ...categories];
  }, [results?.questions]);

  useEffect(() => {
    if (!questionCategoryOptions.includes(questionCategoryFilter)) setQuestionCategoryFilter('全部');
  }, [questionCategoryFilter, questionCategoryOptions]);

  const filteredSortedQuestions = useMemo(() => {
    const source = questionCategoryFilter === '全部'
      ? [...(results?.questions || [])]
      : (results?.questions || []).filter((item) => (item.category || '').trim() === questionCategoryFilter);
    return questionSort === 'latest'
      ? source.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      : source;
  }, [questionCategoryFilter, questionSort, results?.questions]);

  const openQuestion = (id: string) => navigate(`/question/${id}`, { state: buildFromState(location) });
  const openPerson = (id: string) => navigate(`/expert-profile/${id}`, { state: buildFromState(location) });
  const openAsk = () => navigate('/new', { state: buildFromState(location) });
  const openDiscover = () => navigate('/discover', { state: buildFromState(location) });

  return (
    <div className="app-container app-page-bg min-h-[100dvh] pb-10">
      <header className={`fixed top-0 z-[90] w-full border-b border-app-border-subtle bg-white/95 backdrop-blur-md ${nativeMode ? 'left-0' : 'left-1/2 max-w-md -translate-x-1/2'}`}>
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="flex h-16 items-center gap-1 px-2">
          <button
            type="button"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 active:bg-slate-100"
            onClick={() => navigateBackOr(navigate, context.backTo, { location })}
            aria-label="返回"
          >
            <ChevronLeft aria-hidden size={22} />
          </button>
          <SearchBar
            variant="searchPage"
            value={searchQuery}
            onSearch={setSearchQuery}
            onSubmit={(value) => { commitSearch(value); setSearchFocused(false); }}
            onClear={clearSearch}
            onFocusChange={setSearchFocused}
            placeholder={context.placeholder}
            iconClassName={context.iconClass}
            inputBorderClassName="border-app-border-subtle"
            inputAccentClassName="focus-visible:border-app-action/30"
            accentRingClassName="ring-app-action/25"
            className="min-w-0 flex-1"
          />
        </div>
      </header>

      <main className="px-4" style={{ paddingTop: 'calc(env(safe-area-inset-top) + 5rem)' }}>
        {showSuggestions ? (
          <section className="pt-2">
            <p className="px-1 pb-2 text-xs font-medium text-slate-500">搜索建议</p>
            <div className="divide-y divide-app-border-subtle border-y border-app-border-subtle bg-white">
              {suggestionTerms.length > 0 ? suggestionTerms.map((term) => (
                <button
                  key={term}
                  type="button"
                  className="flex min-h-11 w-full items-center gap-3 px-1 py-2 text-left text-[15px] text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/25 active:bg-app-action-soft/40"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectSearchTerm(term)}
                >
                  <Search aria-hidden size={17} className="shrink-0 text-slate-400" />
                  <span className="line-clamp-1">{term}</span>
                </button>
              )) : <p className="py-4 text-sm text-slate-500">继续输入查看更多建议</p>}
            </div>
          </section>
        ) : null}

        {showDefaultState ? (
          <div className="space-y-8 pt-4">
            {recentSearches.length > 0 ? (
              <section>
                <div className="flex min-h-11 items-center justify-between">
                  <h2 className="app-section-title">最近搜索</h2>
                  <button type="button" className="min-h-11 px-1 text-sm font-medium text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/25" onClick={() => { setRecentSearches([]); localStorage.removeItem(historyStorageKey); }}>
                    清空
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {recentSearches.map((term) => (
                    <button key={term} type="button" className="app-chip-neutral min-h-11 px-4 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/25" onClick={() => selectSearchTerm(term)}>
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {displayHotTerms.length > 0 ? (
              <section>
                <h2 className="app-section-title">热门搜索</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {displayHotTerms.map((term) => (
                    <button key={term} type="button" className="app-chip-neutral min-h-11 px-4 text-sm text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/25" onClick={() => selectSearchTerm(term)}>
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {recentSearches.length === 0 && displayHotTerms.length === 0 ? (
              <div className="py-8 text-center">
                <h1 className="text-[17px] font-semibold text-slate-800">从一个具体的问题开始</h1>
                <p className="mt-2 text-sm leading-6 text-slate-600">搜索问题、经历，或真正做过这件事的人。</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {hasQuery && error && !showSuggestions ? <SearchErrorState onRetry={() => void refetch()} /> : null}
        {hasQuery && isLoading && !error && !showSuggestions ? <SearchResultsSkeleton /> : null}

        {noResults && !showSuggestions ? (
          <SearchEmptyState
            title="没找到直接相关的内容"
            description="换个关键词试试，或者直接提个问题。"
            primaryLabel="提个问题"
            onPrimary={openAsk}
            secondaryLabel="返回"
            onSecondary={() => navigateBackOr(navigate, context.backTo, { location })}
          >
            {relatedTerms.length > 0 ? (
              <div className="mt-5">
                <p className="text-xs text-slate-500">也可以试试：</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {relatedTerms.map((term) => (
                    <button key={term} type="button" className="app-chip-neutral min-h-11 px-4 text-sm text-slate-700" onClick={() => selectSearchTerm(term)}>{term}</button>
                  ))}
                </div>
              </div>
            ) : null}
          </SearchEmptyState>
        ) : null}

        {hasQuery && !isLoading && !error && !showSuggestions && hasResults && results ? (
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as SearchTab)}>
            <SearchResultTabs value={activeTab} />

            <TabsContent value="all" className="mt-0 space-y-6 pt-6">
              {results.questions.length > 0 ? (
                <SearchSection title="相关问题" onViewMore={results.questions.length > 3 ? () => setActiveTab('question') : undefined}>
                  {results.questions.slice(0, 3).map((question) => <SearchQuestionItem key={question.id} question={question} onOpen={openQuestion} />)}
                </SearchSection>
              ) : null}
              {results.experts.length > 0 ? (
                <SearchSection title="可能懂的人" onViewMore={results.experts.length > 3 ? () => setActiveTab('expert') : undefined}>
                  {results.experts.slice(0, 3).map((person) => <SearchPersonItem key={person.id} person={person} onOpen={openPerson} />)}
                </SearchSection>
              ) : null}
              {results.posts.length > 0 ? (
                <SearchSection title="相关分享" onViewMore={results.posts.length > 3 ? () => setActiveTab('post') : undefined}>
                  {results.posts.slice(0, 3).map((post) => <SearchPostItem key={post.id} post={post} />)}
                </SearchSection>
              ) : null}
              {results.skills.length > 0 ? (
                <SearchSection title="相关服务" onViewMore={results.skills.length > 3 ? () => setActiveTab('skill') : undefined}>
                  {results.skills.slice(0, 3).map((service) => <SearchServiceItem key={service.id} service={service} />)}
                </SearchSection>
              ) : null}
              <div className="border-t border-app-border-subtle py-8 text-center">
                <h2 className="text-[17px] font-semibold text-slate-800">还没找到想要的答案？</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">提个问题，让经历过的人来回答。</p>
                <button type="button" className="app-btn-action mt-5 min-w-32" onClick={openAsk}>提个问题</button>
              </div>
            </TabsContent>

            <TabsContent value="question" className="mt-0 pt-5">
              <div className="mb-4">
                <div className="flex items-center gap-5 border-b border-app-border-subtle" aria-label="问题排序">
                  {([{ value: 'relevance', label: '相关' }, { value: 'latest', label: '最新' }] as const).map((sort) => (
                    <button key={sort.value} type="button" className={`relative min-h-11 px-1 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/25 ${questionSort === sort.value ? 'text-app-action' : 'text-slate-500'}`} onClick={() => setQuestionSort(sort.value)}>
                      {sort.label}
                      {questionSort === sort.value ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-app-action" /> : null}
                    </button>
                  ))}
                </div>
                {questionCategoryOptions.length > 2 ? (
                  <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-hide" data-no-swipe-back="true">
                    {questionCategoryOptions.map((category) => (
                      <button key={category} type="button" className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-medium ${questionCategoryFilter === category ? 'app-action-soft-bg text-app-action' : 'bg-white text-slate-600'}`} onClick={() => setQuestionCategoryFilter(category)}>{category}</button>
                    ))}
                  </div>
                ) : null}
              </div>
              {filteredSortedQuestions.length > 0 ? (
                <SearchSection title="相关问题">
                  {filteredSortedQuestions.map((question) => <SearchQuestionItem key={question.id} question={question} onOpen={openQuestion} />)}
                </SearchSection>
              ) : (
                <SearchEmptyState title="暂时没有相关问题" description="换个关键词，或者成为第一个提问的人。" primaryLabel="提个问题" onPrimary={openAsk} secondaryLabel="回到综合" onSecondary={() => setActiveTab('all')} />
              )}
            </TabsContent>

            <TabsContent value="expert" className="mt-0 pt-6">
              {results.experts.length > 0 ? (
                <SearchSection title="可能懂的人">
                  {results.experts.map((person) => <SearchPersonItem key={person.id} person={person} onOpen={openPerson} />)}
                </SearchSection>
              ) : (
                <SearchEmptyState title="暂时没找到相关的人" description="可以换一个关键词，或先看看相关问题。" primaryLabel="看相关问题" onPrimary={() => setActiveTab('question')} secondaryLabel="回到综合" onSecondary={() => setActiveTab('all')} />
              )}
            </TabsContent>

            <TabsContent value="post" className="mt-0 pt-6">
              {results.posts.length > 0 ? (
                <>
                  <SearchSection title="相关分享">{results.posts.map((post) => <SearchPostItem key={post.id} post={post} />)}</SearchSection>
                  <div className="flex justify-center py-5"><button type="button" className="app-btn-quiet" onClick={openDiscover}>去发现看看</button></div>
                </>
              ) : (
                <SearchEmptyState title="暂时没有相关分享" primaryLabel="去发现看看" onPrimary={openDiscover} secondaryLabel="回到综合" onSecondary={() => setActiveTab('all')} />
              )}
            </TabsContent>

            <TabsContent value="skill" className="mt-0 pt-6">
              {results.skills.length > 0 ? (
                <SearchSection title="相关服务">{results.skills.map((service) => <SearchServiceItem key={service.id} service={service} />)}</SearchSection>
              ) : (
                <SearchEmptyState title="暂时没有相关服务" secondaryLabel="回到综合" onSecondary={() => setActiveTab('all')} />
              )}
            </TabsContent>
          </Tabs>
        ) : null}
      </main>
    </div>
  );
};

export default SearchResults;
