import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface UpdateProfileData {
  nickname?: string;
  bio?: string;
  avatar_url?: string;
  city?: string;
  cover_url?: string;
}

// Update profile mutation
export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      if (!user) throw new Error('请先登录');

      const updateData: UpdateProfileData = {};
      if (data.nickname !== undefined) updateData.nickname = data.nickname;
      if (data.bio !== undefined) updateData.bio = data.bio;
      if (data.avatar_url !== undefined) updateData.avatar_url = data.avatar_url;
      if (data.city !== undefined) updateData.city = data.city;
      if (data.cover_url !== undefined) updateData.cover_url = data.cover_url;

      const { data: profile, error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id)
        .select('user_id,nickname,avatar_url,cover_url,bio,city')
        .single();

      if (error) throw error;
      return profile;
    },
    onSuccess: async () => {
      await refreshProfile();
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast({ title: '保存成功', description: '个人资料已更新' });
    },
    onError: (error: Error) => {
      toast({ 
        title: '保存失败', 
        description: error.message,
        variant: 'destructive'
      });
    }
  });
};

const uploadImage = async (user: { id: string }, file: File, prefix: string, maxSize: number) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('请上传 JPG、PNG、GIF 或 WebP 格式的图片');
  }
  if (file.size > maxSize) {
    throw new Error(`图片大小不能超过 ${maxSize / 1024 / 1024}MB`);
  }

  const fileExt = file.name.split('.').pop();
  const fileName = `${user.id}/${prefix}_${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, { cacheControl: '3600', upsert: true });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return publicUrl;
};

// Upload avatar mutation
export const useUploadAvatar = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('请先登录');
      return uploadImage(user, file, 'avatar', 2 * 1024 * 1024);
    },
    onError: (error: Error) => {
      toast({ title: '上传失败', description: error.message, variant: 'destructive' });
    }
  });
};

// Upload cover image mutation
export const useUploadCover = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('请先登录');
      return uploadImage(user, file, 'cover', 5 * 1024 * 1024);
    },
    onError: (error: Error) => {
      toast({ title: '上传失败', description: error.message, variant: 'destructive' });
    }
  });
};
