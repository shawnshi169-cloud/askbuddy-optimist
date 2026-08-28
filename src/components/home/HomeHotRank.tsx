import React from 'react';
import { Flame } from 'lucide-react';
import type { HotTopic } from '@/hooks/useHotTopics';
import { SectionHeader } from '@/components/ui2';

interface HomeHotRankProps {
  topics: HotTopic[];
  onOpenTopic: (topicId: string) => void;
}

const rankLabel = (index: number) => String(index + 1).padStart(2, '0');

const HomeHotRank: React.FC<HomeHotRankProps> = ({ topics, onOpenTopic }) => (
  <section className="border-y border-app-border-subtle bg-white px-4 py-6">
    <SectionHeader
      title="问问热榜"
      subtitle="最近大家都在讨论"
      leading={(
        <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
          <Flame aria-hidden size={17} />
        </span>
      )}
    />

    <div className="mt-4">
      {topics.slice(0, 5).map((topic, index) => (
        <button
          type="button"
          key={topic.id}
          className={index === 0
            ? 'mb-2 block w-full rounded-2xl bg-app-action-soft px-3.5 py-3.5 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-action/30 active:scale-[0.99]'
            : 'flex w-full items-start gap-3 border-b border-app-border-subtle px-1 py-3.5 text-left transition-colors duration-150 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-app-action/25 active:bg-app-action-soft/50'}
          onClick={() => onOpenTopic(topic.id)}
        >
          <span className={index === 0
            ? 'block text-xs font-semibold tracking-[0.12em] text-app-action'
            : 'mt-0.5 w-6 shrink-0 text-xs font-semibold tracking-[0.08em] text-slate-400'}>
            {rankLabel(index)}
          </span>
          <span className={index === 0 ? 'mt-1 block' : 'min-w-0 flex-1'}>
            <span className="block text-[15px] font-semibold leading-6 text-slate-800">{topic.title}</span>
            {index === 0 && topic.description ? (
              <span className="mt-1 block truncate text-[13px] leading-5 text-slate-600">{topic.description}</span>
            ) : null}
            <span className="mt-1 block text-xs text-slate-500">
              {topic.participants_count} 人参与 · {topic.discussions_count} 条讨论
            </span>
          </span>
        </button>
      ))}
    </div>
  </section>
);

export const HomeHotRankSkeleton = () => (
  <section className="border-y border-app-border-subtle bg-white px-4 py-6" aria-label="正在加载热榜" role="status">
    <div className="h-5 w-24 animate-pulse rounded-full bg-slate-100" />
    <div className="mt-2 h-3 w-36 animate-pulse rounded-full bg-slate-100" />
    <div className="mt-4 space-y-2">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex animate-pulse items-center gap-3 py-3">
          <div className="h-4 w-6 rounded-full bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-4/5 rounded-full bg-slate-100" />
            <div className="h-3 w-2/5 rounded-full bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  </section>
);

export default HomeHotRank;
