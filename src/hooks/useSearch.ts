import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { demoExperts, demoQuestions, demoTopics } from '@/lib/demoData';
import { mergeUniqueById } from '@/lib/adapters/contentAdapters';
import { isPresentationFixtureAllowed, isRuntimeCapabilityAllowed } from '@/config/runtimeMode';

const isMissingRpcError = (error: unknown, functionName: string) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes(`public.${functionName}`) || message.includes('schema cache');
};

export interface SearchQuestion {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  bounty_points: number;
  view_count: number;
  created_at: string;
  profile_nickname?: string | null;
  profile_avatar?: string | null;
  answers_count?: number;
}

export interface SearchExpert {
  id: string;
  user_id: string;
  nickname: string | null;
  avatar_url: string | null;
  headline: string | null;
  intro: string | null;
  verification_status?: string | null;
  follower_count?: number;
  service_count?: number;
}

export interface SearchSkill {
  id: string;
  expert_id: string;
  title: string;
  description: string | null;
  category_name?: string | null;
  pricing_mode?: string | null;
  price_amount?: number | null;
  price_currency?: string | null;
  city?: string | null;
  city_code?: string | null;
  is_remote_supported?: boolean;
  delivery_mode?: string | null;
  created_at?: string;
  expert_nickname?: string | null;
  expert_avatar?: string | null;
}

export interface SearchPost {
  id: string;
  author_id: string;
  content: string;
  city?: string | null;
  city_code?: string | null;
  created_at: string;
  like_count?: number;
  favorite_count?: number;
  comment_count?: number;
  author_nickname?: string | null;
  author_avatar?: string | null;
}

export interface SearchResults {
  questions: SearchQuestion[];
  experts: SearchExpert[];
  skills: SearchSkill[];
  posts: SearchPost[];
}

const SEARCH_RELATED_TERMS: Record<string, string[]> = {
  留学: ['申请', '文书', '雅思', '托福', '硕士'],
  申请: ['留学', '文书', '推荐信', '时间线'],
  求职: ['简历', '面试', '内推', '实习', '秋招'],
  面试: ['简历', '求职', '自我介绍', '行为面试'],
  简历: ['求职', '项目经历', '实习', '面试'],
  考研: ['复试', '择校', '调剂', '真题'],
  英语: ['雅思', '托福', '口语', '写作'],
  副业: ['技能', '接单', '变现', '运营'],
};

export const getSearchRelatedTerms = (query: string) => {
  const keyword = query.trim();
  if (!keyword) return [] as string[];

  const relatedSet = new Set<string>();
  Object.entries(SEARCH_RELATED_TERMS).forEach(([seed, related]) => {
    if (keyword.includes(seed) || seed.includes(keyword)) {
      related.forEach((term) => relatedSet.add(term));
    }
  });

  return Array.from(relatedSet).slice(0, 6);
};

