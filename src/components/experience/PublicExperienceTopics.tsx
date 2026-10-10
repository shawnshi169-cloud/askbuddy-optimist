import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import type { PublicPersonExperienceV1 } from '../../../packages/shared-types/src/experience-v1';
import { publicTopicQueryOptions } from '@/features/experience/topics/publicTopicQuery';

export default function PublicExperienceTopics({ experience }: { experience: PublicPersonExperienceV1 }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const { user, loading } = useAuth();
  useEffect(() => {
    if (!anchor.current) return;
    if (typeof IntersectionObserver === 'undefined') { setNearViewport(true); return; }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setNearViewport(true); observer.disconnect(); }
    }, { rootMargin: '120px' });
    observer.observe(anchor.current);
    return () => observer.disconnect();
  }, []);
  const enabled = nearViewport && !loading && experience.visibility === 'public';
  const query = useQuery({ ...publicTopicQueryOptions(experience, user?.id ?? null), enabled });

  return (
    <div ref={anchor} className="min-w-0">
      {enabled ? query.isFetching || query.isPending ? (
        <p role="status" className="mt-3 text-xs text-slate-400">正在读取关联话题…</p>
      ) : query.isError ? (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 text-xs text-slate-500">
          <span role="status">关联话题暂时无法加载</span>
          <button type="button" className="min-h-11 px-3 text-app-action focus-visible:outline focus-visible:outline-2" onClick={() => query.refetch()}>重试话题</button>
        </div>
      ) : query.data?.length ? (
        <section aria-label="相关话题" className="mt-4 border-t border-app-border-subtle pt-3">
          <p className="text-xs font-medium text-slate-500">相关话题</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {query.data.map((topic) => (
              <li key={topic.topicId} className="max-w-full rounded-xl bg-slate-50 px-2.5 py-1 text-xs leading-5 text-slate-600 [overflow-wrap:anywhere]">
                {topic.canonicalName}
                {topic.status === 'deprecated' ? <span className="ml-1 text-slate-400">（历史关联）</span> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null : null}
    </div>
  );
}
