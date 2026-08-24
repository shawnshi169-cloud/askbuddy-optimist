import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import {
  EXPERT_PROFILE_REQUIRED_MESSAGE,
  useCreateSkillOffer,
  useExpertProfilePrerequisite,
  useSkillCategories,
} from '@/hooks/useSkillOffers';
import { navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import SubPageHeader from '@/components/layout/SubPageHeader';
import PageStateCard from '@/components/common/PageStateCard';

const skillFormSchema = z.object({
  title: z.string().trim().min(5, { message: '标题至少需要5个字符' }).max(100),
  categoryId: z.string().optional(),
  description: z.string().trim().min(20, { message: '描述至少需要20个字符' }).max(500),
  price: z
    .string()
    .trim()
    .min(1, { message: '请输入服务价格' })
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, {
      message: '价格必须大于 0',
    }),
});

type SkillFormValues = z.infer<typeof skillFormSchema>;

const SKILL_DRAFT_KEY = 'skill-publish-draft-v2';

interface SkillDraft {
  formValues: Partial<SkillFormValues>;
  step: number;
  savedAt: string;
}

const SkillPublish = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const {
    data: hasExpertProfile,
    isLoading: checkingExpertProfile,
    isError: expertProfileCheckFailed,
    refetch: retryExpertProfileCheck,
  } = useExpertProfilePrerequisite();
  const { data: skillCategories = [], isLoading: loadingCategories } = useSkillCategories();
  const createSkillOffer = useCreateSkillOffer();
  const [step, setStep] = useState(1);
  const [hydratedDraft, setHydratedDraft] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const draftKey = user ? `${SKILL_DRAFT_KEY}:${user.id}` : `${SKILL_DRAFT_KEY}:guest`;

  const form = useForm<SkillFormValues>({
    resolver: zodResolver(skillFormSchema),
    defaultValues: { title: '', categoryId: '', description: '', price: '' },
  });

  useEffect(() => {
    const raw = localStorage.getItem(draftKey);
    if (!raw) {
      setHydratedDraft(true);
      return;
    }

    try {
      const draft = JSON.parse(raw) as SkillDraft;
      form.reset({
        title: draft.formValues.title || '',
        categoryId: draft.formValues.categoryId || '',
        description: draft.formValues.description || '',
        price: draft.formValues.price || '',
      });
      setStep(draft.step === 2 ? 2 : 1);
      if (draft.savedAt) {
        const savedDate = new Date(draft.savedAt);
        const label = Number.isNaN(savedDate.getTime()) ? '' : `（${savedDate.toLocaleString('zh-CN')}）`;
        toast({ title: '已恢复本地草稿', description: `你上次编辑的技能信息已恢复${label}` });
      }
    } catch {
      localStorage.removeItem(draftKey);
    } finally {
      setHydratedDraft(true);
    }
  }, [draftKey, form, toast]);

  const formValues = form.watch();
  const isSaving = createSkillOffer.isPending;
  const hasPendingContent = Boolean(
    formValues.title?.trim() || formValues.description?.trim() || formValues.categoryId || formValues.price?.trim()
  );

  useEffect(() => {
    if (!hydratedDraft) return;
    const payload: SkillDraft = { formValues, step, savedAt: new Date().toISOString() };
    const timer = window.setTimeout(() => localStorage.setItem(draftKey, JSON.stringify(payload)), 400);
    return () => window.clearTimeout(timer);
  }, [draftKey, formValues, hydratedDraft, step]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasPendingContent || isSaving) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingContent, isSaving]);

  useEffect(() => {
    const shouldDisableSwipeBack = hasPendingContent && !isSaving;
    document.body.dataset.swipeBackDisabled = shouldDisableSwipeBack ? 'true' : 'false';
    return () => {
      document.body.dataset.swipeBackDisabled = 'false';
    };
  }, [hasPendingContent, isSaving]);

  const saveDraft = (options?: { silent?: boolean }) => {
    if (!hasPendingContent) {
      localStorage.removeItem(draftKey);
      if (!options?.silent) toast({ title: '暂无可保存内容', description: '填写一些技能信息后再保存草稿。' });
      return;
    }

    const payload: SkillDraft = { formValues, step, savedAt: new Date().toISOString() };
    localStorage.setItem(draftKey, JSON.stringify(payload));
    if (!options?.silent) toast({ title: '草稿已保存', description: '下次进入可继续编辑技能信息。' });
  };

  const onSubmit = async (values: SkillFormValues) => {
    if (!user) {
      toast({ title: '请先登录', description: '登录后才可以发布技能', variant: 'destructive' });
      navigateToAuthWithReturn(navigate, location);
      return;
    }

    if (!hasExpertProfile) {
      toast({ title: '暂时无法发布技能', description: EXPERT_PROFILE_REQUIRED_MESSAGE, variant: 'destructive' });
      return;
    }

    try {
      await createSkillOffer.mutateAsync({
        categoryId: values.categoryId || null,
        title: values.title,
        description: values.description,
        priceAmount: Number(values.price),
      });
      localStorage.removeItem(draftKey);
      navigate('/profile');
    } catch {
      // useCreateSkillOffer displays the prerequisite/database error and keeps the draft intact.
    }
  };

  const nextStep = async () => {
    const isValid = await form.trigger(['title', 'description']);
    if (isValid) setStep(2);
  };

  const handleBack = () => {
    if (!hasPendingContent || isSaving) {
      navigateBackOr(navigate, '/profile', { location });
      return;
    }
    setShowLeaveDialog(true);
  };

  const isLoading = loadingCategories || (!!user && checkingExpertProfile);
  const missingExpertProfile = !!user && !expertProfileCheckFailed && hasExpertProfile === false;

  return (
    <div className="min-h-[100dvh] bg-slate-50 pb-8">
      <SubPageHeader
        title="发布您的专业技能"
        onBack={handleBack}
        right={(
          <button type="button" onClick={() => saveDraft()} className="rounded-full bg-white/20 px-3 py-1 text-xs text-white hover:bg-white/25">
            存草稿
          </button>
        )}
      />

      <div className="px-4 py-4">
        <div className="mb-4 surface-card rounded-3xl p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 1 ? 'bg-app-teal text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
              <div className="mx-2 h-1 w-12 bg-gray-200" />
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${step === 2 ? 'bg-app-teal text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
            </div>
            <div className="text-sm text-gray-500">{step === 1 ? '基础信息' : '服务设置'}</div>
          </div>
          <p className="text-xs leading-5 text-slate-500">技能信息将保存到平台技能供给列表，不会修改专家档案。</p>
        </div>

        {isLoading ? (
          <PageStateCard variant="loading" title="正在加载技能信息…" />
        ) : expertProfileCheckFailed ? (
          <PageStateCard
            variant="error"
            title="暂时无法确认发布资格"
            description="无法确认你的专家/达人资料，请稍后重试。"
            actionLabel="重新检查"
            onAction={() => void retryExpertProfileCheck()}
          />
        ) : missingExpertProfile ? (
          <PageStateCard
            variant="error"
            title="需要先完成专家/达人资料"
            description={EXPERT_PROFILE_REQUIRED_MESSAGE}
          />
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {step === 1 ? (
                <>
                  <div className="surface-card rounded-3xl p-5 space-y-5">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>技能标题</FormLabel>
                          <FormControl><Input placeholder="例如：一对一简历优化" {...field} /></FormControl>
                          <FormDescription>用清晰标题说明你提供的服务。</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>技能分类</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || undefined}>
                            <FormControl><SelectTrigger><SelectValue placeholder="选择平台分类（可选）" /></SelectTrigger></FormControl>
                            <SelectContent>
                              {skillCategories.map((category) => (
                                <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormDescription>分类来自平台当前启用的技能分类。</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>服务说明</FormLabel>
                          <FormControl><Textarea rows={8} placeholder="说明服务内容、适用人群和交付方式" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <Button type="button" onClick={nextStep} className="w-full rounded-full">下一步</Button>
                </>
              ) : (
                <>
                  <div className="surface-card rounded-3xl p-5 space-y-5">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>每次服务价格</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input type="number" min="0.01" step="0.01" placeholder="设置每次服务的价格" {...field} className="pl-8" />
                              <span className="absolute left-3 top-2.5 text-gray-500">￥</span>
                            </div>
                          </FormControl>
                          <FormDescription>当前按次计价，币种为人民币，交付方式为线上。</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="rounded-2xl bg-blue-50 p-4">
                      <h3 className="mb-2 flex items-center text-sm font-medium">
                        <CheckCircle size={16} className="mr-1 text-blue-500" />
                        提交前确认
                      </h3>
                      <p className="text-xs leading-5 text-gray-600">发布成功仅以数据库返回的技能供给记录为准；失败时表单会保留并显示真实错误。</p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Button type="button" onClick={() => setStep(1)} className="w-1/3 rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200">返回</Button>
                    <Button type="submit" disabled={isSaving || (!!user && !hasExpertProfile)} className="w-2/3 rounded-full">
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isSaving ? '发布中...' : '发布技能'}
                    </Button>
                  </div>
                </>
              )}
            </form>
          </Form>
        )}
      </div>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>离开当前编辑？</AlertDialogTitle>
            <AlertDialogDescription>
              可以先保存草稿，稍后回来继续编辑技能信息。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="rounded-full">继续编辑</AlertDialogCancel>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => {
                saveDraft({ silent: true });
                setShowLeaveDialog(false);
                navigateBackOr(navigate, '/profile', { location });
              }}
            >
              保存并离开
            </Button>
            <AlertDialogAction
              className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                localStorage.removeItem(draftKey);
                setShowLeaveDialog(false);
                navigateBackOr(navigate, '/profile', { location });
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

export default SkillPublish;
