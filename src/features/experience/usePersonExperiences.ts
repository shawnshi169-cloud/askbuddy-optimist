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

const PUBLIC_PAGE_SIZE = 20;
const OWNER_PAGE_SIZE = 100;

export interface OwnerExperienceCollectionV1 {
  personId: PublicPersonId;
  experiences: OwnerPersonExperienceV1[];
}

export const personExperienceQueryKeys = {
  publicProfile: (personId: PublicPersonId | undefined) => ['public-person-profile', personId] as const,
  publicExperiences: (personId: PublicPersonId | undefined) => ['public-person-experiences', personId] as const,
  myExperiences: () => ['my-person-experiences'] as const,
};

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

const getAllOwnerExperiences = async (): Promise<OwnerExperienceCollectionV1> => {
  const experiences: OwnerPersonExperienceV1[] = [];
  let offset = 0;
  let personId: PublicPersonId | null = null;

  while (true) {
    const page = await getMyPersonExperiencesV1({
      p_limit: OWNER_PAGE_SIZE,
      p_offset: offset,
    });
    personId = page.personId;
    experiences.push(...page.experiences);
    if (!page.page.hasMore) break;
    if (page.experiences.length === 0) {
      throw new TypeError('Invalid owner Experience pagination contract');
    }
    offset += page.page.limit;
  }

  if (!personId) {
    throw new TypeError('Invalid owner Experience identity contract');
  }
  return { personId, experiences };
};

export const useMyPersonExperiences = (enabled = true) => useQuery({
  queryKey: personExperienceQueryKeys.myExperiences(),
  queryFn: getAllOwnerExperiences,
  enabled,
  staleTime: 15_000,
});

const useInvalidateExperiences = () => {
  const queryClient = useQueryClient();
  return async (personId?: PublicPersonId) => {
    await queryClient.invalidateQueries({ queryKey: personExperienceQueryKeys.myExperiences() });
    if (personId) {
      await queryClient.invalidateQueries({
        queryKey: personExperienceQueryKeys.publicExperiences(personId),
      });
    }
  };
};

export const useCreatePersonExperience = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateExperiences();
  return useMutation({
    mutationFn: (params: CreatePersonExperienceV1Params) => createPersonExperienceV1(params),
    onSuccess: () => invalidate(personId),
  });
};

export const useUpdatePersonExperience = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateExperiences();
  return useMutation({
    mutationFn: (params: UpdatePersonExperienceV1Params) => updatePersonExperienceV1(params),
    onSuccess: () => invalidate(personId),
  });
};

export const useSetPersonExperienceVisibility = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateExperiences();
  return useMutation({
    mutationFn: ({ experienceId, visibility }: {
      experienceId: string;
      visibility: ExperienceVisibilityV1;
    }) => setPersonExperienceVisibilityV1({
      p_experience_id: experienceId,
      p_visibility: visibility,
    }),
    onSuccess: () => invalidate(personId),
  });
};

export const useReorderPersonExperiences = (personId: PublicPersonId | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (experienceIds: string[]) => reorderPersonExperiencesV1({
      p_experience_ids: experienceIds,
    }),
    onMutate: async (experienceIds) => {
      await queryClient.cancelQueries({ queryKey: personExperienceQueryKeys.myExperiences() });
      const previous = queryClient.getQueryData<OwnerExperienceCollectionV1>(
        personExperienceQueryKeys.myExperiences(),
      );
      if (previous) {
        const byId = new Map(previous.experiences.map((experience) => [experience.experienceId, experience]));
        queryClient.setQueryData<OwnerExperienceCollectionV1>(
          personExperienceQueryKeys.myExperiences(),
          {
            ...previous,
            experiences: experienceIds.flatMap((id, index) => {
              const experience = byId.get(id);
              return experience ? [{ ...experience, sortOrder: index }] : [];
            }),
          },
        );
      }
      return { previous };
    },
    onError: (_error, _experienceIds, context) => {
      if (context?.previous) {
        queryClient.setQueryData(personExperienceQueryKeys.myExperiences(), context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: personExperienceQueryKeys.myExperiences() });
      if (personId) {
        await queryClient.invalidateQueries({
          queryKey: personExperienceQueryKeys.publicExperiences(personId),
        });
      }
    },
  });
};

export const useDeletePersonExperience = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateExperiences();
  return useMutation({
    mutationFn: (experienceId: string) => deletePersonExperienceV1({
      p_experience_id: experienceId,
    }),
    onSuccess: () => invalidate(personId),
  });
};

const useInvalidateTransition = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateExperiences();
  return () => invalidate(personId);
};

export const useCreateExperienceTransition = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateTransition(personId);
  return useMutation({
    mutationFn: (params: CreateExperienceTransitionV1Params) => createExperienceTransitionV1(params),
    onSuccess: invalidate,
  });
};

export const useUpdateExperienceTransition = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateTransition(personId);
  return useMutation({
    mutationFn: (params: UpdateExperienceTransitionV1Params) => updateExperienceTransitionV1(params),
    onSuccess: invalidate,
  });
};

export const useDeleteExperienceTransition = (personId: PublicPersonId | undefined) => {
  const invalidate = useInvalidateTransition(personId);
  return useMutation({
    mutationFn: (transitionId: string) => deleteExperienceTransitionV1({
      p_transition_id: transitionId,
    }),
    onSuccess: invalidate,
  });
};
