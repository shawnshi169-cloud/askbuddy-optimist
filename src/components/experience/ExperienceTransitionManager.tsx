import React, { useEffect, useState } from 'react';
import { ArrowRight, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import type { ExperienceTransitionV1 } from '../../../packages/shared-types/src/experience-v1';
import {
  useCreateExperienceTransition,
  useDeleteExperienceTransition,
  useUpdateExperienceTransition,
} from '@/features/experience';
import { useToast } from '@/hooks/use-toast';
import { formatTransitionTime } from './experiencePresentation';

interface ExperienceTransitionManagerProps {
  experienceId: string;
  personId: string;
  transitions: ExperienceTransitionV1[];
  onDirtyChange?: (dirty: boolean) => void;
}

interface TransitionFormState {
  transitionId: string | null;
  fromLabel: string;
  toLabel: string;
  occurredYear: string;
  occurredMonth: string;
  sortOrder: number;
}

const EMPTY_FORM: TransitionFormState = {
  transitionId: null,
  fromLabel: '',
  toLabel: '',
  occurredYear: '',
  occurredMonth: '',
  sortOrder: 0,
};

const optionalNumber = (value: string) => value.trim() ? Number(value) : null;

const ExperienceTransitionManager: React.FC<ExperienceTransitionManagerProps> = ({
  experienceId,
  personId,
  transitions,
  onDirtyChange,
}) => {
  const { toast } = useToast();
  const createMutation = useCreateExperienceTransition(personId);
  const updateMutation = useUpdateExperienceTransition(personId);
  const deleteMutation = useDeleteExperienceTransition(personId);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<TransitionFormState>(EMPTY_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const busy = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  const formDirty = isEditing && Boolean(
    form.transitionId || form.fromLabel || form.toLabel || form.occurredYear || form.occurredMonth,
  );

  useEffect(() => {
    onDirtyChange?.(formDirty);
  }, [formDirty, onDirtyChange]);

  const reset = () => {
    setForm(EMPTY_FORM);
    setIsEditing(false);
  };

  const beginCreate = () => {
    setForm({ ...EMPTY_FORM, sortOrder: transitions.length });
    setIsEditing(true);
  };

  const beginEdit = (transition: ExperienceTransitionV1) => {
    setForm({
      transitionId: transition.transitionId,
      fromLabel: transition.fromLabel,
      toLabel: transition.toLabel,
      occurredYear: transition.occurredYear === null ? '' : String(transition.occurredYear),
      occurredMonth: transition.occurredMonth === null ? '' : String(transition.occurredMonth),
      sortOrder: transition.sortOrder,
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    const fromLabel = form.fromLabel.trim();
    const toLabel = form.toLabel.trim();
    const occurredYear = optionalNumber(form.occurredYear);
    const occurredMonth = optionalNumber(form.occurredMonth);

    if (!fromLabel || !toLabel) {
      toast({ variant: 'destructive', title: '请填写转变前后的内容' });
      return;
    }
    if (fromLabel === toLabel) {
      toast({ variant: 'destructive', title: '转变前后需要有所不同' });
      return;
    }
    if (occurredYear !== null && (!Number.isInteger(occurredYear) || occurredYear < 1 || occurredYear > 9999)) {
      toast({ variant: 'destructive', title: '请输入有效年份' });
      return;
    }
    if (occurredMonth !== null && (
      occurredYear === null
      || !Number.isInteger(occurredMonth)
      || occurredMonth < 1
      || occurredMonth > 12
    )) {
      toast({ variant: 'destructive', title: '月份需要和年份一起填写' });
      return;
    }

    try {
      if (form.transitionId) {
        await updateMutation.mutateAsync({
          p_transition_id: form.transitionId,
          p_from_label: fromLabel,
          p_to_label: toLabel,
          p_occurred_year: occurredYear,
          p_occurred_month: occurredMonth,
          p_sort_order: form.sortOrder,
        });
      } else {
        await createMutation.mutateAsync({
          p_experience_id: experienceId,
          p_from_label: fromLabel,
          p_to_label: toLabel,
          p_occurred_year: occurredYear,
          p_occurred_month: occurredMonth,
          p_sort_order: form.sortOrder,
        });
      }
      reset();
      toast({ title: form.transitionId ? '转变已更新' : '转变已添加' });
    } catch (error) {
      console.error('Failed to save Experience transition', error);
      toast({
        variant: 'destructive',
        title: '暂时无法保存这次转变',
        description: '请稍后重试。',
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteMutation.mutateAsync(pendingDeleteId);
      setPendingDeleteId(null);
      toast({ title: '转变已删除' });
    } catch (error) {
      console.error('Failed to delete Experience transition', error);
      toast({ variant: 'destructive', title: '暂时无法删除这次转变', description: '请稍后重试。' });
    }
  };

  return (
    <section className="rounded-[20px] border border-app-border-subtle bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-semibold text-slate-900">经历中的转变</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">如果这段经历包含一次明显的变化，可以补充下来。</p>
        </div>
        {!isEditing ? (
          <Button variant="ghost" className="min-h-11 shrink-0 text-app-action" onClick={beginCreate}>
            <Plus aria-hidden size={16} className="mr-1" />添加
          </Button>
        ) : null}
      </div>

      {transitions.length > 0 ? (
        <div className="mt-3 divide-y divide-app-border-subtle">
          {transitions.map((transition) => {
            const time = formatTransitionTime(transition.occurredYear, transition.occurredMonth);
            return (
              <div key={transition.transitionId} className="flex items-center gap-2 py-3">
                <span className="min-w-0 flex-1 text-sm text-slate-700">
                  <span>{transition.fromLabel}</span>
                  <ArrowRight aria-hidden className="mx-2 inline h-3.5 w-3.5 text-app-action" />
                  <span>{transition.toLabel}</span>
                  {time ? <span className="ml-2 text-xs text-slate-400">{time}</span> : null}
                </span>
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-slate-500"
                  onClick={() => beginEdit(transition)}
                  aria-label="编辑这次转变"
                  disabled={busy}
                >
                  <Pencil aria-hidden size={17} />
                </button>
                <button
                  type="button"
                  className="flex h-11 w-11 shrink-0 items-center justify-center text-rose-500"
                  onClick={() => setPendingDeleteId(transition.transitionId)}
                  aria-label="删除这次转变"
                  disabled={busy}
                >
                  <Trash2 aria-hidden size={17} />
                </button>
              </div>
            );
          })}
        </div>
      ) : !isEditing ? (
        <p className="mt-3 text-sm text-slate-400">尚未添加转变。</p>
      ) : null}

      {isEditing ? (
        <div className="mt-4 space-y-4 border-t border-app-border-subtle pt-4">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="space-y-2">
              <Label htmlFor="transition-from">转变前</Label>
              <Input
                id="transition-from"
                value={form.fromLabel}
                onChange={(event) => setForm((current) => ({ ...current, fromLabel: event.target.value }))}
                placeholder="例如：技术背景"
              />
            </div>
            <ArrowRight aria-hidden className="mb-3 h-4 w-4 text-app-action" />
            <div className="space-y-2">
              <Label htmlFor="transition-to">转变后</Label>
              <Input
                id="transition-to"
                value={form.toLabel}
                onChange={(event) => setForm((current) => ({ ...current, toLabel: event.target.value }))}
                placeholder="例如：大客户销售"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="transition-year">发生年份（可选）</Label>
              <Input
                id="transition-year"
                type="number"
                inputMode="numeric"
                min={1}
                max={9999}
                value={form.occurredYear}
                onChange={(event) => setForm((current) => ({ ...current, occurredYear: event.target.value }))}
                placeholder="2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transition-month">月份（可选）</Label>
              <Input
                id="transition-month"
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                value={form.occurredMonth}
                onChange={(event) => setForm((current) => ({ ...current, occurredMonth: event.target.value }))}
                placeholder="9"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="min-h-11 rounded-full" onClick={reset} disabled={busy}>取消</Button>
            <Button className="app-btn-primary min-h-11" onClick={() => void handleSave()} disabled={busy}>
              {busy ? '正在保存…' : '保存转变'}
            </Button>
          </div>
        </div>
      ) : null}

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>删除这次转变？</AlertDialogTitle>
            <AlertDialogDescription>删除后，这条转变路径将不再展示。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel className="min-h-11 rounded-full">取消</AlertDialogCancel>
            <AlertDialogAction
              className="min-h-11 rounded-full bg-rose-600 text-white hover:bg-rose-700"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? '正在删除…' : '删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};

export default ExperienceTransitionManager;
