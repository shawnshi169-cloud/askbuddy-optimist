import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Bell, Search, User, MessageCircle, Eye, Award } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import SearchBar from "@/components/SearchBar";
import { getSearchRelatedTerms, useHotKeywords, useSearch, popularSearchTerms, type SearchExpert, type SearchPost, type SearchQuestion, type SearchSkill } from '@/hooks/useSearch';
import { demoExperts, demoQuestions } from '@/lib/demoData';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { buildFromState, navigateBackOr } from '@/utils/navigation';
import PageStateCard from '@/components/common/PageStateCard';
import { isNativeApp } from '@/utils/platform';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

const SEARCH_HISTORY_KEY = 'searchHistory';
const channelThemes = {
  education: {
    title: '教育学习搜索',
    headerClass: 'app-header-bg',
    pageClass: 'app-soft-muted-bg',
    searchStripClass: 'border-b border-blue-100/80 bg-blue-50/70',
    accentRingClass: 'ring-blue-300/25',
    inputAccentClass: 'focus-visible:ring-blue-300/20 focus-visible:border-blue-200/70',
    inputBorderClass: 'border-blue-200/70',
    iconClass: 'text-blue-500',
    historyChipClass: 'border-blue-100/90 text-blue-700',
    suggestionClass: 'bg-blue-50 text-blue-700',
    backTo: '/education',
  },
  career: {
    title: '职业发展搜索',
    headerClass: 'app-header-bg',
    pageClass: 'app-soft-muted-bg',
    searchStripClass: 'border-b border-emerald-100/80 bg-emerald-50/70',
    accentRingClass: 'ring-emerald-300/25',
    inputAccentClass: 'focus-visible:ring-emerald-300/20 focus-visible:border-emerald-200/70',
    inputBorderClass: 'border-emerald-200/70',
    iconClass: 'text-emerald-500',
    historyChipClass: 'border-emerald-100/90 text-emerald-700',
    suggestionClass: 'bg-emerald-50 text-emerald-700',
    backTo: '/career',
  },
  lifestyle: {
    title: '生活服务搜索',
    headerClass: 'app-header-bg',
    pageClass: 'app-soft-muted-bg',
    searchStripClass: 'border-b border-orange-100/80 bg-orange-50/70',
    accentRingClass: 'ring-orange-300/25',
    inputAccentClass: 'focus-visible:ring-orange-300/20 focus-visible:border-orange-200/70',
    inputBorderClass: 'border-orange-200/70',
    iconClass: 'text-orange-500',
    historyChipClass: 'border-orange-100/90 text-orange-700',
    suggestionClass: 'bg-orange-50 text-orange-700',
    backTo: '/lifestyle',
  },
  hobbies: {
    title: '兴趣技能搜索',
    headerClass: 'app-header-bg',
    pageClass: 'app-soft-muted-bg',
    searchStripClass: 'border-b border-rose-100/80 bg-rose-50/70',
    accentRingClass: 'ring-rose-300/25',
    inputAccentClass: 'focus-visible:ring-rose-300/20 focus-visible:border-rose-200/70',
    inputBorderClass: 'border-rose-200/70',
    iconClass: 'text-rose-500',
    historyChipClass: 'border-rose-100/90 text-rose-700',
    suggestionClass: 'bg-rose-50 text-rose-700',
    backTo: '/hobbies',
  },
  default: {
    title: '搜索',
    headerClass: 'app-header-bg',
    pageClass: 'app-soft-muted-bg',
    searchStripClass: 'app-header-soft-bg app-soft-border border-b',
    accentRingClass: 'ring-app-teal/25',
    inputAccentClass: 'focus-visible:ring-app-teal/25 focus-visible:border-app-teal/30',
    inputBorderClass: 'app-soft-border border',
    iconClass: 'text-app-teal',
    historyChipClass: 'app-soft-border border text-foreground',
    suggestionClass: 'app-soft-surface-bg app-accent-text',
    backTo: '/',
  },
} as const;

