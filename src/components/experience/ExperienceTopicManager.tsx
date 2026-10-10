import { useLayoutEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOwnerExperienceTopics } from '@/features/experience/topics/useOwnerExperienceTopics';
import { topicErrorCopy } from '@/features/experience/topics/topicApi';

interface Props {
  personId: string;
  experienceId: string;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}

export default function ExperienceTopicManager({ personId, experienceId, onDirtyChange, onBusyChange }: Props) {
  const { user, loading } = useAuth();
  const topics = useOwnerExperienceTopics(personId, experienceId, !loading && user?.id === personId);
  const [input, setInput] = useState('');
  useLayoutEffect(() => { onDirtyChange(topics.dirty); }, [onDirtyChange, topics.dirty]);
  useLayoutEffect(() => { onBusyChange(topics.busy); }, [onBusyChange, topics.busy]);

  return (
    <section className="space-y-3 border-t border-app-border-subtle pt-5" aria-labelledby="experience-topics-title">
      <h2 id="experience-topics-title" className="text-[16px] font-semibold text-slate-800">关联话题（可选）</h2>
      <p className="text-xs leading-5 text-slate-500">选择与你这段经历相关的话题，为以后被有类似问题的人发现补充信息。关联不代表认证，也不会开启服务或沟通功能。</p>
      {topics.associations.isPending ? <p role="status" className="text-sm text-slate-500">正在读取已关联的话题…</p> : null}
      {topics.associations.isError ? (
        <div role="alert" className="text-sm text-slate-600">
          <p>{topicErrorCopy(topics.associations.error)}</p>
          <Button variant="ghost" className="min-h-11" disabled={topics.busy || topics.associations.isFetching} onClick={() => void topics.associations.refetch()}>重试读取</Button>
        </div>
      ) : null}
      {topics.selection ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-500">{topics.dirty ? '当前选择（尚未保存）' : '已关联的话题'}</p>
          <div className="flex flex-wrap gap-2">
            {topics.selection.selected.map((topic) => (
              <Button key={topic.topicId} variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal text-left text-sm"
                disabled={!topics.ready || topics.busy} aria-label={`移除关联：${topic.canonicalName}`}
                onClick={() => topics.change(topic)}>
                {topic.canonicalName}{topic.status === 'deprecated' ? '（历史关联，移除后不可重新添加）' : ''} ×
              </Button>
            ))}
          </div>
          {!topics.selection.selected.length ? <p className="text-sm text-slate-500">未选择话题，可以保持为空。</p> : null}
        </div>
      ) : null}
      {topics.ready ? (
        <fieldset disabled={topics.busy} className="min-w-0 space-y-3">
          <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); topics.setTerm(input.trim()); }}>
            <Input aria-label="搜索平台话题" value={input} onChange={(event) => setInput(event.target.value)}
              placeholder="搜索名称或输入完整别名" className="min-h-11 min-w-0" />
            <Button type="submit" variant="outline" className="min-h-11 shrink-0">搜索</Button>
          </form>
          <p className="text-xs leading-5 text-slate-500">按名称检索；完整别名按平台规则精确识别，不自动创建话题。</p>
          {topics.catalog.isPending ? <p role="status" className="text-sm text-slate-500">正在加载话题…</p> : null}
          <div className="flex flex-wrap gap-2" aria-label="可选话题">
            {topics.options.map((topic) => {
              const selected = topics.selection?.selected.some((item) => item.topicId === topic.topicId);
              return <Button key={topic.topicId} variant="outline" aria-pressed={Boolean(selected)}
                className={`h-auto min-h-11 max-w-full whitespace-normal text-sm ${selected ? 'border-app-action text-app-action' : ''}`}
                onClick={() => topics.change(topic)}>{topic.canonicalName}</Button>;
            })}
          </div>
          {topics.catalog.isSuccess && !topics.options.length ? <p className="text-sm text-slate-500">{topics.term ? '没有找到可选话题，试试平台名称或完整别名。' : '暂无可选话题。'}</p> : null}
          {topics.catalog.isError ? <p role="alert" className="text-sm text-slate-600">话题列表暂时无法加载，已选内容仍保留。</p> : null}
          {topics.catalog.isError || topics.catalog.hasNextPage ? (
            <Button variant="ghost" className="min-h-11" disabled={topics.catalog.isFetching}
              onClick={() => void (topics.catalog.isFetchNextPageError || topics.catalog.hasNextPage
                ? topics.catalog.fetchNextPage() : topics.catalog.refetch())}>
              {topics.catalog.isFetching ? '正在加载…' : topics.catalog.isError ? '重试加载话题' : '更多话题'}
            </Button>
          ) : null}
          {topics.conflict ? <p role="alert" className="text-sm text-slate-600">关联已在其他位置变化。当前选择已保留，请取消本次修改、查看最新关联后重新选择。</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="min-h-11 text-app-action" disabled={!topics.dirty || topics.conflict} onClick={() => void topics.save()}>{topics.busy ? '正在保存关联…' : '保存话题关联'}</Button>
            <Button variant="ghost" className="min-h-11" disabled={!topics.dirty} onClick={topics.discard}>取消话题修改</Button>
          </div>
          <p className="text-xs text-slate-500">话题关联单独保存，不会保存经历正文或转变编辑。</p>
        </fieldset>
      ) : null}
      {topics.notice ? <p role="status" className="text-sm leading-6 text-slate-600">{topics.notice}</p> : null}
    </section>
  );
}
