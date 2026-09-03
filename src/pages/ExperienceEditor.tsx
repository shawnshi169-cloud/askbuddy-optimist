import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import ExperienceTransitionManager from '@/components/experience/ExperienceTransitionManager';
import { EXPERIENCE_KIND_LABELS } from '@/components/experience/experiencePresentation';
import PageStateCard from '@/components/common/PageStateCard';
import SubPageHeader from '@/components/layout/SubPageHeader';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import {
  useCreatePersonExperience,
  useMyPersonExperiences,
  useUpdatePersonExperience,
} from '@/features/experience';
import { useToast } from '@/hooks/use-toast';
import { navigateBackOr, navigateToAuthWithReturn } from '@/utils/navigation';
import {
  EXPERIENCE_KIND_V1,
  type ExperienceKindV1,
  type ExperienceVisibilityV1,
  type OwnerPersonExperienceV1,
} from '../../packages/shared-types/src/experience-v1';

interface ExperienceFormState {
  title: string;
  description: string;
  kind: ExperienceKindV1 | '';
  startYear: string;
  startMonth: string;
  endYear: string;
  endMonth: string;
  isCurrent: boolean;
  locationLabel: string;
  city: string;
  cityCode: string;
  canShareText: string;
  visibility: ExperienceVisibilityV1;
}

const EMPTY_FORM: ExperienceFormState = {
  title: '',
  description: '',
  kind: '',
  startYear: '',
  startMonth: '',
  endYear: '',
  endMonth: '',
  isCurrent: false,
  locationLabel: '',
  city: '',
  cityCode: '',
  canShareText: '',
  visibility: 'private',
};

const serializeForm = (form: ExperienceFormState) => JSON.stringify(form);
const optionalNumber = (value: string) => value.trim() ? Number(value) : null;

const toFormState = (experience: OwnerPersonExperienceV1): ExperienceFormState => ({
  title: experience.title,
  description: experience.description,
  kind: experience.kind,
  startYear: experience.timeRange.startYear === null ? '' : String(experience.timeRange.startYear),
  startMonth: experience.timeRange.startMonth === null ? '' : String(experience.timeRange.startMonth),
  endYear: experience.timeRange.endYear === null ? '' : String(experience.timeRange.endYear),
  endMonth: experience.timeRange.endMonth === null ? '' : String(experience.timeRange.endMonth),
  isCurrent: experience.timeRange.isCurrent,
  locationLabel: experience.location?.label || '',
  city: experience.location?.city || '',
  cityCode: experience.location?.cityCode || '',
  canShareText: experience.canShare.join('\n'),
  visibility: experience.visibility,
});

const parseDraft = (value: unknown): ExperienceFormState | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const draft = value as Record<string, unknown>;
  const kind = typeof draft.kind === 'string' && EXPERIENCE_KIND_V1.includes(draft.kind as ExperienceKindV1)
    ? draft.kind as ExperienceKindV1
    : '';
  const visibility = draft.visibility === 'public' ? 'public' : 'private';
  const readString = (key: keyof ExperienceFormState) => typeof draft[key] === 'string' ? draft[key] as string : '';
  return {
    title: readString('title'),
    description: readString('description'),
    kind,
    startYear: readString('startYear'),
    startMonth: readString('startMonth'),
    endYear: readString('endYear'),
    endMonth: readString('endMonth'),
    isCurrent: draft.isCurrent === true,
    locationLabel: readString('locationLabel'),
    city: readString('city'),
    cityCode: readString('cityCode'),
    canShareText: readString('canShareText'),
    visibility,
  };
};

