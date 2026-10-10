import type { CanonicalTopicV1 } from '../../../../packages/shared-types/src/canonical-topic-v1';

export type TopicOption = Pick<CanonicalTopicV1, 'topicId' | 'canonicalName' | 'status'>;
export interface TopicSelection {
  baseline: string[];
  selected: TopicOption[];
}

export const ownerTopicKeys = {
  associations: (personId: string, experienceId: string) => ['owner-experience-topics', personId, experienceId] as const,
  draft: (personId: string, experienceId: string) => ['owner-experience-topic-draft', personId, experienceId] as const,
  catalog: (personId: string, term: string) => ['owner-topic-catalog', personId, term] as const,
};

export const sameTopicIds = (left: string[], right: string[]) =>
  JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
export const selectionDirty = (selection: TopicSelection | null | undefined) => Boolean(selection
  && !sameTopicIds(selection.baseline, selection.selected.map((topic) => topic.topicId)));
export const restoreTopicSelection = (topics: TopicOption[]): TopicSelection => ({
  baseline: topics.map((topic) => topic.topicId), selected: topics,
});
export const toggleTopic = (selection: TopicSelection, topic: TopicOption): TopicSelection => {
  if (selection.selected.some((item) => item.topicId === topic.topicId)) {
    return { ...selection, selected: selection.selected.filter((item) => item.topicId !== topic.topicId) };
  }
  // Historical links can be removed, but only currently active catalog entries can be added.
  if (topic.status !== 'active') return selection;
  return { ...selection, selected: [...selection.selected, topic] };
};
