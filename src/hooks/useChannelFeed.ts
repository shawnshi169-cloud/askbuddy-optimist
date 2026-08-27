import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  filterQuestionsByCategory,
  mapDemoExpertsByChannel,
  mapDemoQuestionsByChannel,
  mapExpertToUIModel,
  mapQuestionToUIModel,
  mergeUniqueById,
  type UIExpertCardModel,
  type UIQuestionModel,
} from '@/lib/adapters/contentAdapters';
import { demoExperts, demoQuestions } from '@/lib/demoData';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';

interface ChannelFeedResult {
  channel: string;
  subcategory: string | null;
  featured: {
    id: string;
    title: string;
    description: string | null;
  } | null;
  questions: UIQuestionModel[];
  experts: UIExpertCardModel[];
}

const isMissingRpcError = (error: unknown, functionName: string) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return message.includes(`public.${functionName}`) || message.includes('schema cache');
};

const buildPresentationFixtureFeed = (
  channel: string,
  subcategory: string,
  questionKeywords: Record<string, string[]>
): ChannelFeedResult => {
  const demoQuestionModels = mapDemoQuestionsByChannel(demoQuestions, channel);
  const demoExpertModels = mapDemoExpertsByChannel(demoExperts, channel, { categoryFallback: 'all' });

  const questions =
    subcategory === 'all'
      ? demoQuestionModels
      : filterQuestionsByCategory(demoQuestionModels, subcategory, questionKeywords);

  const experts =
    subcategory === 'all'
      ? demoExpertModels
      : demoExpertModels.filter((item) => item.category === subcategory || item.category === 'all');

  return {
    channel,
    subcategory: subcategory === 'all' ? null : subcategory,
    featured: null,
    questions,
    experts,
  };
};

export const useChannelFeed = (
  channel: 'education-learning' | 'career-development' | 'lifestyle-services' | 'hobbies-skills',
  subcategory: string,
  options?: { questionKeywords?: Record<string, string[]> }
) => {
  const questionKeywords = options?.questionKeywords || {};

  return useQuery({
    queryKey: ['channel-feed', channel, subcategory],
    queryFn: async () => {
      const presentationFixturesEnabled = isPresentationFixtureAllowed();
      const rpcResult = await supabase.rpc('get_channel_feed', {
        p_channel: channel,
        p_subcategory: subcategory,
        p_questions_limit: 24,
        p_experts_limit: 16,
      });

      if (rpcResult.error) {
        if (presentationFixturesEnabled && isMissingRpcError(rpcResult.error, 'get_channel_feed')) {
          return buildPresentationFixtureFeed(channel, subcategory, questionKeywords);
        }
        throw rpcResult.error;
      }

      const payload = rpcResult.data && typeof rpcResult.data === 'object' && !Array.isArray(rpcResult.data)
        ? rpcResult.data as Record<string, unknown>
        : {};
      const questionPayload = payload.questions && typeof payload.questions === 'object' && !Array.isArray(payload.questions)
        ? payload.questions as Record<string, unknown>
        : {};
      const expertPayload = payload.experts && typeof payload.experts === 'object' && !Array.isArray(payload.experts)
        ? payload.experts as Record<string, unknown>
        : {};
      const featuredPayload = payload.featured && typeof payload.featured === 'object' && !Array.isArray(payload.featured)
        ? payload.featured as Record<string, unknown>
        : null;

      const questionItems = Array.isArray(questionPayload.items)
        ? questionPayload.items
        : [];
      const expertItems = Array.isArray(expertPayload.items)
        ? expertPayload.items
        : [];

      const dbQuestions = questionItems.map((item) =>
        mapQuestionToUIModel(item as Parameters<typeof mapQuestionToUIModel>[0]));
      const dbExperts = expertItems.map((item) =>
        mapExpertToUIModel(item as Parameters<typeof mapExpertToUIModel>[0], { categoryFallback: 'all' }));

      const presentationFixture = presentationFixturesEnabled
        ? buildPresentationFixtureFeed(channel, subcategory, questionKeywords)
        : null;

      return {
        channel: typeof payload.channel === 'string' ? payload.channel : channel,
        subcategory: typeof payload.subcategory === 'string'
          ? payload.subcategory
          : (subcategory === 'all' ? null : subcategory),
        featured: featuredPayload
          && typeof featuredPayload.id === 'string'
          && typeof featuredPayload.title === 'string'
          ? {
              id: featuredPayload.id,
              title: featuredPayload.title,
              description: typeof featuredPayload.description === 'string'
                ? featuredPayload.description
                : null,
            }
          : null,
        questions: presentationFixture
          ? mergeUniqueById(dbQuestions, presentationFixture.questions)
          : dbQuestions,
        experts: presentationFixture
          ? mergeUniqueById(dbExperts, presentationFixture.experts)
          : dbExperts,
      } satisfies ChannelFeedResult;
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};