const ExperienceEditor: React.FC = () => {
  const { experienceId } = useParams<{ experienceId?: string }>();
  const isEdit = Boolean(experienceId);
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const experiencesQuery = useMyPersonExperiences(Boolean(user) && isEdit);
  const createMutation = useCreatePersonExperience(user?.id);
  const updateMutation = useUpdatePersonExperience(user?.id);
  const [form, setForm] = useState<ExperienceFormState>(EMPTY_FORM);
  const [hydrated, setHydrated] = useState(false);
  const [transitionDirty, setTransitionDirty] = useState(false);
  const [showLeaveDialog, setShowLeaveDialog] = useState(false);
  const initialSnapshotRef = useRef(serializeForm(EMPTY_FORM));
  const draftKey = user ? `person-experience-draft-v1:${user.id}` : null;
  const existingExperience = experiencesQuery.data?.experiences.find(
    (experience) => experience.experienceId === experienceId,
  );

  useEffect(() => {
    if (!authLoading && !user) navigateToAuthWithReturn(navigate, routerLocation);
  }, [authLoading, user, navigate, routerLocation]);

  useEffect(() => {
    if (!user || hydrated) return;
    if (isEdit) {
      if (experiencesQuery.isSuccess && existingExperience) {
        const next = toFormState(existingExperience);
        setForm(next);
        initialSnapshotRef.current = serializeForm(next);
        setHydrated(true);
      }
      return;
    }

    let next = EMPTY_FORM;
    if (draftKey) {
      try {
        const raw = localStorage.getItem(draftKey);
        if (raw) next = parseDraft(JSON.parse(raw)) || EMPTY_FORM;
      } catch {
        localStorage.removeItem(draftKey);
      }
    }
    setForm(next);
    initialSnapshotRef.current = serializeForm(EMPTY_FORM);
    setHydrated(true);
  }, [draftKey, existingExperience, experiencesQuery.isSuccess, hydrated, isEdit, user]);

  const formDirty = hydrated && serializeForm(form) !== initialSnapshotRef.current;
  const hasUnsavedChanges = formDirty || transitionDirty;
  const hasDraftContent = Boolean(form.title.trim() || form.description.trim() || form.canShareText.trim());

  useEffect(() => {
    if (!hydrated || isEdit || !draftKey) return;
    const timer = window.setTimeout(() => {
      if (hasDraftContent) localStorage.setItem(draftKey, JSON.stringify(form));
      else localStorage.removeItem(draftKey);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [draftKey, form, hasDraftContent, hydrated, isEdit]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.dataset.swipeBackDisabled = hasUnsavedChanges ? 'true' : 'false';
    return () => {
      document.body.dataset.swipeBackDisabled = 'false';
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  const validationError = useMemo(() => {
    if (!form.title.trim() || !form.description.trim() || !form.kind) return '请填写标题、经历描述并选择经历类型';
    const startYear = optionalNumber(form.startYear);
    const startMonth = optionalNumber(form.startMonth);
    const endYear = form.isCurrent ? null : optionalNumber(form.endYear);
    const endMonth = form.isCurrent ? null : optionalNumber(form.endMonth);
    const validYear = (value: number | null) => value === null || (Number.isInteger(value) && value >= 1 && value <= 9999);
    const validMonth = (value: number | null) => value === null || (Number.isInteger(value) && value >= 1 && value <= 12);
    if (!validYear(startYear) || !validYear(endYear)) return '请输入有效年份';
    if (!validMonth(startMonth) || !validMonth(endMonth)) return '月份需要在 1 到 12 之间';
    if ((startMonth !== null && startYear === null) || (endMonth !== null && endYear === null)) return '月份需要和年份一起填写';
    if (startYear !== null && endYear !== null && (
      startYear > endYear
      || (startYear === endYear && startMonth !== null && endMonth !== null && startMonth > endMonth)
    )) return '结束时间不能早于开始时间';
    return null;
  }, [form]);

  const navigateAway = () => navigateBackOr(navigate, '/profile/experiences', { location: routerLocation });
  const handleBack = () => hasUnsavedChanges ? setShowLeaveDialog(true) : navigateAway();

  const handleSubmit = async () => {
    if (validationError || !form.kind || !user) {
      if (validationError) toast({ variant: 'destructive', title: validationError });
      return;
    }

    const startYear = optionalNumber(form.startYear);
    const startMonth = optionalNumber(form.startMonth);
    const endYear = form.isCurrent ? null : optionalNumber(form.endYear);
    const endMonth = form.isCurrent ? null : optionalNumber(form.endMonth);
    const canShare = form.canShareText.split('\n').map((item) => item.trim()).filter(Boolean);

    try {
      if (isEdit && existingExperience) {
        await updateMutation.mutateAsync({
          p_experience_id: existingExperience.experienceId,
          p_title: form.title.trim(),
          p_description: form.description.trim(),
          p_kind: form.kind,
          p_start_year: startYear,
          p_start_month: startMonth,
          p_end_year: endYear,
          p_end_month: endMonth,
          p_is_current: form.isCurrent,
          p_location_label: form.locationLabel.trim() || null,
          p_city: form.city.trim() || null,
          p_city_code: form.cityCode.trim() || null,
          p_can_share: canShare,
          p_visibility: form.visibility,
          p_sort_order: existingExperience.sortOrder,
        });
        initialSnapshotRef.current = serializeForm(form);
        toast({ title: '经历已更新' });
      } else {
        await createMutation.mutateAsync({
          p_title: form.title.trim(),
          p_description: form.description.trim(),
          p_kind: form.kind,
          p_start_year: startYear,
          p_start_month: startMonth,
          p_end_year: endYear,
          p_end_month: endMonth,
          p_is_current: form.isCurrent,
          p_location_label: form.locationLabel.trim() || null,
          p_city: form.city.trim() || null,
          p_city_code: form.cityCode.trim() || null,
          p_can_share: canShare,
          p_visibility: form.visibility,
          p_sort_order: null,
        });
        if (draftKey) localStorage.removeItem(draftKey);
        toast({ title: '经历已保存' });
      }
      document.body.dataset.swipeBackDisabled = 'false';
      navigate('/profile/experiences', { replace: true });
    } catch (error) {
      console.error('Failed to save Experience', error);
      toast({
        variant: 'destructive',
        title: '暂时无法保存这段经历',
        description: '填写的内容已保留，请稍后重试。',
      });
    }
  };

  if (authLoading || (!user && !authLoading) || (isEdit && experiencesQuery.isLoading)) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title={isEdit ? '编辑经历' : '添加一段经历'} variant="content" />
        <div className="space-y-4 px-4 py-5">
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (isEdit && experiencesQuery.isError) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title="编辑经历" variant="content" />
        <div className="px-4 py-5">
          <PageStateCard
            variant="error"
            title="暂时无法加载这段经历"
            description="请稍后重试。"
            actionLabel="重试"
            onAction={() => experiencesQuery.refetch()}
          />
        </div>
      </div>
    );
  }

  if (isEdit && experiencesQuery.isSuccess && !existingExperience) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title="编辑经历" variant="content" />
        <div className="px-4 py-16 text-center">
          <h2 className="text-lg font-semibold text-slate-900">没有找到这段经历</h2>
          <p className="mt-2 text-sm text-slate-500">它可能已经被删除，或不属于当前账号。</p>
        </div>
      </div>
    );
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="min-h-[100dvh] bg-app-page">
      <SubPageHeader title={isEdit ? '编辑经历' : '添加一段经历'} variant="content" onBack={handleBack} />

      <main className="space-y-5 px-4 py-5">
        {!isEdit ? (
          <p className="text-[15px] leading-6 text-slate-600">
            你有什么经历过、做过或者比较熟悉的事情，愿意和别人分享？
          </p>
        ) : null}

        <section className="space-y-5 rounded-[20px] border border-app-border-subtle bg-white p-4">
          <div className="space-y-2">
            <Label htmlFor="experience-title">这段经历是什么？</Label>
            <Input
              id="experience-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="例如：从化工背景到大客户销售"
              autoComplete="off"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience-description">说说这段经历</Label>
            <p className="text-xs leading-5 text-slate-500">
              写下你真正经历过的过程、背景或感受，让别人更容易理解你为什么了解这件事。
            </p>
            <Textarea
              id="experience-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="从事情的背景、过程和你学到的东西说起…"
              className="min-h-40 resize-y leading-6"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="experience-kind">经历类型</Label>
            <Select
              value={form.kind || undefined}
              onValueChange={(value: ExperienceKindV1) => setForm((current) => ({ ...current, kind: value }))}
            >
              <SelectTrigger id="experience-kind" className="min-h-11 rounded-xl">
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {EXPERIENCE_KIND_V1.map((kind) => (
                  <SelectItem key={kind} value={kind}>{EXPERIENCE_KIND_LABELS[kind]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        <section className="space-y-4 rounded-[20px] border border-app-border-subtle bg-white p-4">
          <h2 className="text-[16px] font-semibold text-slate-900">时间（可选）</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="start-year">开始年份</Label>
              <Input id="start-year" type="number" inputMode="numeric" min={1} max={9999} value={form.startYear} onChange={(event) => setForm((current) => ({ ...current, startYear: event.target.value }))} placeholder="2022" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="start-month">开始月份</Label>
              <Input id="start-month" type="number" inputMode="numeric" min={1} max={12} value={form.startMonth} onChange={(event) => setForm((current) => ({ ...current, startMonth: event.target.value }))} placeholder="9" />
            </div>
          </div>
          <div className="flex min-h-11 items-center justify-between gap-3">
            <div>
              <Label htmlFor="experience-current">目前仍在经历中</Label>
              <p className="mt-0.5 text-xs text-slate-500">开启后不会保存结束时间。</p>
            </div>
            <Switch
              id="experience-current"
              checked={form.isCurrent}
              onCheckedChange={(checked) => setForm((current) => ({
                ...current,
                isCurrent: checked,
                endYear: checked ? '' : current.endYear,
                endMonth: checked ? '' : current.endMonth,
              }))}
            />
          </div>
          {!form.isCurrent ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="end-year">结束年份</Label>
                <Input id="end-year" type="number" inputMode="numeric" min={1} max={9999} value={form.endYear} onChange={(event) => setForm((current) => ({ ...current, endYear: event.target.value }))} placeholder="2024" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-month">结束月份</Label>
                <Input id="end-month" type="number" inputMode="numeric" min={1} max={12} value={form.endMonth} onChange={(event) => setForm((current) => ({ ...current, endMonth: event.target.value }))} placeholder="6" />
              </div>
            </div>
          ) : null}
        </section>

        <section className="space-y-4 rounded-[20px] border border-app-border-subtle bg-white p-4">
          <h2 className="text-[16px] font-semibold text-slate-900">地点（可选）</h2>
          <div className="space-y-2">
            <Label htmlFor="experience-city">城市</Label>
            <Input id="experience-city" value={form.city} onChange={(event) => setForm((current) => ({ ...current, city: event.target.value }))} placeholder="例如：洛杉矶" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="experience-location">地点描述</Label>
            <Input id="experience-location" value={form.locationLabel} onChange={(event) => setForm((current) => ({ ...current, locationLabel: event.target.value }))} placeholder="例如：南加州大学" />
          </div>
        </section>

        <section className="space-y-3 rounded-[20px] border border-app-border-subtle bg-white p-4">
          <div>
            <Label htmlFor="experience-can-share">我可以分享</Label>
            <p className="mt-1 text-xs leading-5 text-slate-500">别人可以就哪些事情来问你？每行填写一项。</p>
          </div>
          <Textarea
            id="experience-can-share"
            value={form.canShareText}
            onChange={(event) => setForm((current) => ({ ...current, canShareText: event.target.value }))}
            placeholder={'美国研究生生活\n海归求职\n技术转销售'}
            className="min-h-28 resize-y leading-6"
          />
        </section>

        <section className="rounded-[20px] border border-app-border-subtle bg-white p-4">
          <h2 className="text-[16px] font-semibold text-slate-900">谁可以看到</h2>
          <div className="mt-3 grid grid-cols-2 gap-3" role="radiogroup" aria-label="经历可见范围">
            {(['private', 'public'] as const).map((visibility) => (
              <button
                key={visibility}
                type="button"
                role="radio"
                aria-checked={form.visibility === visibility}
                className={`min-h-[68px] rounded-2xl border px-3 text-left transition-colors ${
                  form.visibility === visibility
                    ? 'border-app-action bg-app-action-soft text-app-action'
                    : 'border-app-border-subtle text-slate-600'
                }`}
                onClick={() => setForm((current) => ({ ...current, visibility }))}
              >
                <span className="block text-sm font-semibold">{visibility === 'public' ? '公开' : '仅自己可见'}</span>
                <span className="mt-1 block text-xs leading-5">{visibility === 'public' ? '会展示在你的个人主页' : '只有你自己可以看到'}</span>
              </button>
            ))}
          </div>
        </section>

        {isEdit && existingExperience ? (
          <ExperienceTransitionManager
            experienceId={existingExperience.experienceId}
            personId={existingExperience.personId}
            transitions={existingExperience.transitions}
            onDirtyChange={setTransitionDirty}
          />
        ) : null}
      </main>

      <div className="sticky bottom-0 z-20 border-t border-app-border-subtle bg-white/95 px-4 pt-3 backdrop-blur-sm" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.75rem)' }}>
        <Button className="app-btn-primary min-h-12 w-full" onClick={() => void handleSubmit()} disabled={saving || Boolean(validationError)}>
          {saving ? <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" /> : null}
          {saving ? '正在保存…' : isEdit ? '保存修改' : '保存经历'}
        </Button>
      </div>

      <AlertDialog open={showLeaveDialog} onOpenChange={setShowLeaveDialog}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>离开当前编辑？</AlertDialogTitle>
            <AlertDialogDescription>
              {isEdit ? '尚未保存的修改会丢失。' : '当前内容已保存在本地草稿中，下次可以继续填写。'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="min-h-11 rounded-full">继续编辑</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-full bg-slate-800 text-white hover:bg-slate-900"
              onClick={() => {
                setShowLeaveDialog(false);
                document.body.dataset.swipeBackDisabled = 'false';
                navigateAway();
              }}
            >
              离开
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ExperienceEditor;
