import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { QuestionStatus } from '../../packages/shared-types/src/contracts';

export interface Question {
  id: string;
  title: string;
  content: string | null;
  category: string | null;
  tags: string[] | null;
  bounty_points: number;
  status: QuestionStatus;
  view_count: number;
  author_id?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  profile_nickname?: string | null;
  profile_avatar?: string | null;
  answers_count?: number;
}

export interface Answer {
  id: string;
  content: string;
  question_id: string;
  author_id: string;
  user_id: string;
  status: string;
  is_accepted: boolean;
  like_count: number;
  likes_count: number;
  created_at: string;
  updated_at: string;
  profile_nickname?: string | null;
  profile_avatar?: string | null;
  expert_id?: string | null;
  expert_headline?: string | null;
}

export const useQuestions = (category?: string) => {
  const LIST_LIMIT = 24;

  return useQuery({
    queryKey: ['questions', category],
    queryFn: async () => {
      let query = supabase
        .from('questions')
        .select('id, title, content, category, tags, bounty_points, status, view_count, user_id, created_at, updated_at')
        .eq('is_hidden', false)
        .order('created_at', { ascending: false })
        .limit(LIST_LIMIT);

      if (category) {
        query = query.eq('category', category);
      }

      const { data: questions, error } = await query;
      if (error) throw error;
      if (!questions || questions.length === 0) return [];

      const userIds = Array.from(new Set(questions.map((question) => question.user_id)));
      const questionIds = questions.map((question) => question.id);

      const [profilesResult, answersResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', userIds),
        supabase
          .from('answers')
          .select('question_id')
          .in('question_id', questionIds),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (answersResult.error) throw answersResult.error;

      const profileMap = new Map(
        (profilesResult.data || []).map((profile) => [profile.user_id, profile])
      );
      const answerCountMap = new Map<string, number>();

      (answersResult.data || []).forEach((answer) => {
        answerCountMap.set(answer.question_id, (answerCountMap.get(answer.question_id) || 0) + 1);
      });

      return questions.map((question) => {
        const profile = profileMap.get(question.user_id);
        return {
          ...question,
          profile_nickname: profile?.nickname || '匿名用户',
          profile_avatar: profile?.avatar_url,
          answers_count: answerCountMap.get(question.id) || 0,
        } as Question;
      });
    },
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

export const useQuestionDetail = (questionId: string) => {
  return useQuery({
    queryKey: ['question', questionId],
    queryFn: async () => {
      const { data: question, error: questionError } = await supabase
        .from('questions')
        .select('*')
        .eq('id', questionId)
        .eq('is_hidden', false)
        .maybeSingle();

      if (questionError) throw questionError;
      if (!question) throw new Error('问题不存在');

      const { data: answers, error: answersError } = await supabase
        .from('answers')
        .select('*')
        .eq('question_id', questionId)
        .eq('is_hidden', false)
        .in('status', ['active', 'accepted'])
        .order('is_accepted', { ascending: false })
        .order('created_at', { ascending: true });

      if (answersError) throw answersError;

      const questionAuthorId = question.author_id || question.user_id;
      const allUserIds = Array.from(new Set([
        questionAuthorId,
        ...(answers || []).map((answer) => answer.author_id || answer.user_id),
      ]));

      const [profilesResult, expertsResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('user_id, nickname, avatar_url')
          .in('user_id', allUserIds),
        supabase
          .from('experts')
          .select('id, user_id, headline')
          .in('user_id', allUserIds)
          .eq('profile_status', 'active')
          .eq('is_active', true),
      ]);

      if (profilesResult.error) throw profilesResult.error;
      if (expertsResult.error) throw expertsResult.error;

      const profileMap = new Map(
        (profilesResult.data || []).map((profile) => [profile.user_id, profile])
      );
      const expertMap = new Map(
        (expertsResult.data || []).map((expert) => [expert.user_id, expert])
      );

      const answersWithProfiles = (answers || []).map((answer) => {
        const authorId = answer.author_id || answer.user_id;
        const expert = expertMap.get(authorId);
        return {
          ...answer,
          author_id: authorId,
          profile_nickname: profileMap.get(authorId)?.nickname || '匿名用户',
          profile_avatar: profileMap.get(authorId)?.avatar_url,
          expert_id: expert?.id || null,
          expert_headline: expert?.headline || null,
        };
      }) as Answer[];

      return {
        question: {
          ...question,
          author_id: questionAuthorId,
          profile_nickname: profileMap.get(questionAuthorId)?.nickname || '匿名用户',
          profile_avatar: profileMap.get(questionAuthorId)?.avatar_url,
          answers_count: answersWithProfiles.length,
          view_count: question.view_count ?? 0,
        } as Question,
        answers: answersWithProfiles,
      };
    },
    enabled: !!questionId,
  });
};

export const useCreateQuestion = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      title: string;
      content?: string;
      category?: string;
      tags?: string[];
      bounty_points?: number;
    }) => {
      if (!user) throw new Error('请先登录');

      const rpcResult = await supabase.rpc('create_question_secure', {
        p_title: data.title,
        p_content: data.content || null,
        p_category: data.category || null,
        p_tags: data.tags || null,
        p_bounty_points: data.bounty_points || 0,
      });

      if (rpcResult.error) throw rpcResult.error;
      if (!rpcResult.data) throw new Error('发布失败：服务端未返回问题 ID');
      return rpcResult.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast({ title: '发布成功', description: '您的问题已发布，等待回答' });
    },
    onError: (error: Error) => {
      toast({
        title: '发布失败',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useCreateAnswer = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: {
      question_id: string;
      content: string;
    }) => {
      if (!user) throw new Error('请先登录');

      const rpcResult = await supabase.rpc('create_answer_secure', {
        p_question_id: data.question_id,
        p_content: data.content,
      });

      if (rpcResult.error) throw rpcResult.error;
      if (!rpcResult.data) throw new Error('回答失败：服务端未返回回答 ID');
      return rpcResult.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['question', variables.question_id] });
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast({ title: '回答成功', description: '感谢您的回答！' });
    },
    onError: () => {
      toast({
        title: '回答失败',
        description: '回答暂时无法提交，请稍后重试。',
        variant: 'destructive',
      });
    },
  });
};

export const useToggleFavorite = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (questionId: string) => {
      if (!user) throw new Error('请先登录');

      const { data: existing } = await supabase
        .from('favorites')
        .select('id')
        .eq('question_id', questionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' as const };
      }

      const { error } = await supabase
        .from('favorites')
        .insert({ question_id: questionId, user_id: user.id });
      if (error) throw error;
      return { action: 'added' as const };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['favorites'] });
      queryClient.invalidateQueries({ queryKey: ['question-favorite'] });
      toast({
        title: result.action === 'added' ? '已收藏' : '已取消收藏',
      });
    },
    onError: () => {
      toast({
        title: '操作失败',
        description: '收藏状态暂时无法更新，请稍后重试。',
        variant: 'destructive',
      });
    },
  });
};

export const useQuestionFavoriteState = (questionId: string) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['question-favorite', questionId, user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase
        .from('favorites')
        .select('id')
        .eq('question_id', questionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!questionId && !!user,
  });
};
