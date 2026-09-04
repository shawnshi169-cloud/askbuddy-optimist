import type { PublicPersonId } from '../../../packages/shared-types/src/public-person';

export const personExperienceQueryKeys = {
  publicProfile: (personId: PublicPersonId | undefined) => ['public-person-profile', personId] as const,
  publicExperiences: (personId: PublicPersonId | undefined) => ['public-person-experiences', personId] as const,
  myExperiences: (personId: PublicPersonId | undefined) => ['my-person-experiences', personId] as const,
};

export const requireOwnerPersonId = (personId: PublicPersonId | undefined): PublicPersonId => {
  if (!personId) throw new TypeError('Owner Person identity required');
  return personId;
};

// Capture identity with the operation so a later account switch cannot retarget its cache effects.
export const bindOwnerOperation = <T>(personId: PublicPersonId | undefined, input: T) => ({
  personId: requireOwnerPersonId(personId),
  input,
});
