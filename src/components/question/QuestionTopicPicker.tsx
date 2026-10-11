import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { readTopicCatalog, readTopicLabels } from '@/features/topics/topicCatalog';
import { selectQuestionTopic } from './questionForm';

interface Props {
  viewer: string | null;
  topicIds: string[];
  restoreError?: boolean;
  disabled: boolean;
  onChange: (ids: string[]) => void;
}

export default function QuestionTopicPicker({ viewer, topicIds, restoreError, disabled, onChange }: Props) {
  const [input, setInput] = useState('');
  const [term, setTerm] = useState('');
  const catalog = useInfiniteQuery({
    queryKey: ['question-topic-catalog', viewer, term],
    queryFn: ({ pageParam }) => readTopicCatalog(term, pageParam),
    initialPageParam: 0,
    getNextPageParam: (page) => page.nextOffset,
    retry: false,
  });
  const labels = useQuery({
    queryKey: ['question-topic-labels', viewer, topicIds],
    queryFn: () => readTopicLabels(topicIds),
    enabled: topicIds.length > 0,
    retry: false,
  });
  const options = [...new Map((catalog.data?.pages.flatMap(page => [
    ...(page.exact ? [page.exact] : []), ...page.topics,
  ]) ?? []).map(topic => [topic.topicId.toLowerCase(), topic])).values()];
  const known = new Map([...options, ...(labels.data ?? [])].map(topic => [topic.topicId.toLowerCase(), topic]));
  const missingLabels = topicIds.some(id => !known.has(id.toLowerCase()));
  const remove = (id: string) => { if (!disabled) onChange(topicIds.filter(value => value.toLowerCase() !== id.toLowerCase())); };
  const search = () => { if (!disabled) setTerm(input.trim()); };

  return (
    <fieldset disabled={disabled} className="min-w-0 space-y-3 border-t border-app-border-subtle py-6" aria-labelledby="question-topics-title">
      <legend className="sr-only">相关话题（选填）</legend>
      <h2 id="question-topics-title" className="text-sm font-medium text-slate-700">相关话题（选填）</h2>
      <p className="text-[13px] leading-6 text-slate-500">选择与你的问题相关的话题，方便其他人理解你的问题。</p>
      {restoreError ? <p role="alert" className="text-sm text-slate-600">草稿中的话题信息无法恢复，问题内容仍保留。请清空话题选择后重新选择，也可以保持为空。</p> : null}
      {topicIds.length > 0 || restoreError ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2" aria-label="已选话题">
            {topicIds.map((id, index) => {
              const topic = known.get(id.toLowerCase());
              const label = topic?.canonicalName ?? `名称暂不可用的话题（第 ${index + 1} 项）`;
              return <Button key={id} type="button" variant="outline"
                className="h-auto min-h-11 max-w-full whitespace-normal text-left text-sm [overflow-wrap:anywhere]"
                aria-label={`移除话题：${label}`} onClick={() => remove(id)}>
                {label}{topic?.status === 'deprecated' ? '（已不可选，请移除）' : ''} ×
              </Button>;
            })}
          </div>
          <Button type="button" variant="ghost" className="min-h-11 text-slate-500" onClick={() => { if (!disabled) onChange([]); }}>清空话题选择</Button>
          {topicIds.length > 0 && labels.isFetching ? <p role="status" className="text-xs text-slate-500">正在读取已选话题名称…</p> : null}
          {topicIds.length > 0 && (labels.isError || (!labels.isFetching && missingLabels)) ? (
            <div role="status" className="text-xs leading-5 text-slate-500">
              已选话题名称暂未完整读取，选择仍保留，可以移除或重试。
              <Button type="button" variant="ghost" className="min-h-11" disabled={disabled || labels.isFetching} onClick={() => void labels.refetch()}>重试名称</Button>
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="flex gap-2">
        <Input aria-label="搜索相关话题" placeholder="搜索名称或输入完整别名" value={input}
          onChange={event => setInput(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }}
          className="min-h-11 min-w-0 text-base" />
        <Button type="button" variant="outline" className="min-h-11 shrink-0" onClick={search}>搜索话题</Button>
      </div>
      {catalog.isPending ? <p role="status" className="text-sm text-slate-500">正在加载话题…</p> : null}
      <div className="flex flex-wrap gap-2" aria-label="可选话题">
        {options.map(topic => {
          const selected = topicIds.some(id => id.toLowerCase() === topic.topicId.toLowerCase());
          return <Button key={topic.topicId} type="button" variant="outline" aria-pressed={selected}
            disabled={disabled || topic.status !== 'active'}
            className={`h-auto min-h-11 max-w-full whitespace-normal text-left text-sm [overflow-wrap:anywhere] ${selected ? 'border-app-action text-app-action' : ''}`}
            onClick={() => { if (!disabled && topic.status === 'active') { if (selected) remove(topic.topicId); else onChange(selectQuestionTopic(topicIds, topic)); } }}>
            {topic.canonicalName}
          </Button>;
        })}
      </div>
      {catalog.isSuccess && !options.length ? <p className="text-sm text-slate-500">{term ? '没有找到可选话题，试试规范名称或完整别名。' : '暂无可选话题，可以不选。'}</p> : null}
      {catalog.isError ? <p role="status" className="text-sm text-slate-600">话题列表暂时无法加载，问题内容与已选话题仍保留。话题为选填项。</p> : null}
      {catalog.isError || catalog.hasNextPage ? (
        <Button type="button" variant="ghost" className="min-h-11" disabled={disabled || catalog.isFetching}
          onClick={() => void (catalog.isFetchNextPageError ? catalog.fetchNextPage() : catalog.isError ? catalog.refetch() : catalog.fetchNextPage())}>
          {catalog.isFetching ? '正在加载…' : catalog.isError ? '重试话题列表' : '更多话题'}
        </Button>
      ) : null}
    </fieldset>
  );
}