const SearchResults = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const nativeMode = isNativeApp();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const searchParams = new URLSearchParams(location.search);
  const initialQuery = searchParams.get('q') || '';
  const channel = searchParams.get('channel') || 'default';
  const historyStorageKey = `${SEARCH_HISTORY_KEY}:${channel}`;
  const theme = channelThemes[channel as keyof typeof channelThemes] || channelThemes.default;
  const uiStorageKey = `search-ui:${channel}`;
  const scrollMemoryKey = `search:${channel}:${(searchParams.get('q') || '').trim().toLowerCase() || 'empty'}`;
  usePageScrollMemory(scrollMemoryKey);

  const readUiState = () => {
    const raw = sessionStorage.getItem(uiStorageKey);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as {
        activeTab?: 'all' | 'question' | 'expert' | 'skill' | 'post';
        questionSort?: 'relevance' | 'latest' | 'hot';
        questionCategoryFilter?: string;
      };
      return parsed;
    } catch {
      return null;
    }
  };

  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<'all' | 'question' | 'expert' | 'skill' | 'post'>(() => {
    const cached = readUiState()?.activeTab;
    if (cached === 'question' || cached === 'expert' || cached === 'skill' || cached === 'post') return cached;
    return 'all';
  });
  const [questionSort, setQuestionSort] = useState<'relevance' | 'latest' | 'hot'>(() => {
    const cached = readUiState()?.questionSort;
    return cached === 'latest' || cached === 'hot' ? cached : 'relevance';
  });
  const [questionCategoryFilter, setQuestionCategoryFilter] = useState<string>(() => readUiState()?.questionCategoryFilter || '全部');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [searchFocused, setSearchFocused] = useState(false);
  const placeholder = channel === 'education'
    ? '搜院校、专业、申请问题'
    : channel === 'career'
      ? '搜简历、面试、求职问题'
      : channel === 'lifestyle'
        ? '搜租房、法律、生活服务'
        : channel === 'hobbies'
          ? '搜摄影、音乐、技能话题'
          : '搜索问题/专家/技能/动态';
  const contentTopOffset = 'calc(env(safe-area-inset-top) + 8rem)';

  const { data: results, isLoading, error, refetch } = useSearch(debouncedQuery);
  const { data: hotKeywords = [] } = useHotKeywords('all');
  const { user } = useAuth();

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 外部路径变化（如从首页带 q 进入、详情返回）时，同步输入框与结果态
  useEffect(() => {
    const latestQuery = new URLSearchParams(location.search).get('q') || '';
    if (latestQuery === searchQuery && latestQuery === debouncedQuery) return;
    setSearchQuery(latestQuery);
    setDebouncedQuery(latestQuery);
  }, [location.search]);

  // Sync URL
  useEffect(() => {
    const newParams = new URLSearchParams(location.search);
    const currentQuery = newParams.get('q') || '';
    const currentSearchText = location.search.startsWith('?') ? location.search.slice(1) : location.search;
    if (debouncedQuery) {
      newParams.set('q', debouncedQuery);
      const nextSearch = newParams.toString();
      if (nextSearch !== currentSearchText) {
        navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
      }
    } else if (currentQuery) {
      newParams.delete('q');
      const nextSearch = newParams.toString();
      if (nextSearch !== currentSearchText) {
        navigate({ pathname: location.pathname, search: nextSearch }, { replace: true });
      }
    }
  }, [debouncedQuery, location.pathname, location.search, navigate]);

  useEffect(() => {
    const stored = localStorage.getItem(historyStorageKey) || localStorage.getItem(SEARCH_HISTORY_KEY);
    if (!stored) return;
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        setRecentSearches(parsed.filter((item): item is string => typeof item === 'string'));
      }
    } catch {
      localStorage.removeItem(historyStorageKey);
    }
  }, [historyStorageKey]);

  useEffect(() => {
    sessionStorage.setItem(
      uiStorageKey,
      JSON.stringify({
        activeTab,
        questionSort,
        questionCategoryFilter,
      })
    );
  }, [activeTab, questionSort, questionCategoryFilter, uiStorageKey]);

  const handleSearch = (value: string) => {
    setSearchQuery(value);
  };

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
        .rpc('upsert_search_history', {
          p_query_text: normalized,
          p_query_type: 'all',
        })
        .then(({ error: historyError }) => {
          if (historyError) console.warn('Search history write failed', historyError.message);
        });
    }
  };

  const handleTopicSelect = (topic: string) => {
    commitSearch(topic);
    setSearchFocused(false);
  };

  const totalResults = (results?.questions.length || 0)
    + (results?.experts.length || 0)
    + (results?.skills.length || 0)
    + (results?.posts.length || 0);
  const noResults = debouncedQuery.trim() && !isLoading && totalResults === 0;
  const showError = debouncedQuery.trim() && !!error;
  const showSuggestions = searchFocused && searchQuery.trim().length > 0;
  const showDefaultState = !debouncedQuery.trim() && !showSuggestions;
  const displayHotTerms = useMemo(
    () => hotKeywords.length > 0
      ? hotKeywords
      : presentationFixturesEnabled
        ? popularSearchTerms
        : [],
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
      ...(presentationFixturesEnabled
        ? demoQuestions.flatMap((item) => [item.title, ...(item.tags || [])]).map((term) => ({ term, source: 'content' as const }))
        : []),
      ...(presentationFixturesEnabled
        ? demoExperts.flatMap((item) => [item.title || '', ...(item.tags || [])]).map((term) => ({ term, source: 'content' as const }))
        : []),
    ];

    const scoreBySource = { recent: 45, related: 35, popular: 28, content: 12 } as const;
    const bestScoreByTerm = new Map<string, number>();
    const labelByTerm = new Map<string, string>();

    candidates.forEach(({ term, source }) => {
      const normalized = term.trim();
      if (!normalized) return;

      const lower = normalized.toLowerCase();
      if (!lower.includes(keyword)) return;

      let score = scoreBySource[source];
      if (lower === keyword) score += 50;
      if (lower.startsWith(keyword)) score += 30;
      if (normalized.length <= 6) score += 8;

      const previous = bestScoreByTerm.get(lower) ?? -1;
      if (score > previous) {
        bestScoreByTerm.set(lower, score);
        labelByTerm.set(lower, normalized);
      }
    });

    return Array.from(bestScoreByTerm.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([lower]) => labelByTerm.get(lower) || lower);
  }, [displayHotTerms, presentationFixturesEnabled, searchQuery, recentSearches]);

  const relatedTerms = useMemo(() => {
    if (!debouncedQuery.trim()) return [] as string[];
    return getSearchRelatedTerms(debouncedQuery);
  }, [debouncedQuery]);

  const questionCategoryOptions = useMemo(() => {
    const categories = (results?.questions || [])
      .map((item) => (item.category || '').trim())
      .filter((item) => item.length > 0)
      .filter((item, index, arr) => arr.findIndex((entry) => entry === item) === index)
      .slice(0, 6);
    return ['全部', ...categories];
  }, [results?.questions]);

  useEffect(() => {
    if (!questionCategoryOptions.includes(questionCategoryFilter)) {
      setQuestionCategoryFilter('全部');
    }
  }, [questionCategoryFilter, questionCategoryOptions]);

  const filteredSortedQuestions = useMemo(() => {
    const source = [...(results?.questions || [])];
    const byCategory = questionCategoryFilter === '全部'
      ? source
      : source.filter((item) => (item.category || '').trim() === questionCategoryFilter);

    if (questionSort === 'latest') {
      return byCategory.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    if (questionSort === 'hot') {
      return byCategory.sort((a, b) => {
        const aHot = Number(a.view_count || 0) + Number(a.answers_count || 0) * 6 + Number(a.bounty_points || 0);
        const bHot = Number(b.view_count || 0) + Number(b.answers_count || 0) * 6 + Number(b.bounty_points || 0);
        return bHot - aHot;
      });
    }
    return byCategory;
  }, [questionCategoryFilter, questionSort, results?.questions]);

  return (
    <div className={`app-container min-h-[100dvh] pb-8 ${theme.pageClass}`}>
      {/* Header */}
      <div className={`fixed top-0 z-[90] w-full shadow-sm ${nativeMode ? 'left-0' : 'left-1/2 max-w-md -translate-x-1/2'} ${theme.headerClass}`}>
        <div style={{ height: 'env(safe-area-inset-top)' }} />
        <div className="flex items-center justify-between h-12 px-4">
          <button onClick={() => navigateBackOr(navigate, theme.backTo, { location })} className="text-white">
            <ChevronLeft size={24} />
          </button>
          <div className="text-white font-medium text-base">{theme.title}</div>
          <button
            className="text-white"
            onClick={() => navigate('/notifications', { state: buildFromState(location) })}
          >
            <Bell size={20} />
          </button>
        </div>

        <div className={`shadow-[0_1px_0_rgba(15,23,42,0.03)] ${theme.searchStripClass}`}>
          <SearchBar
            onSearch={handleSearch}
            onSubmit={commitSearch}
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocusChange={setSearchFocused}
            accentRingClassName={theme.accentRingClass}
            inputAccentClassName={theme.inputAccentClass}
            inputBorderClassName={theme.inputBorderClass}
            iconClassName={theme.iconClass}
            className="py-2.5"
          />
        </div>
      </div>

      <div className="p-4" style={{ paddingTop: contentTopOffset }}>
        {showSuggestions && (
          <div className="mb-4 surface-card rounded-2xl p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">搜索建议</p>
            <div className="space-y-1">
              {suggestionTerms.length > 0 ? (
                suggestionTerms.map((term) => (
                  <button
                    key={term}
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted"
                    onClick={() => handleTopicSelect(term)}
                  >
                    <span className="line-clamp-1">{term}</span>
                    <Search size={14} className="text-muted-foreground" />
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-sm text-muted-foreground">继续输入查看更多建议</p>
              )}
            </div>
          </div>
        )}

        {/* No query: show popular terms */}
        {showDefaultState && (
          <>
            {recentSearches.length > 0 && (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center">
                    <Search size={18} className={`mr-2 ${theme.iconClass}`} />
                    <h2 className="text-base font-semibold">最近搜索</h2>
                  </div>
                  <button
                    className="text-xs text-muted-foreground"
                    onClick={() => {
                      setRecentSearches([]);
                      localStorage.removeItem(historyStorageKey);
                    }}
                  >
                    清空
                  </button>
                </div>
                <div className="mb-6 flex flex-wrap gap-2">
                  {recentSearches.map((topic, i) => (
                    <button
                      key={`${topic}-${i}`}
                      onClick={() => handleTopicSelect(topic)}
                      className={`app-chip-neutral gap-1 px-3 py-1.5 text-sm text-foreground ${theme.historyChipClass}`}
                    >
                      {topic}
                      <span
                        role="button"
                        aria-label={`删除最近搜索 ${topic}`}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setRecentSearches((current) => {
                            const next = current.filter((item) => item !== topic);
                            localStorage.setItem(historyStorageKey, JSON.stringify(next));
                            return next;
                          });
                        }}
                      >
                        ×
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}

            <div className="mb-4 flex items-center">
              <Search size={20} className={`mr-2 ${theme.iconClass}`} />
              <h2 className="app-section-title">热门搜索</h2>
            </div>
            <div className="flex flex-wrap gap-2 mb-6">
              {displayHotTerms.map((topic, i) => (
                <button
                  key={i}
                  onClick={() => handleTopicSelect(topic)}
                  className="app-chip-neutral px-3 py-1.5 text-sm text-foreground"
                >
                  {topic}
                </button>
              ))}
            </div>
          </>
        )}

        {showError && !showSuggestions && (
          <PageStateCard
            variant="error"
            compact
            title="搜索暂时不可用"
            description={error instanceof Error ? error.message : '请检查网络后重试'}
            actionLabel="重试"
            onAction={() => refetch()}
          />
        )}

        {/* Loading */}
        {isLoading && debouncedQuery.trim() && !showError && !showSuggestions && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="surface-card rounded-2xl p-4 shadow-sm space-y-3">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {noResults && !showError && !showSuggestions && (
          <div className="surface-card rounded-2xl p-6 text-center">
            <div className="flex flex-col items-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full app-soft-muted-bg">
                <User size={32} className="text-muted-foreground" />
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">未找到匹配结果</h3>
              <p className="mb-4 max-w-xs text-muted-foreground">
                可换一个关键词，或直接发布问题让专家看到
              </p>
              <div className="mb-4 flex flex-wrap justify-center gap-2">
                {displayHotTerms.slice(0, 4).map((term) => (
                  <button
                    key={term}
                    onClick={() => handleTopicSelect(term)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium ${theme.suggestionClass}`}
                  >
                    试试搜 {term}
                  </button>
                ))}
              </div>
              {relatedTerms.length > 0 && (
                <div className="mb-4 flex flex-wrap justify-center gap-2">
                  {relatedTerms.slice(0, 4).map((term) => (
                    <button
                      key={term}
                      onClick={() => handleTopicSelect(term)}
                      className="app-chip-neutral px-3 py-1.5 text-xs font-medium"
                    >
                      改搜 {term}
                    </button>
                  ))}
                </div>
              )}
              <div className="mb-3 grid w-full max-w-sm grid-cols-2 gap-2">
                <Button
                  onClick={() => navigate('/new', { state: buildFromState(location) })}
                  className="app-btn-primary h-10"
                >
                  去发布问题
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/discover', { state: buildFromState(location) })}
                  className="app-btn-secondary h-10"
                >
                  去找专家
                </Button>
              </div>
              <Button
                onClick={() => navigateBackOr(navigate, theme.backTo, { location })}
                variant="ghost"
                className="h-9 rounded-full text-sm text-muted-foreground"
              >
                返回上页
              </Button>
            </div>
          </div>
        )}

        {/* Results */}
        {debouncedQuery.trim() && !isLoading && !showError && !showSuggestions && totalResults > 0 && (
          <>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">"{debouncedQuery}" 的搜索结果</h2>
            </div>

            <div className="mb-4 space-y-2 rounded-2xl border app-soft-border bg-white/90 p-3 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">问题排序</p>
                <div className="flex items-center gap-1 rounded-full app-soft-muted-bg p-1">
                  {[
                    { key: 'relevance', label: '综合' },
                    { key: 'latest', label: '最新' },
                    { key: 'hot', label: '最热' },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setQuestionSort(item.key as 'relevance' | 'latest' | 'hot')}
                      className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${
                        questionSort === item.key ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" data-no-swipe-back="true">
                {questionCategoryOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setQuestionCategoryFilter(item)}
                      className={`shrink-0 px-3 py-1.5 text-xs font-medium transition-colors ${
                      questionCategoryFilter === item
                        ? 'app-chip-active'
                        : 'app-chip-neutral'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <Tabs defaultValue="all" value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
              <TabsList className="mb-4 w-full rounded-full app-soft-muted-bg p-1">
                <TabsTrigger value="all" className="flex-1 rounded-full text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  全部({totalResults})
                </TabsTrigger>
                <TabsTrigger value="question" className="flex-1 rounded-full text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  问题({results?.questions.length || 0})
                </TabsTrigger>
                <TabsTrigger value="expert" className="flex-1 rounded-full text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  专家({results?.experts.length || 0})
                </TabsTrigger>
                <TabsTrigger value="skill" className="flex-1 rounded-full text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  技能({results?.skills.length || 0})
                </TabsTrigger>
                <TabsTrigger value="post" className="flex-1 rounded-full text-sm data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  动态({results?.posts.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* All tab */}
              <TabsContent value="all" className="mt-0 space-y-4">
                {results && results.questions.length > 0 && (
                  <QuestionSection
                    questions={filteredSortedQuestions.slice(0, 3)}
                    onViewMore={() => setActiveTab('question')}
                    showMore={filteredSortedQuestions.length > 3}
                    onOpenQuestion={(id) => navigate(`/question/${id}`, { state: buildFromState(location) })}
                  />
                )}
                {results && results.experts.length > 0 && (
                  <ExpertSection
                    experts={results.experts.slice(0, 3)}
                    onViewMore={() => setActiveTab('expert')}
                    showMore={results.experts.length > 3}
                    onOpenExpert={(id) => navigate(`/expert/${id}`, { state: buildFromState(location) })}
                  />
                )}
                {results && results.skills.length > 0 && (
                  <SkillSection
                    skills={results.skills.slice(0, 3)}
                    onViewMore={() => setActiveTab('skill')}
                    showMore={results.skills.length > 3}
                    onOpenSkillExpert={(expertId) => navigate(`/expert/${expertId}`, { state: buildFromState(location) })}
                  />
                )}
                {results && results.posts.length > 0 && (
                  <PostSection
                    posts={results.posts.slice(0, 3)}
                    onViewMore={() => setActiveTab('post')}
                    showMore={results.posts.length > 3}
                    onOpenPost={() => navigate('/discover', { state: buildFromState(location) })}
                  />
                )}
              </TabsContent>

              {/* Questions tab */}
              <TabsContent value="question" className="mt-0 space-y-3">
                {filteredSortedQuestions.map((q) => (
                  <QuestionCard
                    key={q.id}
                    question={q}
                    onOpenQuestion={(id) => navigate(`/question/${id}`, { state: buildFromState(location) })}
                  />
                ))}
                {filteredSortedQuestions.length === 0 && (
                  <ResultEmptyState
                    title="当前筛选下没有匹配的问题"
                    description="试试切换排序或分类，也可以去发布一个新问题。"
                    actionLabel="去发布问题"
                    onAction={() => navigate('/new', { state: buildFromState(location) })}
                    secondaryLabel="回到全部"
                    onSecondary={() => setActiveTab('all')}
                  />
                )}
              </TabsContent>

              {/* Expert tab */}
              <TabsContent value="expert" className="mt-0 space-y-3">
                {results?.experts.map((expert) => (
                  <ExpertCard
                    key={expert.id}
                    expert={expert}
                    onOpenExpert={(id) => navigate(`/expert/${id}`, { state: buildFromState(location) })}
                  />
                ))}
                {results?.experts.length === 0 && (
                  <ResultEmptyState
                    title="没有匹配的专家"
                    description="可以换一个关键词，或去发现页看看推荐专家。"
                    actionLabel="去发现页"
                    onAction={() => navigate('/discover', { state: buildFromState(location) })}
                    secondaryLabel="回到全部"
                    onSecondary={() => setActiveTab('all')}
                  />
                )}
              </TabsContent>

              {/* Skills tab */}
              <TabsContent value="skill" className="mt-0 space-y-3">
                {results?.skills.map((skill) => (
                  <SkillCard
                    key={skill.id}
                    skill={skill}
                    onOpenSkillExpert={(expertId) => navigate(`/expert/${expertId}`, { state: buildFromState(location) })}
                  />
                ))}
                {results?.skills.length === 0 && (
                  <ResultEmptyState
                    title="没有匹配的技能服务"
                    description="换个关键词试试，或到发现页浏览动态。"
                    actionLabel="去发现页"
                    onAction={() => navigate('/discover', { state: buildFromState(location) })}
                    secondaryLabel="回到全部"
                    onSecondary={() => setActiveTab('all')}
                  />
                )}
              </TabsContent>

              {/* Posts tab */}
              <TabsContent value="post" className="mt-0 space-y-3">
                {results?.posts.map((post) => (
                  <PostCard
                    key={post.id}
                    post={post}
                    onOpenPost={() => navigate('/discover', { state: buildFromState(location) })}
                  />
                ))}
                {results?.posts.length === 0 && (
                  <ResultEmptyState
                    title="没有匹配的动态"
                    description="可以先看看问题和专家，或稍后再试。"
                    actionLabel="去发现页"
                    onAction={() => navigate('/discover', { state: buildFromState(location) })}
                    secondaryLabel="回到全部"
                    onSecondary={() => setActiveTab('all')}
                  />
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

    </div>
  );
};

// --- Sub-components ---

const ResultEmptyState = ({
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
  secondaryLabel: string;
  onSecondary: () => void;
}) => (
  <PageStateCard
    compact
    title={title}
    description={description}
    actionLabel={actionLabel}
    onAction={onAction}
    secondaryActionLabel={secondaryLabel}
    onSecondaryAction={onSecondary}
  />
);

const QuestionCard = ({ question: q, onOpenQuestion }: { question: SearchQuestion; onOpenQuestion: (id: string) => void }) => {
  const timeAgo = formatDistanceToNow(new Date(q.created_at), { addSuffix: true, locale: zhCN });
  return (
    <div className="surface-card rounded-2xl p-4 transition-all hover:shadow-md">
      <button type="button" className="mb-2 block w-full text-left" onClick={() => onOpenQuestion(q.id)}>
        <div className="flex items-start justify-between">
        <div className="flex-1 text-left">
          <h3 className="text-base font-semibold text-foreground">{q.title}</h3>
        </div>
        <div className="ml-2 flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Eye size={14} />
          <span>{q.view_count}</span>
        </div>
        </div>
      </button>
      {q.content && (
        <button type="button" className="mb-3 block w-full text-left" onClick={() => onOpenQuestion(q.id)}>
          <p className="line-clamp-2 text-sm text-muted-foreground">{q.content}</p>
        </button>
      )}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Avatar className="w-6 h-6">
            <AvatarImage src={q.profile_avatar || ''} />
            <AvatarFallback className="text-xs">{(q.profile_nickname || '匿')[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs text-muted-foreground">{q.profile_nickname}</span>
          <span className="text-xs text-muted-foreground/80">{timeAgo}</span>
        </div>
        <div className="flex items-center gap-2">
          {q.bounty_points > 0 && (
            <span className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50/80 px-2 py-0.5 text-xs font-medium text-amber-700">
              <Award size={12} />
              {q.bounty_points}
            </span>
          )}
          <button
            type="button"
            className="app-chip-neutral gap-1 px-2 py-0.5 text-xs"
            onClick={() => onOpenQuestion(q.id)}
          >
            <MessageCircle size={12} />
            {q.answers_count || 0}
          </button>
        </div>
      </div>
      {q.tags && q.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {q.tags.map((tag, i) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground border border-border">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

const ExpertCard = ({ expert, onOpenExpert }: { expert: SearchExpert; onOpenExpert: (id: string) => void }) => (
  <div className="surface-card flex items-center gap-3 rounded-2xl p-4">
    <Avatar className="w-12 h-12">
      <AvatarImage src={expert.avatar_url || ''} />
      <AvatarFallback>{(expert.nickname || '专')[0]}</AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <h3 className="text-sm font-medium text-foreground">{expert.nickname || '匿名专家'}</h3>
      <p className="line-clamp-1 text-xs text-muted-foreground">{expert.headline || expert.intro || '擅长经验答疑与实战建议'}</p>
    </div>
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="app-chip-neutral px-3 py-1 text-xs"
        onClick={() => onOpenExpert(expert.id)}
      >
        查看
      </button>
    </div>
  </div>
);

const SkillCard = ({ skill, onOpenSkillExpert }: { skill: SearchSkill; onOpenSkillExpert: (expertId: string) => void }) => (
  <div className="surface-card rounded-2xl p-4 transition-all hover:shadow-md">
    <div className="mb-2 flex items-start justify-between gap-3">
      <h3 className="text-sm font-semibold text-foreground">{skill.title}</h3>
      {skill.price_amount ? (
        <span className="rounded-full border border-amber-100 bg-amber-50/80 px-2 py-0.5 text-xs font-medium text-amber-700">
          {skill.price_amount} {skill.price_currency || 'CNY'}
        </span>
      ) : null}
    </div>
    {skill.description ? (
      <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{skill.description}</p>
    ) : null}
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>{skill.category_name || '技能服务'}</span>
      <button
        type="button"
        className="app-chip-neutral px-2 py-0.5 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
        disabled={!skill.expert_id}
        onClick={() => {
          if (!skill.expert_id) return;
          onOpenSkillExpert(skill.expert_id);
        }}
      >
        找我问问
      </button>
    </div>
  </div>
);

const PostCard = ({ post, onOpenPost }: { post: SearchPost; onOpenPost: () => void }) => (
  <div className="surface-card rounded-2xl p-4 transition-all hover:shadow-md">
    <button type="button" className="mb-2 block w-full text-left" onClick={onOpenPost}>
      <p className="line-clamp-3 text-sm text-foreground">{post.content}</p>
    </button>
    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
      <span>{post.author_nickname || '匿名用户'}</span>
      <span>{post.comment_count || 0} 讨论</span>
    </div>
  </div>
);

const QuestionSection = ({
  questions,
  onViewMore,
  showMore,
  onOpenQuestion,
}: {
  questions: SearchQuestion[];
  onViewMore: () => void;
  showMore: boolean;
  onOpenQuestion: (id: string) => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-foreground">相关问题</h3>
      {showMore && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onViewMore}>
          查看更多
        </Button>
      )}
    </div>
    <div className="space-y-3">
      {questions.map((q) => (
        <QuestionCard key={q.id} question={q} onOpenQuestion={onOpenQuestion} />
      ))}
    </div>
  </div>
);

const ExpertSection = ({
  experts,
  onViewMore,
  showMore,
  onOpenExpert,
}: {
  experts: SearchExpert[];
  onViewMore: () => void;
  showMore: boolean;
  onOpenExpert: (id: string) => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-foreground">相关专家</h3>
      {showMore && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onViewMore}>
          查看更多
        </Button>
      )}
    </div>
    <div className="space-y-3">
      {experts.map((expert) => (
        <ExpertCard key={expert.id} expert={expert} onOpenExpert={onOpenExpert} />
      ))}
    </div>
  </div>
);

const SkillSection = ({
  skills,
  onViewMore,
  showMore,
  onOpenSkillExpert,
}: {
  skills: SearchSkill[];
  onViewMore: () => void;
  showMore: boolean;
  onOpenSkillExpert: (expertId: string) => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-foreground">相关技能</h3>
      {showMore && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onViewMore}>
          查看更多
        </Button>
      )}
    </div>
    <div className="space-y-3">
      {skills.map((skill) => (
        <SkillCard key={skill.id} skill={skill} onOpenSkillExpert={onOpenSkillExpert} />
      ))}
    </div>
  </div>
);

const PostSection = ({
  posts,
  onViewMore,
  showMore,
  onOpenPost,
}: {
  posts: SearchPost[];
  onViewMore: () => void;
  showMore: boolean;
  onOpenPost: () => void;
}) => (
  <div>
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-base font-semibold text-foreground">相关动态</h3>
      {showMore && (
        <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={onViewMore}>
          查看更多
        </Button>
      )}
    </div>
    <div className="space-y-3">
      {posts.map((post) => (
        <PostCard key={post.id} post={post} onOpenPost={onOpenPost} />
      ))}
    </div>
  </div>
);

export default SearchResults;
