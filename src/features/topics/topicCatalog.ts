import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { CANONICAL_TOPIC_V1_RPCS, canonicalTopicV1Schema } from '../../../packages/shared-api/src/canonical-topic-v1';
import { questionTopicIdsInput } from '../../../packages/shared-api/src/question-answer-v1';
import type { CanonicalTopicV1 } from '../../../packages/shared-types/src/canonical-topic-v1';
export type CatalogTopic = Pick<CanonicalTopicV1, 'topicId' | 'canonicalName' | 'status'>;

export const TOPIC_PAGE_SIZE = 20;
export const TOPIC_COLUMNS = 'topic_id,canonical_name,status';
export const catalogRows = z.array(z.object({
  topic_id: z.string(), canonical_name: z.string(), status: z.string(),
}).strict()).transform((rows): CatalogTopic[] => rows.map((row) => {
  const { topicId, canonicalName, status } = canonicalTopicV1Schema.parse({
    topicId: row.topic_id, canonicalName: row.canonical_name, status: row.status, aliases: [],
  });
  return { topicId, canonicalName, status };
}));

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
  let exact: CatalogTopic | null = null;
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

// Draft IDs are retained when records are missing; the caller must not fabricate labels.
export async function readTopicLabels(topicIds: string[]) {
  const ids = questionTopicIdsInput.parse(topicIds);
  const topics: CatalogTopic[] = [];
  for (let offset = 0; offset < ids.length; offset += TOPIC_PAGE_SIZE) {
    const batch = ids.slice(offset, offset + TOPIC_PAGE_SIZE);
    const result = await supabase.from('canonical_topics_v1').select(TOPIC_COLUMNS).in('topic_id', batch);
    if (result.error) throw result.error;
    const rows = catalogRows.parse(result.data);
    if (rows.some(row => !batch.some(id => id.toLowerCase() === row.topicId.toLowerCase()))) throw new TypeError('Unexpected Topic label');
    topics.push(...rows);
  }
  if (new Set(topics.map(topic => topic.topicId.toLowerCase())).size !== topics.length) throw new TypeError('Duplicate Topic label');
  return topics;
}
