import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  CANONICAL_TOPIC_V1_RPCS,
  canonicalTopicV1Schema,
  parseCanonicalTopicErrorV1,
} from '../../../../packages/shared-api/src/canonical-topic-v1';
import type { TopicOption } from './topicSelection';

export const TOPIC_PAGE_SIZE = 20;
const TOPIC_COLUMNS = 'topic_id,canonical_name,status';
const catalogRows = z.array(z.object({
  topic_id: z.string(), canonical_name: z.string(), status: z.string(),
}).strict()).transform((rows): TopicOption[] => rows.map((row) => {
  const { topicId, canonicalName, status } = canonicalTopicV1Schema.parse({
    topicId: row.topic_id, canonicalName: row.canonical_name, status: row.status, aliases: [],
  });
  return { topicId, canonicalName, status };
}));

export async function requireTopicOwner(personId: string) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !personId || data.session?.user.id !== personId) {
    throw new Error('TOPIC_OWNER_CHANGED');
  }
}

export async function readTopicCatalog(term: string, offset: number) {
  if (!Number.isSafeInteger(offset) || offset < 0) throw new TypeError('Invalid Topic offset');
  let query = supabase.from('canonical_topics_v1').select(TOPIC_COLUMNS).eq('status', 'active')
    .order('canonical_name', { ascending: true }).order('topic_id', { ascending: true });
  const search = term.trim();
  if (search) query = query.ilike('canonical_name', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  const { data, error } = await query.range(offset, offset + TOPIC_PAGE_SIZE - 1);
  if (error) throw error;
  const topics = catalogRows.parse(data);
  if (topics.some((topic) => topic.status !== 'active')) throw new TypeError('Inactive catalog result');
  let exact: TopicOption | null = null;
  if (search && offset === 0) {
    const contract = CANONICAL_TOPIC_V1_RPCS.resolve_canonical_topic_v1;
    const params = contract.parseParams({ p_term: search });
    // Explicit required keys bridge non-strict TS inference; values still come from the strict parser.
    const args: Database['public']['Functions']['resolve_canonical_topic_v1']['Args'] = {
      p_term: params.p_term,
    };
    const result = await supabase.rpc('resolve_canonical_topic_v1', args);
    if (result.error) throw result.error;
    exact = contract.parseResult(result.data, params).topic;
  }
  return { topics, exact, nextOffset: topics.length === TOPIC_PAGE_SIZE ? offset + TOPIC_PAGE_SIZE : undefined };
}

export async function readLinkedTopics(personId: string, experienceId: string) {
  await requireTopicOwner(personId);
  const contract = CANONICAL_TOPIC_V1_RPCS.get_experience_topics_v1;
  const params = contract.parseParams({ p_experience_id: experienceId });
  const args: Database['public']['Functions']['get_experience_topics_v1']['Args'] = {
    p_experience_id: params.p_experience_id,
  };
  const { data, error } = await supabase.rpc('get_experience_topics_v1', args);
  if (error) throw error;
  const { experience } = contract.parseResult(data, params);
  if (!experience) throw { code: 'PT404', message: 'TARGET_NOT_FOUND_OR_INACCESSIBLE' };
  const labels: TopicOption[] = [];
  // No active filter here: historical deprecated links must survive hydration.
  for (let offset = 0; offset < experience.topicIds.length; offset += TOPIC_PAGE_SIZE) {
    const ids = experience.topicIds.slice(offset, offset + TOPIC_PAGE_SIZE);
    const result = await supabase.from('canonical_topics_v1').select(TOPIC_COLUMNS).in('topic_id', ids);
    if (result.error) throw result.error;
    labels.push(...catalogRows.parse(result.data));
  }
  const byId = new Map(labels.map((topic) => [topic.topicId, topic]));
  const topics = experience.topicIds.map((id) => {
    const topic = byId.get(id);
    if (!topic) throw new TypeError('Linked Topic label unavailable');
    return topic;
  });
  await requireTopicOwner(personId);
  return topics;
}

export async function saveLinkedTopics(personId: string, experienceId: string, topicIds: string[]) {
  const contract = CANONICAL_TOPIC_V1_RPCS.set_experience_topics_v1;
  const params = contract.parseParams({ p_experience_id: experienceId, p_topic_ids: topicIds });
  const args: Database['public']['Functions']['set_experience_topics_v1']['Args'] = {
    p_experience_id: params.p_experience_id,
    p_topic_ids: params.p_topic_ids,
  };
  await requireTopicOwner(personId);
  const { data, error } = await supabase.rpc('set_experience_topics_v1', args);
  if (error) throw error;
  return contract.parseResult(data, params);
}

export function topicErrorCopy(error: unknown) {
  switch (parseCanonicalTopicErrorV1(error)) {
    case 'TOPIC_INVALID_OR_INACTIVE': return '部分话题已不可选。你的选择已保留，请移除不再适用的话题后重试。';
    case 'TARGET_NOT_FOUND_OR_INACCESSIBLE': return '这段经历已不存在或当前账号无权访问，无法读取或保存关联。';
    case 'AUTHENTICATION_REQUIRED': return '请重新登录后再试，未保存的选择仍保留在当前账号的本次会话中。';
    default: return error instanceof Error && error.message === 'TOPIC_OWNER_CHANGED'
      ? '登录账号已变化，请使用原账号重新进入编辑。'
      : '话题关联暂时不可用，请稍后重试。未保存的选择不会被清空。';
  }
}
