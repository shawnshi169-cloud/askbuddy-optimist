import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import type { PublicPersonExperienceV1 } from '../../../../packages/shared-types/src/experience-v1';
import { CANONICAL_TOPIC_V1_RPCS, canonicalTopicV1Schema } from '../../../../packages/shared-api/src/canonical-topic-v1';

const LABEL_BATCH_SIZE = 20;
const labelRows = z.array(z.object({
  topic_id: z.string(), canonical_name: z.string(), status: z.string(),
}).strict());

async function checkViewer(viewerId: string | null, signal: AbortSignal) {
  signal.throwIfAborted();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if ((data.session?.user.id ?? null) !== viewerId) throw new Error('PUBLIC_TOPIC_VIEWER_CHANGED');
  signal.throwIfAborted();
}

// Accept only a row from the canonical PUBLIC list, never an owner lookup or guessed ID.
export async function readPublicExperienceTopics(
  publicExperience: PublicPersonExperienceV1,
  viewerId: string | null,
  signal: AbortSignal,
) {
  if (publicExperience.visibility !== 'public') throw new TypeError('Public Experience required');
  const contract = CANONICAL_TOPIC_V1_RPCS.get_experience_topics_v1;
  const params = contract.parseParams({ p_experience_id: publicExperience.experienceId });
  const args: Database['public']['Functions']['get_experience_topics_v1']['Args'] = {
    p_experience_id: params.p_experience_id,
  };
  await checkViewer(viewerId, signal);
  const result = await supabase.rpc('get_experience_topics_v1', args).abortSignal(signal);
  if (result.error) throw result.error;
  const { experience } = contract.parseResult(result.data, params);
  await checkViewer(viewerId, signal);
  if (!experience) return null;

  const topics = new Map<string, { topicId: string; canonicalName: string; status: 'active' | 'deprecated' }>();
  for (let offset = 0; offset < experience.topicIds.length; offset += LABEL_BATCH_SIZE) {
    await checkViewer(viewerId, signal);
    const ids = experience.topicIds.slice(offset, offset + LABEL_BATCH_SIZE);
    const labels = await supabase.from('canonical_topics_v1')
      .select('topic_id,canonical_name,status').in('topic_id', ids).abortSignal(signal);
    if (labels.error) throw labels.error;
    for (const row of labelRows.parse(labels.data)) {
      const { topicId, canonicalName, status } = canonicalTopicV1Schema.parse({
        topicId: row.topic_id, canonicalName: row.canonical_name, status: row.status, aliases: [],
      });
      if (!ids.includes(topicId) || topics.has(topicId)) throw new TypeError('Unexpected Topic label');
      topics.set(topicId, { topicId, canonicalName, status });
    }
  }
  await checkViewer(viewerId, signal);
  // Catalog order is not association order; retain the strictly parsed RPC order, including history.
  return experience.topicIds.map((id) => {
    const topic = topics.get(id);
    if (!topic) throw new TypeError('Public Topic label unavailable');
    return topic;
  });
}
