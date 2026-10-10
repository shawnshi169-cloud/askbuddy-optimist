import { useRef, useState } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { readLinkedTopics, readTopicCatalog, saveLinkedTopics, topicErrorCopy } from './topicApi';
import {
  ownerTopicKeys, restoreTopicSelection, sameTopicIds, selectionDirty, toggleTopic,
  type TopicOption, type TopicSelection,
} from './topicSelection';

export function useOwnerExperienceTopics(personId: string, experienceId: string, enabled: boolean) {
  const client = useQueryClient();
  const associationKey = ownerTopicKeys.associations(personId, experienceId);
  const draftKey = ownerTopicKeys.draft(personId, experienceId);
  const [term, setTerm] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const saveLock = useRef(false);
  const associations = useQuery({
    queryKey: associationKey,
    queryFn: () => readLinkedTopics(personId, experienceId),
    enabled: enabled && Boolean(personId && experienceId),
    staleTime: 0,
    retry: false,
  });
  // In-memory, owner-scoped draft survives account changes, never enters another viewer's query.
  // No localStorage or Production write; it is discarded when this app session ends.
  const draftQuery = useQuery<TopicSelection | null>({
    queryKey: draftKey, queryFn: () => null, enabled: false, gcTime: Infinity,
  });
  const selection = draftQuery.data ?? (associations.data ? restoreTopicSelection(associations.data) : null);
  const dirty = selectionDirty(selection);
  const ready = enabled && associations.isSuccess && !associations.isFetching && selection !== null;
  const conflict = Boolean(dirty && selection && associations.data
    && !sameTopicIds(selection.baseline, associations.data.map((topic) => topic.topicId)));
  const catalog = useInfiniteQuery({
    queryKey: ownerTopicKeys.catalog(personId, term),
    queryFn: ({ pageParam }) => readTopicCatalog(term, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextOffset,
    enabled: ready,
    retry: false,
  });
  const mutation = useMutation({
    mutationFn: (input: { personId: string; experienceId: string; topicIds: string[] }) =>
      saveLinkedTopics(input.personId, input.experienceId, input.topicIds),
    retry: false,
  });
  const change = (topic: TopicOption) => {
    if (!ready || !selection || saveLock.current) return;
    const next = toggleTopic(selection, topic);
    client.setQueryData(draftKey, selectionDirty(next) ? next : null);
    setNotice('');
  };
  const discard = () => {
    if (!ready || saveLock.current) return;
    client.setQueryData(draftKey, null);
    setNotice('已取消未保存的话题修改。');
  };
  const save = async () => {
    if (!ready || !dirty || !selection || conflict || saveLock.current) return;
    saveLock.current = true;
    setSaving(true);
    setNotice('');
    try {
      const result = await mutation.mutateAsync({
        personId, experienceId, topicIds: selection.selected.map((topic) => topic.topicId),
      });
      // Do not let a focus/refetch started before the write replace the confirmed association.
      await client.cancelQueries({ queryKey: associationKey, exact: true });
      const confirmed = result.topicIds.map((id) => selection.selected.find((topic) => topic.topicId === id)!);
      client.setQueryData(associationKey, confirmed);
      client.setQueryData(draftKey, null);
      // The write already succeeded. A failed refresh must not be presented as a failed write.
      try {
        await client.fetchQuery({ queryKey: associationKey, queryFn: () => readLinkedTopics(personId, experienceId), staleTime: 0 });
        setNotice('话题关联已保存。');
      } catch {
        setNotice('话题关联已保存，但最新状态暂时无法读取，请重试读取。');
      }
    } catch (error) {
      setNotice(topicErrorCopy(error));
    } finally {
      saveLock.current = false;
      setSaving(false);
    }
  };
  const options = [...new Map((catalog.data?.pages.flatMap((page) => [
    ...(page.exact ? [page.exact] : []), ...page.topics,
  ]) ?? []).map((topic) => [topic.topicId, topic])).values()];
  return { associations, catalog, selection, options, dirty, ready, conflict,
    busy: saving,
    term, setTerm, notice, change, discard, save };
}
