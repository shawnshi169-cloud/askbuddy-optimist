import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  OwnerPersonExperienceV1,
  ExperienceVisibilityV1,
} from '../../../packages/shared-types/src/experience-v1';
import type { PublicPersonId } from '../../../packages/shared-types/src/public-person';
import type {
  CreateExperienceTransitionV1Params,
  CreatePersonExperienceV1Params,
  UpdateExperienceTransitionV1Params,
  UpdatePersonExperienceV1Params,
} from '../../../packages/shared-api/src/experience-v1';
import {
  createExperienceTransitionV1,
  createPersonExperienceV1,
  deleteExperienceTransitionV1,
  deletePersonExperienceV1,
  getMyPersonExperiencesV1,
  getPublicPersonExperiencesV1,
  getPublicPersonProfileV1,
  reorderPersonExperiencesV1,
  setPersonExperienceVisibilityV1,
  updateExperienceTransitionV1,
  updatePersonExperienceV1,
} from './experienceApi';
import { bindOwnerOperation, personExperienceQueryKeys, requireOwnerPersonId } from './experienceCache';

export { personExperienceQueryKeys } from './experienceCache';

const PUBLIC_PAGE_SIZE = 20;
const OWNER_PAGE_SIZE = 100;

export interface OwnerExperienceCollectionV1 {
  personId: PublicPersonId;
  experiences: OwnerPersonExperienceV1[];
}

export const usePublicPersonProfile = (personId: PublicPersonId | undefined) => useQuery({
  queryKey: personExperienceQueryKeys.publicProfile(personId),
  queryFn: () => getPublicPersonProfileV1({ p_user_id: personId! }),
  enabled: Boolean(personId),
  staleTime: 30_000,
});

export const usePublicPersonExperiences = (
  personId: PublicPersonId | undefined,
  enabled = true,
) => useInfiniteQuery({
  queryKey: personExperienceQueryKeys.publicExperiences(personId),
  initialPageParam: 0,
  queryFn: ({ pageParam }) => getPublicPersonExperiencesV1({
    p_person_id: personId!,
    p_limit: PUBLIC_PAGE_SIZE,
    p_offset: pageParam,
  }),
  getNextPageParam: (lastPage) => (
    lastPage.page.hasMore
      ? lastPage.page.offset + lastPage.page.limit
      : undefined
  ),
  enabled: Boolean(personId) && enabled,
  staleTime: 30_000,
});

const getAllOwnerExperiences = async (personId: PublicPersonId): Promise<OwnerExperienceCollectionV1> => {
  const experiences: OwnerPersonExperienceV1[] = [];
  let offset = 0;

  while (true) {
    const page = await getMyPersonExperiencesV1({
      p_limit: OWNER_PAGE_SIZE,
      p_offset: offset,
    });
    if (page.personId !== personId || page.experiences.some((item) => item.personId !== personId)) {
      throw new TypeError('Owner Experience identity mismatch');
    }
    experiences.push(...page.experiences);
    if (!page.page.hasMore) break;
    if (page.experiences.length === 0) {
      throw new TypeError('Invalid owner Experience pagination contract');
    }
    offset += page.page.limit;
  }

  return { personId, experiences };
};

export const useMyPersonExperiences = (personId: PublicPersonId | undefined, enabled = true) => useQuery({
  queryKey: personExperienceQueryKeys.myExperiences(personId),
  queryFn: () => getAllOwnerExperiences(requireOwnerPersonId(personId)),
  enabled: Boolean(personId) && enabled,
  staleTime: 15_000,
});

const useInvalidateExperiences = () => {
  const queryClient = useQueryClient();
  return async (personId: PublicPersonId) => {
    requireOwnerPersonId(personId);
    await queryClient.invalidateQueries({ queryKey: personExperienceQueryKeys.myExperiences(personId), exact: true });
    await queryClient.invalidateQueries({ queryKey: personExperienceQueryKeys.publicExperiences(personId), exact: true });
  };
};