export const useSearch = (query: string) => {
  return useQuery({
    queryKey: ['search', query],
    queryFn: async (): Promise<SearchResults> => {
      if (!query.trim()) {
        return { questions: [], experts: [], skills: [], posts: [] };
      }

      const rpcV2Result = await supabase.rpc('search_app_content_v2', {
        p_query: query.trim(),
        p_limit: 10,
      });

      const trimmedQuery = query.trim();
      const presentationFixturesEnabled = isPresentationFixtureAllowed();
      const normalizedQuery = trimmedQuery.toLowerCase();
      const relatedTerms = getSearchRelatedTerms(trimmedQuery);
      const normalizedKeywords = Array.from(
        new Set([normalizedQuery, ...relatedTerms.map((term) => term.toLowerCase())])
      );
      const isMatched = (value: string) => normalizedKeywords.some((keyword) => value.includes(keyword));

      const demoMatchedQuestions = presentationFixturesEnabled ? demoQuestions
        .filter((item) => {
          const bag = [item.title, item.content || '', ...(item.tags || [])].join(' ').toLowerCase();
          return isMatched(bag);
        })
        .map((item) => ({
          ...item,
          category: item.tags?.[0] || null,
        })) as SearchQuestion[] : [];

      const demoMatchedUsers = presentationFixturesEnabled ? demoExperts
        .filter((item) => {
          const bag = [item.nickname || '', item.title || '', item.bio || '', ...(item.tags || [])].join(' ').toLowerCase();
          return isMatched(bag);
        })
        .slice(0, 10)
        .map((item) => ({
          id: item.id,
          user_id: item.user_id,
          nickname: item.nickname,
          avatar_url: item.avatar_url,
          headline: item.title || null,
          intro: item.bio,
          verification_status: item.is_verified ? 'verified' : 'unverified',
          follower_count: item.followers_count || 0,
          service_count: item.consultation_count || 0,
        })) as SearchExpert[] : [];

      const demoMatchedPosts = presentationFixturesEnabled ? demoTopics
        .filter((item) => {
          const bag = [item.title || '', item.description || '', item.category || ''].join(' ').toLowerCase();
          return isMatched(bag);
        })
        .slice(0, 8)
        .map((item) => ({
          id: item.id,
          author_id: item.created_by || 'demo',
          content: `${item.title}${item.description ? `：${item.description}` : ''}`,
          city: null,
          city_code: null,
          created_at: item.created_at,
          like_count: 0,
          favorite_count: 0,
          comment_count: item.discussions_count || 0,
          author_nickname: '问问专题',
          author_avatar: null,
        })) as SearchPost[] : [];

      if (!rpcV2Result.error) {
        const payload = (rpcV2Result.data || {}) as Partial<SearchResults>;
        const questions = (payload.questions || []) as SearchQuestion[];
        const experts = (payload.experts || []) as SearchExpert[];
        const skills = (payload.skills || []) as SearchSkill[];
        const posts = (payload.posts || []) as SearchPost[];
        const mergedQuestions = mergeUniqueById(questions, demoMatchedQuestions);
        const mergedExperts = mergeUniqueById(experts, demoMatchedUsers);
        const mergedPosts = mergeUniqueById(posts, demoMatchedPosts);

        return {
          questions: mergedQuestions,
          experts: mergedExperts,
          skills,
          posts: mergedPosts,
        };
      }

      if (!isMissingRpcError(rpcV2Result.error, 'search_app_content_v2')) {
        throw rpcV2Result.error;
      }
      if (!isRuntimeCapabilityAllowed('legacyReadFallback')) {
        throw rpcV2Result.error;
      }

      const rpcLegacyResult = await supabase.rpc('search_app_content', {
        p_query: query.trim(),
        p_limit: 10,
      });

      if (!rpcLegacyResult.error) {
        const payload = (rpcLegacyResult.data || {}) as {
          questions?: SearchQuestion[];
          users?: Array<{
            id: string;
            user_id: string;
            nickname: string | null;
            avatar_url: string | null;
            bio: string | null;
          }>;
          topics?: Array<{
            id: string;
            title: string;
            description: string | null;
            discussions_count: number;
            created_at?: string;
          }>;
        };

        const experts = (payload.users || []).map((item) => ({
          id: item.id,
          user_id: item.user_id,
          nickname: item.nickname,
          avatar_url: item.avatar_url,
          headline: null,
          intro: item.bio,
          verification_status: null,
          follower_count: 0,
          service_count: 0,
        })) as SearchExpert[];

        const posts = (payload.topics || []).map((item) => ({
          id: item.id,
          author_id: 'legacy-topic',
          content: `${item.title}${item.description ? `：${item.description}` : ''}`,
          created_at: item.created_at || new Date().toISOString(),
          like_count: 0,
          favorite_count: 0,
          comment_count: item.discussions_count || 0,
          author_nickname: '问问专题',
          author_avatar: null,
        })) as SearchPost[];

        return {
          questions: mergeUniqueById((payload.questions || []) as SearchQuestion[], demoMatchedQuestions),
          experts: mergeUniqueById(experts, demoMatchedUsers),
          skills: [],
          posts: mergeUniqueById(posts, demoMatchedPosts),
        };
      }

      if (!isMissingRpcError(rpcLegacyResult.error, 'search_app_content')) {
        throw rpcLegacyResult.error;
      }

      const searchTerm = `%${trimmedQuery}%`;

      const [questionsResult, expertsResult, skillsResult, postsResult] = await Promise.all([
        supabase
          .from('questions')
          .select('*')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm},tags::text.ilike.${searchTerm}`)
          .eq('status', 'open')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('experts')
          .select('id,user_id,headline,intro,verification_status,follower_count,service_count,title,bio,profile_status')
          .or(`headline.ilike.${searchTerm},intro.ilike.${searchTerm},title.ilike.${searchTerm},bio.ilike.${searchTerm}`)
          .eq('profile_status', 'active')
          .limit(10),
        supabase
          .from('skill_offers')
          .select('id,expert_id,title,description,pricing_mode,price_amount,price_currency,city,city_code,is_remote_supported,delivery_mode,created_at,status')
          .eq('status', 'published')
          .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('posts')
          .select('id,author_id,content,city,city_code,created_at,like_count,favorite_count,comment_count,visibility,status')
          .eq('status', 'active')
          .eq('visibility', 'public')
          .ilike('content', searchTerm)
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (questionsResult.error) throw questionsResult.error;
      if (expertsResult.error) throw expertsResult.error;
      if (skillsResult.error) throw skillsResult.error;
      if (postsResult.error) throw postsResult.error;

      const questionsData = questionsResult.data || [];
      const expertRows = expertsResult.data || [];
      const skillRows = (skillsResult.data || []) as SearchSkill[];
      const postRows = (postsResult.data || []) as SearchPost[];

      const userIds = Array.from(
        new Set([
          ...questionsData.map((item) => item.author_id || item.user_id),
          ...expertRows.map((item) => item.user_id),
          ...postRows.map((item) => item.author_id),
        ].filter(Boolean))
      );
      const questionIds = questionsData.map((item) => item.id);
      const skillExpertIds = Array.from(new Set(skillRows.map((item) => item.expert_id).filter(Boolean)));

      const [profilesResult, answersResult, skillCategoryResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', userIds.length > 0 ? userIds : ['00000000-0000-0000-0000-000000000000']),
        supabase
          .from('answers')
          .select('question_id')
          .in('question_id', questionIds),
        supabase
          .from('skill_categories')
          .select('id,name')
          .in('id', Array.from(new Set((skillRows || []).map((row) => row.category_id).filter(Boolean)))),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (answersResult.error) throw answersResult.error;
      if (skillCategoryResult.error) throw skillCategoryResult.error;

      const profileMap = new Map(
        (profilesResult.data || []).map((profile) => [profile.user_id, profile])
      );
      const categoryMap = new Map(
        (skillCategoryResult.data || []).map((item) => [item.id, item.name])
      );
      const answerCountMap = new Map<string, number>();

      (answersResult.data || []).forEach((answer) => {
        answerCountMap.set(answer.question_id, (answerCountMap.get(answer.question_id) || 0) + 1);
      });

      const questions = questionsData.map((item) => ({
        ...item,
        content: item.description || item.content || null,
        category: item.category || null,
        bounty_points: Number(item.reward_points ?? item.bounty_points ?? 0),
        profile_nickname: profileMap.get(item.author_id || item.user_id)?.nickname || '匿名用户',
        profile_avatar: profileMap.get(item.author_id || item.user_id)?.avatar_url,
        answers_count: answerCountMap.get(item.id) || 0,
      })) as SearchQuestion[];

      const experts = expertRows.map((item) => ({
        id: item.id,
        user_id: item.user_id,
        nickname: profileMap.get(item.user_id)?.nickname || null,
        avatar_url: profileMap.get(item.user_id)?.avatar_url || null,
        headline: item.headline || item.title || null,
        intro: item.intro || item.bio || null,
        verification_status: item.verification_status || null,
        follower_count: Number(item.follower_count || 0),
        service_count: Number(item.service_count || 0),
      })) as SearchExpert[];

      const skills = skillRows.map((item) => {
        const expertProfile = profileMap.get(item.expert_id);
        return {
          ...item,
          category_name: categoryMap.get(item.category_id || '') || null,
          expert_nickname: expertProfile?.nickname || null,
          expert_avatar: expertProfile?.avatar_url || null,
        };
      }) as SearchSkill[];

      const posts = postRows.map((item) => ({
        ...item,
        author_nickname: profileMap.get(item.author_id)?.nickname || null,
        author_avatar: profileMap.get(item.author_id)?.avatar_url || null,
      })) as SearchPost[];

      const mergedQuestions = mergeUniqueById(questions, demoMatchedQuestions);
      const mergedExperts = mergeUniqueById(experts, demoMatchedUsers);
      const mergedPosts = mergeUniqueById(posts, demoMatchedPosts);

      return {
        questions: mergedQuestions,
        experts: mergedExperts,
        skills,
        posts: mergedPosts,
      };
    },
    enabled: !!query.trim(),
    staleTime: 30_000,
  });
};

export const useHotKeywords = (keywordType: 'all' | 'question' | 'expert' | 'skill' | 'post' = 'all') => {
  return useQuery({
    queryKey: ['search-hot-keywords', keywordType],
    queryFn: async (): Promise<string[]> => {
      const fromRpc = await supabase.rpc('get_search_suggestions_v2', {
        p_query: '',
        p_limit: 12,
        p_type: keywordType,
      });

      if (!fromRpc.error) {
        const payload = (fromRpc.data || {}) as { hot_keywords?: string[] };
        const hot = Array.isArray(payload.hot_keywords)
          ? payload.hot_keywords.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
          : [];
        return hot;
      } else if (!isMissingRpcError(fromRpc.error, 'get_search_suggestions_v2')) {
        throw fromRpc.error;
      }
      if (!isRuntimeCapabilityAllowed('legacyReadFallback')) {
        throw fromRpc.error;
      }

      const { data, error } = await supabase
        .from('hot_keywords')
        .select('keyword')
        .eq('is_active', true)
        .in('keyword_type', ['all', keywordType])
        .order('score', { ascending: false })
        .limit(12);
      if (error) throw error;

      return (data || [])
        .map((item) => item.keyword)
        .filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
    },
    staleTime: 60_000,
  });
};

export const popularSearchTerms = [
  '考研', '留学', '求职', '简历', '面试',
  '论文', '英语', '健身',
];
