import React from 'react';
import { Building2, GraduationCap, MapPin, UserRound } from 'lucide-react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PersonExperienceCard from '@/components/experience/PersonExperienceCard';
import SubPageHeader from '@/components/layout/SubPageHeader';
import { useAuth } from '@/contexts/AuthContext';
import {
  usePublicPersonExperiences,
  usePublicPersonProfile,
} from '@/features/experience';
import { buildFromState } from '@/utils/navigation';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PublicPersonSkeleton = () => (
  <div className="space-y-6 px-4 py-5">
    <div className="flex items-center gap-4">
      <Skeleton className="h-20 w-20 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-52" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
    <div className="space-y-3">
      <Skeleton className="h-5 w-24" />
      <Skeleton className="h-44 rounded-[20px]" />
      <Skeleton className="h-44 rounded-[20px]" />
    </div>
  </div>
);

const PublicPerson: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const personId = userId && UUID_PATTERN.test(userId) ? userId : undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const profileQuery = usePublicPersonProfile(personId);
  const person = profileQuery.data?.person ?? null;
  const experiencesQuery = usePublicPersonExperiences(personId, Boolean(person));
  const experiences = experiencesQuery.data?.pages.flatMap((page) => page.experiences) ?? [];
  const isSelf = Boolean(user && person && user.id === person.userId);

  if (!personId) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title="个人主页" variant="content" />
        <div className="px-4 py-16 text-center">
          <UserRound className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">没有找到这个用户</h2>
          <p className="mt-2 text-sm text-slate-500">这个主页地址可能已经失效。</p>
        </div>
      </div>
    );
  }

  if (profileQuery.isLoading) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title="个人主页" variant="content" />
        <PublicPersonSkeleton />
      </div>
    );
  }

  if (profileQuery.isError) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title="个人主页" variant="content" />
        <div className="px-4 py-16 text-center">
          <h2 className="text-lg font-semibold text-slate-900">个人主页暂时无法加载</h2>
          <p className="mt-2 text-sm text-slate-500">网络或服务似乎遇到了问题，请稍后重试。</p>
          <Button className="app-btn-primary mt-5" onClick={() => profileQuery.refetch()}>重试</Button>
        </div>
      </div>
    );
  }

  if (!person) {
    return (
      <div className="min-h-[100dvh] bg-app-page">
        <SubPageHeader title="个人主页" variant="content" />
        <div className="px-4 py-16 text-center">
          <UserRound className="mx-auto h-10 w-10 text-slate-300" />
          <h2 className="mt-4 text-lg font-semibold text-slate-900">没有找到这个用户</h2>
          <p className="mt-2 text-sm text-slate-500">对方可能还没有创建公开主页。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-app-page pb-[calc(env(safe-area-inset-bottom)+2rem)]">
      <SubPageHeader title="个人主页" variant="content" />

      <div className="relative h-32 overflow-hidden bg-[linear-gradient(145deg,rgb(225,246,241),rgb(249,252,251))]">
        {person.coverUrl ? (
          <img src={person.coverUrl} alt="个人主页封面" className="h-full w-full object-cover" />
        ) : null}
      </div>

      <main className="px-4">
        <section className="-mt-9">
          <Avatar className="h-20 w-20 border-4 border-app-page bg-white shadow-sm">
            <AvatarImage src={person.avatarUrl || ''} alt={person.displayName || '用户头像'} />
            <AvatarFallback className="bg-app-action-soft text-xl font-semibold text-app-action">
              {person.displayName?.slice(0, 1) || <UserRound aria-hidden size={28} />}
            </AvatarFallback>
          </Avatar>

          <h1 className="mt-3 text-[22px] font-semibold leading-8 text-slate-900">
            {person.displayName || '未设置昵称'}
          </h1>
          {person.bio ? <p className="mt-2 text-[15px] leading-6 text-slate-600">{person.bio}</p> : null}

          {person.city || person.school || person.industry ? (
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-slate-500">
              {person.city ? <span className="inline-flex items-center gap-1.5"><MapPin aria-hidden size={14} />{person.city}</span> : null}
              {person.school ? <span className="inline-flex items-center gap-1.5"><GraduationCap aria-hidden size={14} />{person.school}</span> : null}
              {person.industry ? <span className="inline-flex items-center gap-1.5"><Building2 aria-hidden size={14} />{person.industry}</span> : null}
            </div>
          ) : null}

          <div className="mt-5 flex items-center gap-7 border-y border-app-border-subtle py-4">
            <div>
              <strong className="text-lg font-semibold text-slate-900">{person.contributionSummary.answerCount}</strong>
              <span className="ml-1.5 text-xs text-slate-500">回答</span>
            </div>
            <div>
              <strong className="text-lg font-semibold text-slate-900">{person.contributionSummary.postCount}</strong>
              <span className="ml-1.5 text-xs text-slate-500">分享</span>
            </div>
          </div>

          {isSelf ? (
            <div className="mt-4 flex gap-3">
              <Button
                variant="outline"
                className="min-h-11 flex-1 rounded-full border-app-border-subtle"
                onClick={() => navigate('/edit-profile', { state: buildFromState(location) })}
              >
                编辑资料
              </Button>
              <Button
                className="app-btn-primary min-h-11 flex-1"
                onClick={() => navigate('/profile/experiences', { state: buildFromState(location) })}
              >
                管理我的经历
              </Button>
            </div>
          ) : null}
        </section>

        <section className="mt-8">
          <h2 className="text-[17px] font-semibold text-slate-900">TA的经历</h2>

          {experiencesQuery.isLoading ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-44 rounded-[20px]" />
              <Skeleton className="h-44 rounded-[20px]" />
            </div>
          ) : experiencesQuery.isError ? (
            <div className="mt-4 rounded-2xl border border-app-border-subtle bg-white px-4 py-6 text-center">
              <p className="text-sm font-medium text-slate-800">暂时无法加载TA的经历</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">个人资料仍可正常查看，请稍后再试。</p>
              <Button variant="ghost" className="mt-2 min-h-11 text-app-action" onClick={() => experiencesQuery.refetch()}>
                重试
              </Button>
            </div>
          ) : experiences.length === 0 ? (
            <p className="mt-4 rounded-2xl border border-app-border-subtle bg-white px-4 py-8 text-center text-sm text-slate-500">
              TA还没有公开经历。
            </p>
          ) : (
            <div className="mt-4 space-y-4">
              {experiences.map((experience) => (
                <PersonExperienceCard key={experience.experienceId} experience={experience} />
              ))}
              {experiencesQuery.hasNextPage ? (
                <Button
                  variant="outline"
                  className="min-h-11 w-full rounded-full border-app-border-subtle"
                  onClick={() => experiencesQuery.fetchNextPage()}
                  disabled={experiencesQuery.isFetchingNextPage}
                >
                  {experiencesQuery.isFetchingNextPage ? '正在加载…' : '查看更多经历'}
                </Button>
              ) : null}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default PublicPerson;