const useOwnerExperienceMutation = <TInput, TResult>(
  personId: PublicPersonId | undefined,
  write: (input: TInput) => Promise<TResult>,
) => {
  const invalidate = useInvalidateExperiences();
  const mutation = useMutation({
    mutationFn: (operation: { personId: PublicPersonId; input: TInput }) => {
      requireOwnerPersonId(operation.personId);
      return write(operation.input);
    },
    onSuccess: (_data, operation) => invalidate(operation.personId),
  });
  return {
    isPending: mutation.isPending,
    mutateAsync: (input: TInput) => mutation.mutateAsync(bindOwnerOperation(personId, input)),
  };
};

export const useCreatePersonExperience = (personId: PublicPersonId | undefined) =>
  useOwnerExperienceMutation(personId, (params: CreatePersonExperienceV1Params) => createPersonExperienceV1(params));

export const useUpdatePersonExperience = (personId: PublicPersonId | undefined) =>
  useOwnerExperienceMutation(personId, (params: UpdatePersonExperienceV1Params) => updatePersonExperienceV1(params));

export const useSetPersonExperienceVisibility = (personId: PublicPersonId | undefined) =>
  useOwnerExperienceMutation(personId, ({ experienceId, visibility }: {
      experienceId: string;
      visibility: ExperienceVisibilityV1;
    }) => setPersonExperienceVisibilityV1({
      p_experience_id: experienceId,
      p_visibility: visibility,
    }));

export const useReorderPersonExperiences = (personId: PublicPersonId | undefined) => {
  const queryClient = useQueryClient();
  const invalidate = useInvalidateExperiences();
  const mutation = useMutation({
    mutationFn: (operation: { personId: PublicPersonId; input: string[] }) => {
      requireOwnerPersonId(operation.personId);
      return reorderPersonExperiencesV1({ p_experience_ids: operation.input });
    },
    onMutate: async (operation) => {
      const queryKey = personExperienceQueryKeys.myExperiences(requireOwnerPersonId(operation.personId));
      await queryClient.cancelQueries({ queryKey, exact: true });
      const previous = queryClient.getQueryData<OwnerExperienceCollectionV1>(
        queryKey,
      );
      if (previous) {
        const byId = new Map(previous.experiences.map((experience) => [experience.experienceId, experience]));
        queryClient.setQueryData<OwnerExperienceCollectionV1>(
          queryKey,
          {
            ...previous,
            experiences: operation.input.flatMap((id, index) => {
              const experience = byId.get(id);
              return experience ? [{ ...experience, sortOrder: index }] : [];
            }),
          },
        );
      }
      return { previous, queryKey };
    },
    onError: (_error, _experienceIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(context.queryKey, context.previous);
      }
    },
    onSettled: (_data, _error, operation) => invalidate(operation.personId),
  });
  return {
    isPending: mutation.isPending,
    mutateAsync: (experienceIds: string[]) => mutation.mutateAsync(bindOwnerOperation(personId, experienceIds)),
  };
};

export const useDeletePersonExperience = (personId: PublicPersonId | undefined) =>
  useOwnerExperienceMutation(personId, (experienceId: string) => deletePersonExperienceV1({ p_experience_id: experienceId }));

export const useCreateExperienceTransition = (personId: PublicPersonId | undefined) =>
  useOwnerExperienceMutation(personId, (params: CreateExperienceTransitionV1Params) => createExperienceTransitionV1(params));

export const useUpdateExperienceTransition = (personId: PublicPersonId | undefined) =>
  useOwnerExperienceMutation(personId, (params: UpdateExperienceTransitionV1Params) => updateExperienceTransitionV1(params));

export const useDeleteExperienceTransition = (personId: PublicPersonId | undefined) =>
  useOwnerExperienceMutation(personId, (transitionId: string) => deleteExperienceTransitionV1({ p_transition_id: transitionId }));
