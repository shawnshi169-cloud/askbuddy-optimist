
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Heart, MessageCircle, Share2, Bell, SmilePlus, Hash, Send, Loader2, X, MapPin, Trash2, MoreHorizontal, PenSquare, Flame } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from '@/components/ui/input';
import BottomNav from '../components/BottomNav';
import { usePosts, usePostComments, useTogglePostLike, useCreatePost, useAddComment, useDeletePost, useSharePost, PostWithProfile } from '@/hooks/usePosts';
import { useFollowingPosts } from '@/hooks/useFollowingPosts';
import { useLocalPosts } from '@/hooks/useLocalPosts';
import { useUploadPostMedia } from '@/hooks/usePostMediaUpload';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import PageStateCard from '@/components/common/PageStateCard';
import { usePageScrollMemory } from '@/hooks/usePageScrollMemory';
import { isNativeApp } from '@/utils/platform';
import { buildFromState } from '@/utils/navigation';
import { isPresentationFixtureAllowed } from '@/config/runtimeMode';
import { toast } from 'sonner';

const Discover: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const nativeMode = isNativeApp();
  const presentationFixturesEnabled = isPresentationFixtureAllowed();
  const [activeTab, setActiveTab] = useState<'following' | 'recommended' | 'local'>(() => {
    const cached = sessionStorage.getItem('tab:discover');
    if (cached === 'following' || cached === 'local' || cached === 'recommended') return cached;
    return 'recommended';
  });
  const [showNotification, setShowNotification] = useState(true);
  const [currentLocation, setCurrentLocation] = useState('深圳');
  const { user, profile } = useAuth();
  const {
    data: posts,
    isLoading,
    isError: postsError,
    error: postsErrorDetail,
    refetch: retryPosts,
  } = usePosts();
  const {
    data: followingPosts,
    isLoading: followingLoading,
    isError: followingError,
    error: followingErrorDetail,
    refetch: retryFollowingPosts,
  } = useFollowingPosts();
  const {
    data: localPosts,
    isLoading: localLoading,
    isError: localError,
    error: localErrorDetail,
    refetch: retryLocalPosts,
  } = useLocalPosts(currentLocation);

  const presentationTopicFixtures = [
    { id: 'topic-1', name: '留学申请', hint: '经验帖最多' },
    { id: 'topic-2', name: '简历优化', hint: '今天很热' },
    { id: 'topic-3', name: '租房避坑', hint: '同城讨论' },
    { id: 'topic-4', name: '副业技能', hint: '持续更新' },
    { id: 'topic-5', name: '考研复习', hint: '正在讨论' },
  ];

  // Post creation state
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostTags, setNewPostTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showComposerLeaveDialog, setShowComposerLeaveDialog] = useState(false);
  const previewsRef = useRef<string[]>([]);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const createPost = useCreatePost();
  const uploadMedia = useUploadPostMedia();

  const sampleEmojis = ['😊', '😂', '😍', '🤔', '👍', '🎉', '❤️', '😭', '🔥', '✨', '🙏', '👏', '🌹', '🤗', '😁'];
  const hasComposerContent = Boolean(newPostContent.trim() || newPostTags.length > 0 || selectedImages.length > 0);

  const resetComposer = () => {
    previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setImagePreviews([]);
    setShowEmojiPicker(false);
    setNewPostContent('');
    setNewPostTags([]);
    setNewTagInput('');
    if (imageInputRef.current) {
      imageInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const syncLocation = () => {
      const stored = localStorage.getItem('currentLocation') || '深圳';
      setCurrentLocation(stored);
    };

    syncLocation();
    window.addEventListener('storage', syncLocation);
    return () => window.removeEventListener('storage', syncLocation);
  }, []);

  usePageScrollMemory('discover');

  useEffect(() => {
    sessionStorage.setItem('tab:discover', activeTab);
  }, [activeTab]);

  useEffect(() => {
    previewsRef.current = imagePreviews;
  }, [imagePreviews]);

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return;
    try {
      let imageUrls: string[] = [];
      if (selectedImages.length > 0) {
        imageUrls = await uploadMedia.mutateAsync(selectedImages);
      }
      await createPost.mutateAsync({ content: newPostContent, topics: newPostTags, images: imageUrls });
      setIsPostDialogOpen(false);
      resetComposer();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '发布失败，请稍后重试');
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + selectedImages.length > 9) {
      toast.error('最多添加 9 张图片');
      e.target.value = '';
      return;
    }
    setSelectedImages(prev => [...prev, ...files]);
    const previews = files.map(f => URL.createObjectURL(f));
    setImagePreviews(prev => [...prev, ...previews]);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    const target = imagePreviews[index];
    if (target) URL.revokeObjectURL(target);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !newPostTags.includes(newTagInput.trim())) {
      setNewPostTags([...newPostTags, newTagInput.trim()]);
      setNewTagInput('');
    }
  };

  const formatTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: zhCN });
    } catch {
      return '刚刚';
    }
  };

  

  return (
    <div className="pb-16 min-h-[100dvh] app-soft-muted-bg">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'following' | 'recommended' | 'local')} className="w-full">
        <div className={`app-header-bg fixed top-0 z-[90] w-full shadow-sm ${nativeMode ? 'left-0' : 'left-1/2 max-w-md -translate-x-1/2'}`} style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex-1">
              <TabsList className="h-10 w-full justify-start rounded-none bg-transparent p-0">
                {(['following', 'recommended', 'local'] as const).map(tab => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    className="rounded-none px-3 py-1 text-base font-medium text-white/75 data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-white"
                  >
                    {tab === 'following' ? '关注' : tab === 'recommended' ? '推荐' : '同城'}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/25"
                onClick={() => setIsPostDialogOpen(true)}
                aria-label="发动态"
              >
                <PenSquare size={17} />
              </button>
              <button
                className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/25"
                onClick={() => {
                  setShowNotification(false);
                  navigate('/discover/interactions', { state: buildFromState(location) });
                }}
              >
                <Bell size={18} />
                {showNotification && <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive animate-pulse" />}
              </button>
            </div>
          </div>
        </div>
        <div aria-hidden style={{ height: 'calc(env(safe-area-inset-top) + 4rem)' }} />

        {/* Following tab */}
        <TabsContent key="following" value="following" className="mt-0 p-0">
          {!user ? (
            <div className="px-4 pt-5">
              <div className="surface-card rounded-3xl px-6 py-10 text-center text-muted-foreground">
                <p className="mb-2 text-sm font-medium text-foreground">登录后查看关注动态</p>
                <p className="text-sm">你关注的人发布动态后，会优先出现在这里</p>
              </div>
            </div>
          ) : (
            <DiscoverFeed
              posts={followingPosts || []}
              isLoading={followingLoading}
              hasError={followingError}
              errorText={followingErrorDetail instanceof Error ? followingErrorDetail.message : undefined}
              onRetry={() => {
                void retryFollowingPosts();
              }}
              formatTime={formatTime}
              emptyText="暂无关注用户的动态，去关注感兴趣的人吧"
              showComposer
              onQuickPost={() => setIsPostDialogOpen(true)}
              topicChips={presentationFixturesEnabled ? presentationTopicFixtures.slice(0, 4) : []}
              tabLabel="关注广场"
            />
          )}
        </TabsContent>

        {/* Recommended tab */}
        <TabsContent key="recommended" value="recommended" className="mt-0 p-0">
          <DiscoverFeed
            posts={posts || []}
            isLoading={isLoading}
            hasError={postsError}
            errorText={postsErrorDetail instanceof Error ? postsErrorDetail.message : undefined}
            onRetry={() => {
              void retryPosts();
            }}
            formatTime={formatTime}
            showComposer
            onQuickPost={() => setIsPostDialogOpen(true)}
            topicChips={presentationFixturesEnabled ? presentationTopicFixtures : []}
            tabLabel="推荐广场"
          />
        </TabsContent>

        {/* Local tab */}
        <TabsContent key="local" value="local" className="mt-0 p-0">
          <DiscoverFeed
            posts={localPosts || []}
            isLoading={localLoading}
            hasError={localError}
            errorText={localErrorDetail instanceof Error ? localErrorDetail.message : undefined}
            onRetry={() => {
              void retryLocalPosts();
            }}
            formatTime={formatTime}
            emptyText={`还没有“${currentLocation}”的同城动态`}
            showComposer
            onQuickPost={() => setIsPostDialogOpen(true)}
            topicChips={presentationFixturesEnabled ? presentationTopicFixtures.slice(1) : []}
            tabLabel={`${currentLocation}广场`}
            locationLabel={currentLocation}
          />
        </TabsContent>
      </Tabs>

      {/* Post Creation Dialog */}
      <Dialog
        open={isPostDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            if (hasComposerContent && !createPost.isPending && !uploadMedia.isPending) {
              setShowComposerLeaveDialog(true);
              return;
            }
            resetComposer();
          }
          setIsPostDialogOpen(open);
        }}
      >
        <DialogContent className="bg-card/95 backdrop-blur-md border-border rounded-xl max-w-md w-full mx-auto">
          <DialogHeader>
            <DialogTitle className="text-center text-lg font-bold">发布动态</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Textarea
              placeholder="分享你的想法..."
              className="w-full h-32 p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
            />
            <div className="relative">
              <Button variant="outline" size="sm" className="app-btn-secondary flex gap-1" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                <SmilePlus size={18} /> 添加表情
              </Button>
              {showEmojiPicker && (
                <div className="absolute top-full left-0 mt-2 p-2 bg-card rounded-lg shadow-lg border border-border grid grid-cols-5 gap-2 z-10">
                  {sampleEmojis.map((emoji, i) => (
                    <button key={i} className="w-8 h-8 flex items-center justify-center text-xl hover:bg-muted rounded transition-colors" onClick={() => { setNewPostContent(prev => prev + emoji); setShowEmojiPicker(false); }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Hash size={18} className="text-muted-foreground" />
                <Input placeholder="添加标签" value={newTagInput} onChange={(e) => setNewTagInput(e.target.value)} className="flex-1" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }} />
                <Button variant="outline" size="sm" className="app-btn-secondary" onClick={handleAddTag}>添加</Button>
              </div>
              {newPostTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {newPostTags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="bg-primary/10 text-primary border-none rounded-full text-xs py-1 px-3 flex items-center gap-1">
                      #{tag}
                      <button className="ml-1 hover:text-destructive" onClick={() => setNewPostTags(newPostTags.filter(t => t !== tag))}>×</button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            {/* Image previews */}
            {imagePreviews.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {imagePreviews.map((src, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    <img src={src} alt="" className="w-full h-full object-cover" />
                    <button
                      className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center"
                      onClick={() => removeImage(i)}
                    >
                      <X size={12} className="text-white" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageSelect}
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="app-btn-secondary flex gap-1" onClick={() => imageInputRef.current?.click()}>
                <Image size={18} /> 添加图片 {selectedImages.length > 0 && `(${selectedImages.length})`}
              </Button>
            </div>
            <div className="pt-2 flex justify-end">
              <Button className="app-btn-primary" onClick={handleCreatePost} disabled={createPost.isPending || uploadMedia.isPending || !newPostContent.trim()}>
                {(createPost.isPending || uploadMedia.isPending) ? <Loader2 size={16} className="animate-spin mr-1" /> : null}
                {uploadMedia.isPending ? '上传中...' : '发布'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showComposerLeaveDialog} onOpenChange={setShowComposerLeaveDialog}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>放弃本次动态编辑？</AlertDialogTitle>
            <AlertDialogDescription>
              你当前填写的内容还没有发布，确认离开将清空本次编辑内容。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full">继续编辑</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setShowComposerLeaveDialog(false);
                setIsPostDialogOpen(false);
                resetComposer();
              }}
            >
              放弃编辑
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BottomNav />
    </div>
  );
};

// DiscoverFeed component
interface DiscoverFeedProps {
  posts: PostWithProfile[];
  isLoading: boolean;
  hasError?: boolean;
  errorText?: string;
  onRetry?: () => void;
  formatTime: (d: string) => string;
  emptyText?: string;
  showComposer?: boolean;
  onQuickPost?: () => void;
  topicChips?: Array<{ id: string; name: string; hint: string }>;
  tabLabel?: string;
  locationLabel?: string;
}

const DiscoverFeed: React.FC<DiscoverFeedProps> = ({ posts, isLoading, hasError, errorText, onRetry, formatTime, emptyText, showComposer, onQuickPost, topicChips = [], tabLabel, locationLabel }) => {
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});
  const [commentInputs, setCommentInputs] = useState<{ [key: string]: string }>({});
  const [sortMode, setSortMode] = useState<'latest' | 'hot'>('latest');
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const toggleLike = useTogglePostLike();
  const addComment = useAddComment();
  const deletePost = useDeletePost();
  const sharePost = useSharePost();
  const { user } = useAuth();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const sortedPosts = useMemo(() => {
    const list = [...posts];
    if (sortMode === 'hot') {
      return list.sort((a, b) => {
        const aScore = (a.likes_count || 0) * 2 + (a.comments_count || 0) + (a.shares_count || 0);
        const bScore = (b.likes_count || 0) * 2 + (b.comments_count || 0) + (b.shares_count || 0);
        return bScore - aScore;
      });
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts, sortMode]);

  const toggleComments = (postId: string) => {
    setExpandedComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentSubmit = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    await addComment.mutateAsync({ postId, content: text });
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
  };

  return (
    <div className="pb-5">
      {showComposer && (
        <div className="px-4 pt-5">
          <div className="app-header-soft-bg app-soft-border rounded-3xl border p-3.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90">
                <PenSquare size={14} className="app-accent-text" />
              </span>
                <div>
                  <div className="text-sm font-semibold leading-none text-foreground">经验广场</div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{tabLabel}</p>
                </div>
              </div>
              {locationLabel ? (
                <span className="flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                  <MapPin size={12} className="app-accent-text" />
                  {locationLabel}
                </span>
              ) : null}
            </div>

            <div className="mt-3 rounded-2xl bg-white/92 p-3">
              <button
                className="flex w-full items-center gap-3 text-left"
                onClick={onQuickPost}
              >
                <Avatar className="h-9 w-9 border app-soft-border">
                  <AvatarFallback>发</AvatarFallback>
                </Avatar>
                <div className="app-soft-muted-bg flex-1 rounded-full px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted">
                  分享你的真实经验或近况
                </div>
              </button>

              <div className="mt-2.5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <button className="app-soft-muted-bg flex items-center gap-1 rounded-full px-2.5 py-1.5 hover:text-foreground" onClick={onQuickPost}>
                    <Image size={14} />
                    图片
                  </button>
                  <button className="app-soft-muted-bg flex items-center gap-1 rounded-full px-2.5 py-1.5 hover:text-foreground" onClick={onQuickPost}>
                    <Hash size={14} />
                    话题
                  </button>
                  <button className="app-soft-muted-bg flex items-center gap-1 rounded-full px-2.5 py-1.5 hover:text-foreground" onClick={onQuickPost}>
                    <MapPin size={14} />
                    同城
                  </button>
                </div>
                <span className="text-[11px] text-muted-foreground">{posts.length} 条动态</span>
              </div>

              {topicChips.length > 0 && (
                <div className="mt-2.5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide" data-no-swipe-back="true">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-50">
                    <Flame size={13} className="text-amber-500" />
                  </span>
                  {topicChips.slice(0, 4).map((topic) => (
                    <button
                      key={topic.id}
                      className="app-soft-border shrink-0 rounded-full border bg-white px-2.5 py-1.5 text-[11px] font-medium text-foreground transition-colors hover:bg-muted"
                      onClick={onQuickPost}
                    >
                      #{topic.name}
                    </button>
                  ))}
                </div>
              )}

              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                记录可复用经验，帮助他人更快做决策。
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Posts Feed */}
      <div className="app-page-padding pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="app-section-title text-sm">广场动态</h3>
            <p className="app-section-subtitle mt-1">围绕真实经历与可执行建议的经验流</p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-white p-1 shadow-sm">
            <button
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${sortMode === 'latest' ? 'app-soft-surface-bg app-accent-text' : 'text-muted-foreground'}`}
              onClick={() => setSortMode('latest')}
            >
              最新
            </button>
            <button
              className={`rounded-full px-3 py-1 text-[11px] font-medium transition-colors ${sortMode === 'hot' ? 'app-soft-surface-bg app-accent-text' : 'text-muted-foreground'}`}
              onClick={() => setSortMode('hot')}
            >
              最热
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 app-page-padding app-card-stack-gap space-y-3">
        {hasError ? (
          <PageStateCard
            variant="error"
            compact
            title="广场内容加载失败"
            description={errorText || '网络开小差了，稍后再试一次。'}
            actionLabel="重试"
            onAction={onRetry}
          />
        ) : isLoading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="surface-card app-soft-border rounded-3xl border p-4 animate-pulse-soft">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full app-neutral-soft-bg" />
                <div className="flex-1">
                  <div className="mb-1 h-4 w-24 rounded-full app-neutral-soft-bg" />
                  <div className="h-3 w-16 rounded-full app-neutral-soft-bg" />
                </div>
              </div>
              <div className="mb-2 h-4 w-full rounded-full app-neutral-soft-bg" />
              <div className="h-4 w-3/4 rounded-full app-neutral-soft-bg" />
            </div>
          ))
        ) : sortedPosts.length === 0 ? (
          <PageStateCard
            compact
            title={emptyText || '还没有动态'}
            description="现在就发一条新动态，先占个位置。"
          />
        ) : (
          sortedPosts.map((post, index) => (
            <div
              key={post.id}
              className="surface-card app-soft-border rounded-3xl border p-4 opacity-0 animate-slide-up transition-shadow duration-200 hover:shadow-md"
              style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'forwards' }}
            >
              {/* Author info */}
              <div className="flex items-start mb-3">
                <Avatar className="h-10 w-10 ring-2 ring-primary/10 mt-1">
                  <AvatarImage src={post.profile_avatar || ''} alt={post.profile_nickname || ''} />
                  <AvatarFallback>{(post.profile_nickname || '匿').slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="ml-3 flex-1">
                  <div className="font-medium text-foreground">{post.profile_nickname}</div>
                  <div className="text-xs text-muted-foreground">{formatTime(post.created_at)}</div>
                </div>
                {user && user.id === post.user_id && (
                  <div className="relative">
                    <button
                      className="app-soft-muted-bg flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-muted"
                      onClick={() => setMenuOpenId(menuOpenId === post.id ? null : post.id)}
                    >
                      <MoreHorizontal size={18} className="text-muted-foreground" />
                    </button>
                    {menuOpenId === post.id && (
                      <div className="absolute right-0 top-full mt-1 bg-card border border-border rounded-lg shadow-lg z-20 py-1 min-w-[100px]">
                        <button
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-muted transition-colors"
                          onClick={() => {
                            setMenuOpenId(null);
                            deletePost.mutate(post.id);
                          }}
                        >
                          <Trash2 size={14} />
                          删除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="mb-3">
                <p className="mb-3 leading-7 text-foreground">{post.content}</p>
                {post.images && post.images.length > 0 && (
                  <div className={`grid gap-2 mb-3 ${post.images.length === 1 ? 'grid-cols-1' : post.images.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                    {post.images.slice(0, 9).map((img, i) => (
                    <div key={i} className={`${post.images.length === 1 ? 'aspect-video' : 'aspect-square'} overflow-hidden rounded-2xl bg-muted`}>
                        <img src={img} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                      </div>
                    ))}
                  </div>
                )}
                {post.topics && post.topics.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.topics.map(topic => (
                      <Badge key={topic} variant="secondary" className="rounded-full border-none bg-primary/10 text-primary text-xs transition-colors hover:bg-primary/20">
                        #{topic}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Interaction buttons */}
              <div className="app-soft-border app-soft-muted-bg rounded-2xl border p-1">
                <div className="flex justify-between">
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-white hover:text-pink-500"
                  onClick={() => toggleLike.mutate({ postId: post.id, liked: post.liked_by_me })}
                >
                  <Heart className={`h-5 w-5 transition-transform duration-200 ${post.liked_by_me ? 'fill-pink-500 text-pink-500 scale-110' : 'text-current'}`} />
                  <span>{post.likes_count}</span>
                </button>
                <button
                  className={`flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm transition-colors ${expandedComments[post.id] ? 'bg-white text-primary' : 'text-muted-foreground hover:bg-white hover:text-primary'}`}
                  onClick={() => toggleComments(post.id)}
                >
                  <MessageCircle className={`h-5 w-5 ${expandedComments[post.id] ? 'fill-primary/20' : ''}`} />
                  <span>{post.comments_count}</span>
                </button>
                <button
                  className="flex flex-1 items-center justify-center gap-1 rounded-xl px-2 py-2 text-sm text-muted-foreground transition-colors hover:bg-white hover:text-primary"
                  onClick={() => sharePost.mutate(post.id)}
                >
                  <Share2 className="h-5 w-5" />
                  <span>{post.shares_count}</span>
                </button>
                </div>
              </div>

              {/* Comments Section */}
              {expandedComments[post.id] && (
                <CommentsSection
                  postId={post.id}
                  inputRefs={inputRefs}
                  commentInput={commentInputs[post.id] || ''}
                  onInputChange={(val) => setCommentInputs(prev => ({ ...prev, [post.id]: val }))}
                  onSubmit={() => handleCommentSubmit(post.id)}
                  isSubmitting={addComment.isPending}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Separate comments section that fetches its own data
interface CommentsSectionProps {
  postId: string;
  inputRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | null }>;
  commentInput: string;
  onInputChange: (val: string) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ postId, inputRefs, commentInput, onInputChange, onSubmit, isSubmitting }) => {
  const { data: comments, isLoading } = usePostComments(postId);

  return (
      <div className="mt-3 space-y-3 border-t border-border pt-3 animate-fade-in">
      {/* Comment Input */}
        <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7 shrink-0">
          <AvatarFallback>我</AvatarFallback>
        </Avatar>
        <div className="flex-1 flex items-center bg-muted rounded-full px-3 py-1.5">
          <input
            ref={(el) => { inputRefs.current[postId] = el; }}
            className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-muted-foreground"
            placeholder="写评论..."
            value={commentInput}
            onChange={(e) => onInputChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          />
          <button
            className={`ml-2 p-1 rounded-full transition-colors ${commentInput.trim() ? 'text-primary' : 'text-muted-foreground/30'}`}
            onClick={onSubmit}
            disabled={!commentInput.trim() || isSubmitting}
          >
            {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Comment List */}
      {isLoading ? (
        <PageStateCard compact variant="loading" title="正在加载评论…" className="px-3 py-4" />
      ) : comments && comments.length > 0 ? (
        <div className="space-y-2.5">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-2">
              <Avatar className="h-7 w-7 shrink-0 mt-0.5">
                <AvatarImage src={comment.profile_avatar || ''} alt={comment.profile_nickname || ''} />
                <AvatarFallback>{(comment.profile_nickname || '匿').charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="bg-muted rounded-xl px-3 py-2">
                  <span className="text-xs font-medium text-primary">{comment.profile_nickname}</span>
                  <p className="text-sm text-foreground mt-0.5">{comment.content}</p>
                </div>
                <div className="flex items-center gap-3 mt-1 px-1">
                  <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: zhCN })}</span>
                  <button className="text-[10px] text-muted-foreground hover:text-pink-500 flex items-center gap-0.5">
                    <Heart size={10} />
                    {comment.likes_count > 0 && <span>{comment.likes_count}</span>}
                  </button>
                  <button className="text-[10px] text-muted-foreground hover:text-primary">回复</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <PageStateCard compact title="还没有评论" description="你可以先来发第一条评论。" className="px-4 py-5" />
      )}
    </div>
  );
};

export default Discover;
