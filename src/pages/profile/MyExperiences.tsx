import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import PersonExperienceCard from '@/components/experience/PersonExperienceCard';
import PageStateCard from '@/components/common/PageStateCard';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { Button } from '@/components/ui/button';
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
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import {
  useDeletePersonExperience,
  useMyPersonExperiences,
  useReorderPersonExperiences,
  useSetPersonExperienceVisibility,
} from '@/features/experience';
import { useToast } from '@/hooks/use-toast';
import { buildFromState, navigateToAuthWithReturn } from '@/utils/navigation';

const MyExperiencesContent: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const experiencesQuery = useMyPersonExperiences(user?.id);
  const visibilityMutation = useSetPersonExperienceVisibility(user?.id);
  const reorderMutation = useReorderPersonExperiences(user?.id);
  const deleteMutation = useDeletePersonExperience(user?.id);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [reorderMode, setReorderMode] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigateToAuthWithReturn(navigate, location);
  }, [authLoading, user, navigate, location]);

  const experiences = experiencesQuery.data?.experiences ?? [];
  const busy = visibilityMutation.isPending || reorderMutation.isPending || deleteMutation.isPending;

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= experiences.length) return;
    const ids = experiences.map((experience) => experience.experienceId);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    try {
      await reorderMutation.mutateAsync(ids);
      toast({ title: '顺序已更新' });
    } catch (error) {
      console.error('Failed to reorder Experiences', error);
      toast({
        variant: 'destructive',
        title: '暂时无法调整顺序',
        description: '原来的顺序已恢复，请稍后重试。',
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      await deleteMutation.mutateAsync(pendingDeleteId);
      setPendingDeleteId(null);
      toast({ title: '经历已删除' });
    } catch (error) {
      console.error('Failed to delete Experience', error);
      toast({
        variant: 'destructive',
        title: '暂时无法删除这段经历',
        description: '请稍后重试。',
      });
    }
  };

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title="我的经历" variant="content" />
        <div className="space-y-4 px-4 py-4">
          <Skeleton className="h-44 rounded-[20px]" />
          <Skeleton className="h-44 rounded-[20px]" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-app-page pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <SubPageHeader
        title="我的经历"
        variant="content"
        right={(
          <Button
            size="sm"
            className="app-btn-primary min-h-11"
            onClick={() => navigate('/experience/new', { state: buildFromState(location) })}
          >
            <Plus aria-hidden size={16} className="mr-1" />
            添加
          </Button>
        )}
      />

      <main className="px-4 py-5">
        <p className="text-sm leading-6 text-slate-500">
          记录你经历过、做过或熟悉的事情。公开的经历会展示在你的个人主页。
        </p>
        {experiencesQuery.isSuccess && experiences.length > 1 ? (
          <div className="mt-3 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">{reorderMode ? '使用上移、下移调整展示顺序' : '每一段经历，都可能帮到别人'}</p>
            <Button
              variant="ghost"
              className="min-h-11 shrink-0 text-app-action"
              onClick={() => setReorderMode((current) => !current)}
              disabled={busy}
              aria-pressed={reorderMode}
            >
              {reorderMode ? '完成' : '调整顺序'}
            </Button>
          </div>
        ) : null}

        {experiencesQuery.isLoading ? (
          <div className="mt-5 space-y-4">
            <Skeleton className="h-44 rounded-[20px]" />
            <Skeleton className="h-44 rounded-[20px]" />
          </div>
        ) : experiencesQuery.isError ? (
          <PageStateCard
            variant="error"
            className="mt-5 border border-app-border-subtle shadow-none"
            title="暂时无法加载你的经历"
            description="网络或服务似乎遇到了问题，请稍后重试。"
            actionLabel="重试"
            onAction={() => experiencesQuery.refetch()}
          />
        ) : experiences.length === 0 ? (
          <PageStateCard
            variant="empty"
            className="mt-5 border border-app-border-subtle shadow-none"
            title="还没有添加经历"
            description="你经历过、做过或熟悉的事情，都可能帮到另一个人。"
            actionLabel="添加一段经历"
            onAction={() => navigate('/experience/new', { state: buildFromState(location) })}
          />
        ) : (
          <div className="mt-5 space-y-4">
            {experiences.map((experience, index) => (
              <PersonExperienceCard
                key={experience.experienceId}
                experience={experience}
                ownerMode
                reorderMode={reorderMode}
                isFirst={index === 0}
                isLast={index === experiences.length - 1}
                busy={busy}
                onMoveUp={() => handleMove(index, -1)}
                onMoveDown={() => handleMove(index, 1)}
                onEdit={() => navigate(`/experience/${experience.experienceId}/edit`, {
                  state: buildFromState(location),
                })}
                onVisibilityChange={async (visibility) => {
                  try {
                    await visibilityMutation.mutateAsync({
                      experienceId: experience.experienceId,
                      visibility,
                    });
                    toast({ title: visibility === 'public' ? '这段经历已公开' : '已设为仅自己可见' });
                  } catch (error) {
                    console.error('Failed to change Experience visibility', error);
                    toast({
                      variant: 'destructive',
                      title: '暂时无法更新可见范围',
                      description: '请稍后重试。',
                    });
                  }
                }}
                onDelete={() => setPendingDeleteId(experience.experienceId)}
              />
            ))}
          </div>
        )}
      </main>

      <AlertDialog open={Boolean(pendingDeleteId)} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent className="w-[88%] max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>删除这段经历？</AlertDialogTitle>
            <AlertDialogDescription>
              删除后，它将不再出现在你的主页和经历列表中。
            </AlertDialogDescription>
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
    </div>
  );
};

const MyExperiences: React.FC = () => {
  const { user } = useAuth();
  return <MyExperiencesContent key={user?.id ?? 'signed-out'} />;
};

export default MyExperiences;
