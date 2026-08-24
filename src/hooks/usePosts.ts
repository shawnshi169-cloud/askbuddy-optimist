import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { copyTextToClipboard } from '@/utils/clipboard';

export interface PostWithProfile {
  id: string;
  user_id: string;
  content: string;
  images: string[];
  video: string | null;
  topics: string[];
  likes_count: number;
  comments_count: number;
  shares_count: number;
  created_at: string;
  profile_nickname: string | null;
  profile_avatar: string | null;
  liked_by_me: boolean;
}

export interface CommentWithProfile {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  likes_count: number;
  created_at: string;
  profile_nickname: string | null;
  profile_avatar: string | null;
}

// Fetch all posts with author profiles
export const usePosts = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['posts', user?.id],
    queryFn: async (): Promise<PostWithProfile[]> => {
      // Fetch posts
      const { data: posts, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!posts || posts.length === 0) return [];

      // Fetch profiles for post authors
      const userIds = [...new Set(posts.map((post) => post.author_id ?? post.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      // Fetch current user's likes
      let likedPostIds = new Set<string>();
      if (user) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id);
        likedPostIds = new Set((likes || []).map(l => l.post_id));
      }

      return posts.map((post) => {
        const authorId = post.author_id ?? post.user_id;
        const profile = profileMap.get(authorId);
        return {
          ...post,
          user_id: authorId,
          likes_count: post.like_count ?? post.likes_count ?? 0,
          comments_count: post.comment_count ?? post.comments_count ?? 0,
          images: post.images || [],
          topics: post.topics || [],
          profile_nickname: profile?.nickname || '匿名用户',
          profile_avatar: profile?.avatar_url || null,
          liked_by_me: likedPostIds.has(post.id),
        };
      });
    },
  });
};

// Fetch comments for a post
export const usePostComments = (postId: string | null) => {
  return useQuery({
    queryKey: ['post-comments', postId],
    enabled: !!postId,
    queryFn: async (): Promise<CommentWithProfile[]> => {
      const { data: comments, error } = await supabase
        .from('post_comments')
        .select('*')
        .eq('post_id', postId!)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (!comments || comments.length === 0) return [];

      const userIds = [...new Set(comments.map((comment) => comment.author_id ?? comment.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, nickname, avatar_url')
        .in('user_id', userIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, p])
      );

      return comments.map((comment) => {
        const authorId = comment.author_id ?? comment.user_id;
        const profile = profileMap.get(authorId);
        return {
          ...comment,
          user_id: authorId,
          likes_count: comment.likes_count ?? 0,
          profile_nickname: profile?.nickname || '匿名用户',
          profile_avatar: profile?.avatar_url || null,
        };
      });
    },
  });
};

// Toggle like on a post
export const useTogglePostLike = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, liked }: { postId: string; liked: boolean }) => {
      if (!user) throw new Error('请先登录');

      if (liked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      toast({ title: '操作失败', description: error.message, variant: 'destructive' });
    },
  });
};

// Create a new post
export const useCreatePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: { content: string; topics?: string[]; images?: string[] }) => {
      if (!user) throw new Error('请先登录');

      const { error } = await supabase
        .from('posts')
        .insert({
          author_id: user.id,
          user_id: user.id,
          content: data.content,
          topics: data.topics || [],
          images: data.images || [],
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: '发布成功' });
    },
    onError: (error: Error) => {
      toast({ title: '发布失败', description: error.message, variant: 'destructive' });
    },
  });
};

// Add a comment to a post
export const useAddComment = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      if (!user) throw new Error('请先登录');

      const { error } = await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          author_id: user.id,
          user_id: user.id,
          content,
        });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['post-comments', variables.postId] });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    },
    onError: (error: Error) => {
      toast({ title: '评论失败', description: error.message, variant: 'destructive' });
    },
  });
};

// Delete a post
export const useDeletePost = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      if (!user) throw new Error('请先登录');
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId)
        .eq('author_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: '已删除' });
    },
    onError: (error: Error) => {
      toast({ title: '删除失败', description: error.message, variant: 'destructive' });
    },
  });
};

// Increment share count
export const useSharePost = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (postId: string) => {
      await copyTextToClipboard(window.location.href);

      // Get current count and increment
      const { data, error: readError } = await supabase
        .from('posts')
        .select('shares_count')
        .eq('id', postId)
        .single();
      if (readError) throw readError;
      
      const { error } = await supabase
        .from('posts')
        .update({ shares_count: (data?.shares_count || 0) + 1 })
        .eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast({ title: '链接已复制，分享成功' });
    },
    onError: (error: Error) => {
      toast({ title: '分享失败', description: error.message, variant: 'destructive' });
    },
  });
};
