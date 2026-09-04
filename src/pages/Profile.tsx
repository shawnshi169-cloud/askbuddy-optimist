import React, { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Settings,
  FileText,
  User,
  BookOpenText,
  Bookmark,
  Loader2,
  Camera,
  ChevronRight,
  ImagePlus,
  CircleHelp,
  MessageSquareText,
  Info,
  Edit3,
  MessageCircle,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import BottomNav from '@/components/BottomNav';
import SettingsMenu from '@/components/profile/SettingsMenu';
import { useAuth } from '@/contexts/AuthContext';
import { useUploadAvatar, useUploadCover, useUpdateProfile } from '@/hooks/useProfile';
import { useProfileStats } from '@/hooks/useProfileData';
import { useToast } from '@/hooks/use-toast';
import { useIsAdmin } from '@/hooks/useHotTopics';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import PageStateCard from '@/components/common/PageStateCard';
import { buildFromState, navigateToAuthWithReturn } from '@/utils/navigation';

const Profile = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile, loading, signOut } = useAuth();
  const { toast } = useToast();
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const uploadCover = useUploadCover();
  const updateProfile = useUpdateProfile();
  const { data: stats } = useProfileStats();
  const { data: isAdmin } = useIsAdmin();
  usePageScrollMemory('profile');

  const isLoggedIn = !!user;

  const handleLogout = async () => {
    setLoggingOut(true);
    await signOut();
    setLoggingOut(false);
    toast({ title: '已退出登录' });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const publicUrl = await uploadAvatar.mutateAsync(file);
      await updateProfile.mutateAsync({ avatar_url: publicUrl });
    } catch {
      // error handled in mutation
    } finally {
      setUploading(false);
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverUploading(true);
    try {
      const publicUrl = await uploadCover.mutateAsync(file);
      await updateProfile.mutateAsync({ cover_url: publicUrl });
    } catch {
      // error handled in mutation
    } finally {
      setCoverUploading(false);
    }
  };

  const profileStats = [
    { label: '回答', count: stats?.answers || 0, route: '/profile/answers' },
    { label: '收藏', count: stats?.favorites || 0, route: '/profile/favorites' },
    { label: '关注', count: stats?.following || 0, route: '/profile/following' },
  ];

  const commonFeatures: Array<{
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
  }> = [
    {
      icon: <BookOpenText size={22} className="text-app-action" />,
      label: '我的经历',
      onClick: () => navigate('/profile/experiences', { state: buildFromState(location) }),
    },
    {
      icon: <MessageCircle size={22} className="text-sky-600" />,
      label: '我的回答',
      onClick: () => navigate('/profile/answers', { state: buildFromState(location) }),
    },
    {
      icon: <Bookmark size={22} className="text-amber-600" />,
      label: '我的收藏',
      onClick: () => navigate('/profile/favorites', { state: buildFromState(location) }),
    },
    {
      icon: <FileText size={22} className="text-slate-500" />,
      label: '草稿箱',
      onClick: () => navigate('/profile/drafts', { state: buildFromState(location) }),
    },
  ];

  const supportItems: Array<{
    icon: React.ReactNode;
    label: string;
    description: string;
    onClick: () => void;
  }> = [
    {
      icon: <CircleHelp size={18} className="text-primary" />,
      label: '帮助中心',
      description: '常见问题和使用说明',
      onClick: () => navigate('/settings/help', { state: buildFromState(location) }),
    },
    {
      icon: <FileText size={18} className="text-muted-foreground" />,
      label: '问问规范',
      description: '查看发帖和互动规则',
      onClick: () => navigate('/settings/guidelines', { state: buildFromState(location) }),
    },
    {
      icon: <MessageSquareText size={18} className="text-emerald-600" />,
      label: '产品反馈',
      description: '告诉我们你的使用建议',
      onClick: () => navigate('/settings/feedback', { state: buildFromState(location) }),
    },
    {
      icon: <Info size={18} className="text-muted-foreground" />,
      label: '关于我们',
      description: '了解产品和团队信息',
      onClick: () => navigate('/settings/about', { state: buildFromState(location) }),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-[100dvh] app-soft-muted-bg pb-16 px-4 pt-[calc(env(safe-area-inset-top)+1rem)]">
        <PageStateCard variant="loading" title="正在加载个人主页…" description="首次进入可能会稍慢一点。" />
      </div>
    );
  }

  const coverUrl = profile?.cover_url || null;
  if (isAdmin) {
    supportItems.push({
      icon: <Settings size={18} className="text-emerald-600" />,
      label: '管理后台',
      description: '处理内容审核和运营配置',
      onClick: () => navigate('/admin', { state: buildFromState(location) }),
    });
  }

  return (
    <div className="min-h-[100dvh] app-soft-muted-bg pb-16">
      {/* Hidden file inputs */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleAvatarUpload}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
      />
      <input
        type="file"
        ref={coverInputRef}
        onChange={handleCoverUpload}
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
      />

      <SettingsMenu 
        isOpen={showSettingsMenu} 
        onClose={() => setShowSettingsMenu(false)} 
        onSignOut={handleLogout}
        showSignOut={isLoggedIn}
        signingOut={loggingOut}
      />

      {/* Cover Banner */}
      <div className="relative">
        <div 
          className="h-40 bg-gradient-to-br from-[#79d5c7] via-[#9be5da] to-[#d8f4ee] relative overflow-hidden"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {coverUrl && (
            <img 
              src={coverUrl} 
              alt="封面" 
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
          {/* Overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent" />
          
          {/* Top buttons */}
          <div className="absolute top-0 right-0 flex items-center gap-1 pr-3" style={{ top: 'calc(env(safe-area-inset-top) + 0.5rem)' }}>
            {isLoggedIn && (
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 rounded-full text-white/90 backdrop-blur-sm hover:bg-white/20 hover:text-white"
                onClick={() => coverInputRef.current?.click()}
                disabled={coverUploading}
              >
                {coverUploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-11 w-11 rounded-full text-white/90 backdrop-blur-sm hover:bg-white/20 hover:text-white"
              onClick={() => setShowSettingsMenu(true)}
            >
              <Settings size={18} />
            </Button>
          </div>
        </div>

        {/* Profile info overlapping the banner */}
        <div className="relative z-10 -mt-8 app-page-padding">
          {isLoggedIn ? (
            <div className="surface-card rounded-3xl p-4 shadow-sm">
              <div className="flex items-end gap-3">
                <div className="relative group">
                  <Avatar className="h-[72px] w-[72px] border-[3px] border-background shadow-lg">
                    {avatarLoading && profile?.avatar_url && (
                      <Skeleton className="absolute inset-0 rounded-full" />
                    )}
                    <AvatarImage 
                      src={profile?.avatar_url || ''} 
                      alt={profile?.nickname || '用户'} 
                      onLoad={() => setAvatarLoading(false)}
                      onError={() => setAvatarLoading(false)}
                      className={avatarLoading ? 'opacity-0' : 'opacity-100 transition-opacity duration-300'}
                    />
                    <AvatarFallback className="bg-muted text-muted-foreground text-xl font-semibold">
                      {profile?.nickname?.charAt(0) || <User size={24} />}
                    </AvatarFallback>
                  </Avatar>
                  <button
                    className="absolute -bottom-2 -right-2 flex h-11 w-11 items-center justify-center rounded-full border-4 border-background bg-app-action text-white shadow-sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                  >
                    {uploading ? <Loader2 size={12} className="animate-spin" /> : <Camera size={12} />}
                  </button>
                </div>
                
                <div className="flex-1 pb-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">{profile?.nickname || '新用户'}</h2>
                      <div className="mt-1 flex flex-wrap gap-2">
                        <button
                          className="app-chip-neutral min-h-11 px-3 text-[11px] font-medium"
                          onClick={() => navigate(`/person/${user?.id}`, { state: buildFromState(location) })}
                        >
                          查看我的主页
                        </button>
                        <button
                          className="app-chip-neutral min-h-11 px-3 text-[11px] font-medium"
                          onClick={() => navigate('/edit-profile', { state: buildFromState(location) })}
                        >
                          <Edit3 size={11} className="mr-1" />
                          编辑资料
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {profile?.bio || '点击头像可更新头像，右上角可继续调整个人设置。'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="surface-card rounded-3xl p-5 shadow-sm">
              <div className="flex items-end gap-3">
                <Avatar className="h-[72px] w-[72px] border-[3px] border-background shadow-lg">
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User size={28} />
                  </AvatarFallback>
                </Avatar>
                <Button 
                  className="mb-1 rounded-full px-6 font-medium shadow-sm"
                  onClick={() => navigateToAuthWithReturn(navigate, location)}
                >
                  登录 / 注册
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">登录后记录经历、回答问题并管理个人资料。</p>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row */}
      <div className="app-page-padding mt-4">
        <Card className="overflow-hidden rounded-3xl border-none shadow-sm">
          <CardContent className="p-0">
            <div className="grid grid-cols-3">
              {profileStats.map((item, index) => (
                <button 
                  key={item.label}
                  className={`flex flex-col items-center py-4 hover:bg-muted/50 transition-colors active:bg-muted ${
                    index < profileStats.length - 1 ? 'border-r border-border' : ''
                  }`}
                  onClick={() => isLoggedIn ? navigate(item.route, { state: buildFromState(location) }) : navigateToAuthWithReturn(navigate, location)}
                >
                  <span className="text-xl font-bold text-foreground">{item.count}</span>
                  <span className="text-xs text-muted-foreground mt-0.5">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common Features */}
      <div className="app-page-padding mt-4">
        <Card className="overflow-hidden rounded-3xl border-none shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
              <span className="w-7 h-7 bg-app-action-soft rounded-lg flex items-center justify-center">
                <BookOpenText size={14} className="text-app-action" />
              </span>
              常用功能
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {commonFeatures.map((item, index) => (
                <button
                  key={index}
                  className="flex h-[92px] flex-col items-center justify-center rounded-2xl py-3 transition-colors hover:bg-muted/60 active:scale-95"
                  onClick={() => isLoggedIn ? item.onClick() : navigateToAuthWithReturn(navigate, location)}
                >
                  <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center mb-2 shadow-sm">
                    {item.icon}
                  </div>
                  <span className="text-xs text-foreground">{item.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Service List */}
      <div className="app-page-padding mt-4 mb-4">
        <Card className="overflow-hidden rounded-3xl border-none shadow-sm">
          <CardContent className="p-5">
            <h3 className="mb-4 text-sm font-semibold text-foreground">帮助与信息</h3>
            <div className="space-y-2">
            {supportItems.map((item) => (
              <button
                key={item.label}
                className="w-full flex items-center justify-between rounded-2xl px-4 py-3 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                onClick={item.onClick}
              >
                <div className="flex items-center gap-3">
                  {item.icon}
                  <div>
                    <div className="text-sm font-medium text-foreground">{item.label}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-muted-foreground" />
              </button>
            ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
