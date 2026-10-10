import { queryOptions, type QueryClient } from '@tanstack/react-query';
import type { PublicPersonExperienceV1 } from '../../../../packages/shared-types/src/experience-v1';
import { readPublicExperienceTopics } from './publicTopicApi';

export const publicTopicKeys = {
  experience: (experienceId: string) => ['public-experience-topics', experienceId] as const,
  viewer: (experienceId: string, viewerId: string | null) => [...publicTopicKeys.experience(experienceId), viewerId] as const,
};

// Bounds even fast scrolling / the no-IntersectionObserver fallback. Cancel queued work on unmount.
export function createPublicTopicReadQueue(limit = 3) {
  let active = 0;
  const waiting: Array<() => void> = [];
  return <T>(read: () => Promise<T>, signal: AbortSignal): Promise<T> => new Promise((resolve, reject) => {
    const abort = () => {
      const index = waiting.indexOf(start);
      if (index >= 0) waiting.splice(index, 1);
      reject(signal.reason);
    };
    const start = () => {
      signal.removeEventListener('abort', abort);
      if (signal.aborted) { reject(signal.reason); return; }
      active++;
      Promise.resolve().then(read).then(resolve, reject).finally(() => {
        active--;
        waiting.shift()?.();
      });
    };
    if (signal.aborted) { reject(signal.reason); return; }
    if (active < limit) start();
    else { waiting.push(start); signal.addEventListener('abort', abort, { once: true }); }
  });
}

const schedule = createPublicTopicReadQueue();

export function publicTopicQueryOptions(experience: PublicPersonExperienceV1, viewerId: string | null) {
  return queryOptions({
    queryKey: publicTopicKeys.viewer(experience.experienceId, viewerId),
    queryFn: ({ signal }) => schedule(() => readPublicExperienceTopics(experience, viewerId, signal), signal),
    retry: false,
    staleTime: 30_000,
    refetchOnMount: 'always',
  });
}

export async function refreshPublicTopicProjection(client: QueryClient, experienceId: string) {
  const queryKey = publicTopicKeys.experience(experienceId);
  await client.cancelQueries({ queryKey });
  await client.invalidateQueries({ queryKey });
}
