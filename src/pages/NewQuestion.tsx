import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  PlusCircle, 
  Tag, 
  Calendar, 
  ImagePlus, 
  File, 
  Mic, 
  Clock, 
  Info, 
  Coins,
  X,
  Loader2
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { toast } from "@/components/ui/use-toast";
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
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useCreateQuestion } from '@/hooks/useQuestions';
import { useAuth } from '@/contexts/AuthContext';
import { navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import SubPageHeader from '@/components/layout/SubPageHeader';

// Define categories with emojis
const categories = [
  { id: 'education', name: '教育学习', emoji: '📚' },
  { id: 'career', name: '职场发展', emoji: '💼' },
  { id: 'lifestyle', name: '生活服务', emoji: '🏡' },
  { id: 'hobby', name: '兴趣技能', emoji: '🎨' },
  { id: 'travel', name: '旅行出行', emoji: '✈️' },
  { id: 'health', name: '健康医疗', emoji: '🏥' },
  { id: 'finance', name: '金融理财', emoji: '💰' },
  { id: 'tech', name: '科技数码', emoji: '📱' },
  { id: 'other', name: '其他问题', emoji: '❓' }
];

// Example placeholder questions to help users
const placeholderQuestions = [
  '如何申请英国留学？',
  '简历优化有哪些关键点？',
  '年轻人第一份工作应该注重什么？',
  '如何平衡工作与生活？',
  '考研需要提前准备什么？'
];

// Point reward recommendation tiers
const pointRecommendations = [
  { value: 5, description: '基础悬赏，适合简单问题' },
  { value: 10, description: '中等悬赏，获得更多关注' },
  { value: 30, description: '高额悬赏，优先推荐给专家' },
  { value: 50, description: '精英悬赏，最快获得回复' }
];

// Time slot options for consultation
const timeSlots = [
  { id: 'morning', name: '上午 (9:00-12:00)', value: 'morning' },
  { id: 'afternoon', name: '下午 (14:00-18:00)', value: 'afternoon' },
  { id: 'evening', name: '晚上 (19:00-22:00)', value: 'evening' },
];

const DRAFT_STORAGE_KEY = 'new-question-draft-v1';
const DRAFT_RESTORE_HINT_KEY = 'new-question-draft-restored-v1';
const MAX_ATTACHMENTS = 6;

interface QuestionDraft {
  title: string;
  description: string;
  selectedCategory: string;
  selectedTags: string[];
  pointReward: string;
  flexibleTime: boolean;
  selectedTimeSlots: string[];
  savedAt: string;
}

interface AttachmentItem {
  id: string;
  file: File;
  previewUrl: string | null;
}

const NewQuestion: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const createQuestion = useCreateQuestion();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [pointReward, setPointReward] = useState('10');
  const [flexibleTime, setFlexibleTime] = useState(true);
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<string[]>([]);
  const [titleFocused, setTitleFocused] = useState(false);
  const [suggestedTags, setSuggestedTags] = useState<string[]>(['留学', '职场', '考研']);
  const [attachments, setAttachments] = useState<AttachmentItem[]>([]);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const attachmentsRef = useRef<AttachmentItem[]>([]);
  const draftStorageKey = user ? `${DRAFT_STORAGE_KEY}:${user.id}` : `${DRAFT_STORAGE_KEY}:guest`;
  const draftRestoreHintKey = user ? `${DRAFT_RESTORE_HINT_KEY}:${user.id}` : `${DRAFT_RESTORE_HINT_KEY}:guest`;
  const titlePlaceholder = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * placeholderQuestions.length);
    return placeholderQuestions[randomIndex];
  }, []);
  
  useEffect(() => {
    attachmentsRef.current = attachments;
  }, [attachments]);

  useEffect(() => {
    return () => {
      attachmentsRef.current.forEach((item) => {
        if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, []);

  useEffect(() => {
    const raw = localStorage.getItem(draftStorageKey);
    if (!raw) {
      setHydratedDraft(true);
      return;
    }
    try {
      const draft = JSON.parse(raw) as Partial<QuestionDraft>;
      if (typeof draft.title === 'string') setTitle(draft.title);
      if (typeof draft.description === 'string') setDescription(draft.description);
      if (typeof draft.selectedCategory === 'string') setSelectedCategory(draft.selectedCategory);
      if (Array.isArray(draft.selectedTags)) setSelectedTags(draft.selectedTags);
      if (typeof draft.pointReward === 'string') setPointReward(draft.pointReward);
      if (typeof draft.flexibleTime === 'boolean') setFlexibleTime(draft.flexibleTime);
      if (Array.isArray(draft.selectedTimeSlots)) setSelectedTimeSlots(draft.selectedTimeSlots);
      if (typeof draft.savedAt === 'string') {
        const savedDate = new Date(draft.savedAt);
        const label = Number.isNaN(savedDate.getTime()) ? '' : `（${savedDate.toLocaleString('zh-CN')}）`;
        const restoredFlag = sessionStorage.getItem(draftRestoreHintKey);
        if (restoredFlag !== draft.savedAt) {
          toast({
            title: '已恢复本地草稿',
            description: `你上次编辑的内容已自动恢复${label}`,
          });
          sessionStorage.setItem(draftRestoreHintKey, draft.savedAt);
        }
      }
    } catch {
      localStorage.removeItem(draftStorageKey);
    } finally {
      setHydratedDraft(true);
    }
  }, [draftRestoreHintKey, draftStorageKey]);
  
  // Handle tag selection (max 5)
  const toggleTag = (tag: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tag)) {
        return prev.filter(t => t !== tag);
      } else {
        if (prev.length >= 5) {
          toast({
            title: "最多选择5个标签",
            description: "请删除一个标签后再添加",
            variant: "destructive"
          });
          return prev;
        }
        return [...prev, tag];
      }
    });
  };
  
  // Add custom tag
  const addCustomTag = () => {
    if (!customTag.trim()) return;
    
    if (selectedTags.includes(customTag.trim())) {
      toast({
        title: "标签已存在",
        description: "请输入不同的标签",
      });
      return;
    }
    
    if (selectedTags.length >= 5) {
      toast({
        title: "最多选择5个标签",
        description: "请删除一个标签后再添加",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedTags(prev => [...prev, customTag.trim()]);
    setCustomTag('');
  };
  
  // Handle time slot selection
  const toggleTimeSlot = (slotId: string) => {
    setSelectedTimeSlots(prev => {
      if (prev.includes(slotId)) {
        return prev.filter(id => id !== slotId);
      } else {
        return [...prev, slotId];
      }
    });
  };
  
  // File upload handling
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      const newFiles = Array.from(event.target.files);
      const remain = Math.max(0, MAX_ATTACHMENTS - attachmentsRef.current.length);
      if (remain <= 0) {
        toast({
          title: `最多添加 ${MAX_ATTACHMENTS} 个附件`,
          description: '请先删除部分附件后再继续添加',
          variant: 'destructive',
        });
        event.target.value = '';
        return;
      }
      const accepted = newFiles.slice(0, remain);
      const normalized = accepted.map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      }));
      setAttachments((prev) => [...prev, ...normalized]);
      
      toast({
        title: "文件已添加",
        description: accepted.length < newFiles.length
          ? `已添加 ${accepted.length} 个附件（最多 ${MAX_ATTACHMENTS} 个）`
          : `成功添加 ${accepted.length} 个附件`,
      });
      event.target.value = '';
    }
  };
  
  // Remove attachment
  const removeAttachment = (attachmentId: string) => {
    setAttachments((prev) => {
      const target = prev.find((item) => item.id === attachmentId);
      if (target?.previewUrl) {
        URL.revokeObjectURL(target.previewUrl);
      }
      return prev.filter((item) => item.id !== attachmentId);
    });
  };
  
  // Fill example content
  const fillExampleContent = () => {
    setTitle('请推荐适合初学者的Python学习资源');
    setDescription('我是一名大学生，没有编程基础，想自学Python用于数据分析。希望能推荐一些适合零基础的学习资源，包括书籍、在线课程或视频教程。我每周能投入约10小时学习，希望3个月内能达到能独立完成简单项目的水平。');
    setSuggestedTags(['Python', '编程', '自学', '数据分析', '学习资源']);
    setSelectedTags(['Python', '编程', '自学']);
  };
  
  // Auto-suggest tags based on title and description
  const autoSuggestTags = () => {
    // This would be connected to a backend AI service in a real app
    // For now, we'll just simulate some suggested tags based on keywords
    const combinedText = `${title} ${description}`.toLowerCase();
    const suggestedTags = [];
    
    if (combinedText.includes('英国') || combinedText.includes('留学')) 
      suggestedTags.push('留学');
    
    if (combinedText.includes('简历') || combinedText.includes('工作')) 
      suggestedTags.push('职场');
    
    if (combinedText.includes('编程') || combinedText.includes('代码')) 
      suggestedTags.push('编程');
    
    if (combinedText.includes('考研') || combinedText.includes('研究生')) 
      suggestedTags.push('考研');
    
    if (combinedText.includes('python') || combinedText.includes('数据分析')) {
      suggestedTags.push('Python');
      suggestedTags.push('数据分析');
    }
    
    setSuggestedTags(suggestedTags.slice(0, 5));
  };

  const hasContent = Boolean(
    title.trim() ||
      description.trim() ||
      selectedCategory ||
      selectedTags.length > 0 ||
      attachments.length > 0
  );

  useEffect(() => {
    if (!hydratedDraft) return;
    if (!hasContent) {
      localStorage.removeItem(draftStorageKey);
      return;
    }

    const payload: QuestionDraft = {
      title,
      description,
      selectedCategory,
      selectedTags,
      pointReward,
      flexibleTime,
      selectedTimeSlots,
      savedAt: new Date().toISOString(),
    };

    const timer = window.setTimeout(() => {
      localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    }, 400);

    return () => window.clearTimeout(timer);
  }, [
    hydratedDraft,
    hasContent,
    draftStorageKey,
    title,
    description,
    selectedCategory,
    selectedTags,
    pointReward,
    flexibleTime,
    selectedTimeSlots,
  ]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasContent || createQuestion.isPending) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasContent, createQuestion.isPending]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const shouldDisableSwipeBack = hasContent && !createQuestion.isPending;
    document.body.dataset.swipeBackDisabled = shouldDisableSwipeBack ? 'true' : 'false';
    return () => {
      document.body.dataset.swipeBackDisabled = 'false';
    };
  }, [hasContent, createQuestion.isPending]);
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "请先登录",
        description: "登录后才能发布问题",
        variant: "destructive"
      });
      navigateToAuthWithReturn(navigate, location);
      return;
    }

    if (!title.trim()) {
      toast({
        title: "请输入问题标题",
        description: "问题标题不能为空",
        variant: "destructive"
      });
      return;
    }
    
    if (selectedTags.length === 0) {
      toast({
        title: "请选择至少一个标签",
        description: "选择合适的标签有助于您获得更精准的回答",
        variant: "destructive"
      });
      return;
    }
    
    // 提交到数据库
    createQuestion.mutate({
      title: title.trim(),
      content: description.trim() || undefined,
      category: selectedCategory || undefined,
      tags: selectedTags,
      bounty_points: parseInt(pointReward) || 0
    }, {
      onSuccess: () => {
        localStorage.removeItem(draftStorageKey);
        sessionStorage.removeItem(draftRestoreHintKey);
        attachments.forEach((item) => {
          if (item.previewUrl) URL.revokeObjectURL(item.previewUrl);
        });
        navigateBackOr(navigate, '/', { location });
      }
    });
  };
  
  // Save as draft
  const saveDraft = (options?: { silent?: boolean }) => {
    if (!hasContent) {
      localStorage.removeItem(draftStorageKey);
      sessionStorage.removeItem(draftRestoreHintKey);
      if (!options?.silent) {
        toast({
          title: "暂无可保存内容",
          description: "输入一些标题或描述后再保存草稿",
        });
      }
      return;
    }

    const payload: QuestionDraft = {
      title,
      description,
      selectedCategory,
      selectedTags,
      pointReward,
      flexibleTime,
      selectedTimeSlots,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem(draftStorageKey, JSON.stringify(payload));
    if (!options?.silent) {
      toast({
        title: "已保存草稿",
        description: "内容已保存在本地，稍后可继续编辑",
      });
    }
  };

  const handleBack = () => {
    if (!hasContent || createQuestion.isPending) {
      navigateBackOr(navigate, '/', { location });
      return;
    }
    setShowLeaveDialog(true);
  };
  
  return (
    <div className="min-h-[100dvh] app-soft-muted-bg pb-20">
      <SubPageHeader
        title="发布问题"
        onBack={handleBack}
        right={
          <button onClick={() => saveDraft()} className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white hover:bg-white/25">
            存草稿
          </button>
        }
        headerClassName="border-primary/80 bg-primary"
      />
      
      <div className="space-y-5 p-4 pt-4">
        <div className="surface-card rounded-3xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">发布提示</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                标题清楚、描述具体，通常更容易获得有效回答。
              </p>
            </div>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
              发布前检查
            </span>
          </div>
        </div>

        <div className="px-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">基础信息</p>
        </div>
        {/* 1. Question Title */}
        <div className="surface-card rounded-3xl p-5">
          <div className="flex items-start mb-1">
            <h2 className="text-base font-semibold">问题标题</h2>
            <span className="text-red-500 ml-1">*</span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">简洁明了的标题更容易获得回答（20字以内）</p>
          
          <div className="relative">
            <Input
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (e.target.value.length > 10) {
                  autoSuggestTags();
                }
              }}
              placeholder={titlePlaceholder}
              maxLength={40}
              className="rounded-2xl border-border p-3 text-base focus:border-primary"
              onFocus={() => setTitleFocused(true)}
              onBlur={() => setTitleFocused(false)}
            />
            <div className="absolute right-3 top-3 text-xs text-muted-foreground">
              {title.length}/40
            </div>
            
            {titleFocused && title.length > 0 && (
              <div className="mt-2 rounded-2xl border app-soft-border app-soft-muted-bg p-3">
                <p className="mb-2 text-xs text-muted-foreground">可能类似的问题：</p>
                <ul className="space-y-2">
                  <li className="text-sm text-primary hover:underline cursor-pointer">如何提高英语口语水平？</li>
                  <li className="text-sm text-primary hover:underline cursor-pointer">自学编程需要什么基础？</li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        {/* 2. Detailed Description */}
        <div className="surface-card rounded-3xl p-5">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-semibold">详细描述</h2>
            <button 
              onClick={fillExampleContent}
              className="text-sm text-primary flex items-center"
            >
              <Info size={14} className="mr-1" />
              查看示例
            </button>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">补充背景信息，帮助他人更好地理解您的问题</p>
          
          <Textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (e.target.value.length > 50) {
                autoSuggestTags();
              }
            }}
            placeholder="提供背景信息，如'我的GPA是3.5，想申请英国硕士，如何选校？'"
            className="min-h-[140px] rounded-2xl border-border p-3 text-base focus:border-primary"
          />
          <div className="text-right mt-1">
            <span className="text-xs text-muted-foreground">{description.length}/1000</span>
          </div>
        </div>
        
        {/* 3. Tags Selection - Redesigned */}
        <div className="px-1 -mt-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">曝光与补充</p>
        </div>

        <div className="surface-card rounded-3xl p-5">
          <div className="flex items-start mb-1">
            <h2 className="text-base font-semibold">选择标签</h2>
            <span className="text-red-500 ml-1">*</span>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">最多选择5个标签，帮助问题被合适的人看到</p>
          
          {/* Current selected tags */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {selectedTags.map(tag => (
                <Badge 
                  key={tag} 
                  variant="secondary"
                  className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-full flex items-center gap-1"
                >
                  {tag}
                  <button onClick={() => toggleTag(tag)} className="ml-1 text-primary hover:text-primary/80">
                    <X size={14} />
                  </button>
                </Badge>
              ))}
            </div>
          )}
          
          {/* Custom tag input */}
          <div className="flex gap-2 mb-4">
            <Input
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              placeholder="添加自定义标签..."
              className="flex-1 rounded-2xl border-border focus:border-primary"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomTag();
                }
              }}
            />
            <Button 
              onClick={addCustomTag}
              className="app-btn-primary"
            >
              添加
            </Button>
          </div>
          
          {/* AI Suggested Tags */}
          {title.length > 0 && suggestedTags.length > 0 && (
            <div className="mb-4 rounded-2xl bg-secondary p-3">
              <p className="text-sm font-medium mb-2 flex items-center">
                <Tag size={14} className="text-primary mr-1" />
                AI 推荐标签
              </p>
              <div className="flex gap-2 flex-wrap">
                {suggestedTags.map(tag => (
                  <Badge
                    key={tag}
                    variant="outline"
                    className={`px-3 py-1.5 rounded-full text-sm cursor-pointer ${
                      selectedTags.includes(tag) 
                        ? 'bg-primary/15 text-primary border-primary/30' 
                        : 'bg-secondary text-secondary-foreground border-border hover:bg-secondary/80'
                    }`}
                    onClick={() => toggleTag(tag)}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {/* Popular Categories */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">常用分类</p>
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Badge
                  key={category.id}
                  variant="outline"
                  className={`px-3 py-1.5 rounded-full flex items-center cursor-pointer ${
                    selectedTags.includes(category.name)
                      ? 'bg-primary/15 text-primary border-primary/30' 
                        : 'border-border hover:bg-muted hover:border-border'
                  }`}
                  onClick={() => toggleTag(category.name)}
                >
                  <span className="mr-1">{category.emoji}</span>
                  {category.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        {/* 4. Point Reward - Simplified */}
        <div className="surface-card rounded-3xl p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">悬赏积分</h2>
            <button className="text-sm text-primary flex items-center">
              <Coins size={14} className="mr-1" />
              我的积分: 100
            </button>
          </div>
          <p className="mb-3 text-sm text-muted-foreground">设置悬赏可提高问题曝光度和回答质量</p>
          
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Input
                type="number"
                min="1"
                value={pointReward}
                onChange={(e) => setPointReward(e.target.value)}
                placeholder="输入积分数量"
                className="w-full rounded-2xl border-border p-3 text-lg focus:border-primary"
              />
            </div>
            <span className="text-lg font-medium text-foreground">积分</span>
          </div>
          
          {/* Reward recommendations */}
          <div className="mt-4 grid grid-cols-2 gap-2">
            {pointRecommendations.map(rec => (
              <button
                key={rec.value}
                onClick={() => setPointReward(rec.value.toString())}
                className={`p-3 rounded-2xl border text-left ${
                  parseInt(pointReward) === rec.value 
                    ? 'border-primary/30 bg-primary/10' 
                    : 'border-border hover:border-border'
                }`}
              >
                <span className="block font-medium">{rec.value} 积分</span>
                <span className="text-xs text-muted-foreground">{rec.description}</span>
              </button>
            ))}
          </div>
          
          {/* Response time estimate */}
          <div className="mt-4 bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 p-3 rounded-2xl">
            <p className="text-sm text-primary">
              参考：悬赏 {pointReward} 积分的问题通常在
              {parseInt(pointReward) >= 30 ? ' 2 小时内 ' : ' 12 小时内 '}
              获得首次回答
            </p>
          </div>
        </div>
        
        {/* 5-6. Consultation & Attachments - SIDE BY SIDE layout */}
        <div className="px-1 -mt-1">
          <p className="text-xs font-medium tracking-wide text-muted-foreground">附加信息</p>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* 5. Schedule Consultation */}
          <div className="surface-card rounded-3xl p-5">
            <h2 className="text-base font-semibold mb-3">预约咨询</h2>
            <p className="mb-3 text-sm text-muted-foreground">您可以选择预约时间段，与专家一对一交流</p>
            
            <div className="flex items-center mb-4">
              <Checkbox 
                checked={flexibleTime} 
                onCheckedChange={(checked) => {
                  setFlexibleTime(!!checked);
                  if (checked) {
                    setSelectedTimeSlots([]);
                  }
                }}
                id="flexible-time"
                className="mr-2 text-primary"
              />
              <Label htmlFor="flexible-time" className="cursor-pointer">
                时间可商量（回答者可自由解答）
              </Label>
            </div>
            
            {!flexibleTime && (
              <div>
                <p className="mb-2 text-sm text-muted-foreground">选择您方便的时间段：</p>
                <div className="space-y-2">
                  {timeSlots.map(slot => (
                    <div 
                      key={slot.id}
                      className={`border rounded-2xl p-3 flex items-center ${
                        selectedTimeSlots.includes(slot.value)
                          ? 'border-primary/30 bg-primary/10'
                          : 'border-border'
                      }`}
                      onClick={() => toggleTimeSlot(slot.value)}
                    >
                      <Checkbox 
                        checked={selectedTimeSlots.includes(slot.value)}
                        onCheckedChange={() => toggleTimeSlot(slot.value)}
                        id={`time-${slot.id}`}
                        className="mr-2 text-primary"
                      />
                      <Label htmlFor={`time-${slot.id}`} className="flex-1 cursor-pointer flex items-center">
                        <Clock size={16} className="mr-2 text-muted-foreground" />
                        <span>{slot.name}</span>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* 6. Attachments Upload */}
          <div className="surface-card rounded-3xl p-5">
            <h2 className="text-base font-semibold mb-3">附件上传</h2>
            <p className="mb-3 text-sm text-muted-foreground">添加图片或文件补充说明您的问题</p>
            
            <Tabs defaultValue="image" className="w-full">
              <TabsList className="grid grid-cols-3 mb-4">
                <TabsTrigger value="image" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">图片</TabsTrigger>
                <TabsTrigger value="file" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">文件</TabsTrigger>
                <TabsTrigger value="audio" className="text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">语音</TabsTrigger>
              </TabsList>
              
              <TabsContent value="image" className="mt-0">
                <div className="flex flex-wrap gap-3">
                  {/* Display uploaded images */}
                  {attachments.filter((item) => item.file.type.startsWith('image/')).map((item) => (
                    <div key={item.id} className="relative h-20 w-20 overflow-hidden rounded-2xl app-neutral-soft-bg">
                      <img 
                        src={item.previewUrl || ''}
                        alt="Attachment"
                        className="h-full w-full object-cover"
                      />
                      <button 
                        onClick={() => removeAttachment(item.id)}
                        className="absolute top-1 right-1 bg-black/50 rounded-full p-1 text-white"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {/* Add image button */}
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5">
                    <ImagePlus size={20} className="mb-1 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">添加图片</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      multiple
                    />
                  </label>
                </div>
              </TabsContent>
              
              <TabsContent value="file" className="mt-0">
                <div className="space-y-3">
                  {/* Display uploaded files */}
                  {attachments.filter(item => !item.file.type.startsWith('image/') && !item.file.type.startsWith('audio/')).map((item) => (
                    <div key={item.id} className="flex items-center rounded-2xl border border-border p-2">
                      <File size={20} className="mr-2 text-muted-foreground" />
                      <span className="text-sm truncate flex-1">{item.file.name}</span>
                      <button 
                        onClick={() => removeAttachment(item.id)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {/* Add file button */}
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 hover:border-primary hover:bg-primary/5">
                    <File size={24} className="mb-2 text-muted-foreground" />
                    <span className="mb-1 text-sm text-muted-foreground">点击上传文件</span>
                    <span className="text-xs text-muted-foreground">支持 PDF、Word、Excel 等格式</span>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={handleFileUpload}
                      multiple
                    />
                  </label>
                </div>
              </TabsContent>
              
              <TabsContent value="audio" className="mt-0">
                <div className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border p-6 hover:border-primary hover:bg-primary/5">
                  <Mic size={24} className="mb-2 text-muted-foreground" />
                  <span className="mb-1 text-sm text-muted-foreground">点击录制语音</span>
                  <span className="text-xs text-muted-foreground">或上传已有语音文件</span>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      
      {/* Submit Button */}
      <div 
        className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 border-t border-border flex justify-center backdrop-blur-sm"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)' }}
      >
        <Button 
          onClick={handleSubmit}
          disabled={createQuestion.isPending}
          className="app-btn-primary w-full py-5 font-medium"
        >
          {createQuestion.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              发布中...
            </>
          ) : (
            '立即发布问题'
          )}
        </Button>
      </div>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>离开当前编辑？</AlertDialogTitle>
            <AlertDialogDescription>
              你可以先保存草稿，稍后回来继续编辑。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full">继续编辑</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="app-btn-secondary"
              onClick={() => {
                saveDraft({ silent: true });
                setShowLeaveDialog(false);
                navigateBackOr(navigate, '/', { location });
              }}
            >
              保存并离开
            </Button>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                localStorage.removeItem(draftStorageKey);
                sessionStorage.removeItem(draftRestoreHintKey);
                setShowLeaveDialog(false);
                navigateBackOr(navigate, '/', { location });
              }}
            >
              放弃更改
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default NewQuestion;
