import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useUpdateProfile, useUploadAvatar, useUploadCover } from '@/hooks/useProfile';
import { useEditorExit } from '@/hooks/useEditorExit';
import SubPageHeader from '@/components/layout/SubPageHeader';
import PageStateCard from '@/components/common/PageStateCard';
import { navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';

const EditProfileForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading } = useAuth();
  const updateProfile = useUpdateProfile();
  const uploadAvatar = useUploadAvatar();
  const uploadCover = useUploadCover();
  const [form, setForm] = useState({ nickname: '', bio: '', city: '', avatar_url: '', cover_url: '' });
  const [hydrated, setHydrated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef('');
  const busy = updateProfile.isPending || uploadAvatar.isPending || uploadCover.isPending;
  const dirty = hydrated && JSON.stringify(form) !== initial.current;
  const exit = useEditorExit({ dirty, busy });
  const back = () => navigateBackOr(navigate, '/profile', { location });

  useEffect(() => {
    if (!loading && !user) navigateToAuthWithReturn(navigate, location);
  }, [loading, user, navigate, location]);

  useEffect(() => {
    if (!profile || hydrated) return;
    const next = {
      nickname: profile.nickname || '', bio: profile.bio || '', city: profile.city || '',
      avatar_url: profile.avatar_url || '', cover_url: profile.cover_url || '',
    };
    setForm(next);
    initial.current = JSON.stringify(next);
    setHydrated(true);
  }, [profile, hydrated]);

  const handleSave = async () => {
    if (busy) return;
    setError(null);
    try {
      await updateProfile.mutateAsync(form);
      initial.current = JSON.stringify(form);
      back();
    } catch {
      setError('资料暂时无法保存，填写的内容已保留，请稍后重试。');
    }
  };

  const upload = async (file: File | undefined, kind: 'avatar_url' | 'cover_url') => {
    if (!file || busy) return;
    setError(null);
    try {
      const url = await (kind === 'avatar_url' ? uploadAvatar : uploadCover).mutateAsync(file);
      setForm((current) => ({ ...current, [kind]: url }));
    } catch {
      setError('图片暂时无法上传，请检查格式、大小或稍后重试。');
    }
  };

  if (loading || !user) return <div className="min-h-[100dvh] bg-app-page"><SubPageHeader title="编辑个人资料" variant="content" /><PageStateCard variant="loading" title="正在加载资料…" compact /></div>;
  if (!profile) return <div className="min-h-[100dvh] bg-app-page"><SubPageHeader title="编辑个人资料" variant="content" /><PageStateCard variant="error" title="个人资料暂时无法加载" description="请返回后重试。" compact /></div>;

  return (
    <div className="min-h-[100dvh] bg-app-page pb-6">
      <SubPageHeader title="编辑个人资料" variant="content" onBack={() => exit.requestExit(back)} />
      <main className="space-y-6 px-4 py-5">
        <p className="text-sm leading-6 text-slate-500">这些资料会展示在你的公开主页。经历请在“我的经历”中管理。</p>
        <fieldset disabled={busy} className="min-w-0 space-y-6">
          <div className="space-y-2">
            <Label htmlFor="profile-avatar">头像</Label>
            <Avatar className="h-16 w-16"><AvatarImage src={form.avatar_url} alt="头像预览" /><AvatarFallback>{form.nickname.slice(0, 1) || '我'}</AvatarFallback></Avatar>
            <Input id="profile-avatar" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void upload(event.target.files?.[0], 'avatar_url')} />
            <p className="text-xs text-slate-500">图片不超过 2MB，点击保存后更新公开资料。</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-cover">主页封面</Label>
            {form.cover_url ? <img src={form.cover_url} alt="封面预览" className="h-28 w-full rounded-xl object-cover" /> : null}
            <Input id="profile-cover" type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => void upload(event.target.files?.[0], 'cover_url')} />
            <p className="text-xs text-slate-500">图片不超过 5MB。</p>
          </div>
          <div className="space-y-2"><Label htmlFor="profile-name">昵称</Label><Input id="profile-name" value={form.nickname} onChange={(event) => setForm({ ...form, nickname: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="profile-bio">个人简介</Label><Textarea id="profile-bio" className="min-h-28 text-base" value={form.bio} onChange={(event) => setForm({ ...form, bio: event.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="profile-city">城市</Label><Input id="profile-city" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} /></div>
        </fieldset>
        {error ? <p role="alert" className="text-sm text-rose-700">{error}</p> : null}
      </main>
      <div className="sticky bottom-0 border-t border-app-border-subtle bg-app-page px-4 pt-3" style={{ paddingBottom: 'calc(var(--safe-area-inset-bottom, env(safe-area-inset-bottom)) + 12px)' }}>
        <Button className="app-btn-primary min-h-12 w-full" disabled={busy || !hydrated} onClick={() => void handleSave()}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden /> : null}{busy ? '正在保存…' : '保存资料'}</Button>
      </div>
      <AlertDialog open={exit.open} onOpenChange={exit.setOpen}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl"><AlertDialogHeader><AlertDialogTitle>放弃未保存的资料修改？</AlertDialogTitle><AlertDialogDescription>尚未保存的修改不会展示在公开主页。</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="min-h-11">继续编辑</AlertDialogCancel><AlertDialogAction className="min-h-11" onClick={exit.confirmExit}>放弃并离开</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

const EditProfile = () => {
  const { user } = useAuth();
  return <EditProfileForm key={user?.id || 'signed-out'} />;
};
export default EditProfile;
