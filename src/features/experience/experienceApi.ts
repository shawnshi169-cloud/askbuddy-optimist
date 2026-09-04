import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import {
  CLIENT_RPC_WHITELIST,
} from '../../../packages/shared-api/src/rpc-whitelist';
import {
  parseGetMyPersonExperiencesV1Result,
  parseGetPublicPersonExperiencesV1Result,
  type CreateExperienceTransitionV1Params,
  type CreatePersonExperienceV1Params,
  type DeleteExperienceTransitionV1Params,
  type DeletePersonExperienceV1Params,
  type GetMyPersonExperiencesV1Params,
  type GetPublicPersonExperiencesV1Params,
  type ReorderPersonExperiencesV1Params,
  type SetPersonExperienceVisibilityV1Params,
  type UpdateExperienceTransitionV1Params,
  type UpdatePersonExperienceV1Params,
} from '../../../packages/shared-api/src/experience-v1';
import {
  parseGetPublicPersonProfileV1Result,
  type GetPublicPersonProfileV1Params,
} from '../../../packages/shared-api/src/public-person-v1';

type PublicFunctionName = Extract<keyof Database['public']['Functions'], string>;
type QualifiedPublicFunctionName = `public.${PublicFunctionName}`;

const toSupabaseRpcName = (qualifiedName: QualifiedPublicFunctionName): PublicFunctionName => {
  const prefix = 'public.';
  if (!qualifiedName.startsWith(prefix)) {
    throw new TypeError('Invalid canonical RPC name');
  }
  return qualifiedName.slice(prefix.length) as PublicFunctionName;
};

const EXPERIENCE_RPC = {
  publicPersonProfile: toSupabaseRpcName(CLIENT_RPC_WHITELIST.get_public_person_profile_v1),
  publicExperiences: toSupabaseRpcName(CLIENT_RPC_WHITELIST.get_public_person_experiences_v1),
  myExperiences: toSupabaseRpcName(CLIENT_RPC_WHITELIST.get_my_person_experiences_v1),
  createExperience: toSupabaseRpcName(CLIENT_RPC_WHITELIST.create_person_experience_v1),
  updateExperience: toSupabaseRpcName(CLIENT_RPC_WHITELIST.update_person_experience_v1),
  setVisibility: toSupabaseRpcName(CLIENT_RPC_WHITELIST.set_person_experience_visibility_v1),
  reorderExperiences: toSupabaseRpcName(CLIENT_RPC_WHITELIST.reorder_person_experiences_v1),
  deleteExperience: toSupabaseRpcName(CLIENT_RPC_WHITELIST.delete_person_experience_v1),
  createTransition: toSupabaseRpcName(CLIENT_RPC_WHITELIST.create_experience_transition_v1),
  updateTransition: toSupabaseRpcName(CLIENT_RPC_WHITELIST.update_experience_transition_v1),
  deleteTransition: toSupabaseRpcName(CLIENT_RPC_WHITELIST.delete_experience_transition_v1),
} as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export class ExperienceApiError extends Error {
  readonly operation: string;

  constructor(operation: string, cause: unknown) {
    const source = cause instanceof Error ? cause.message : String(cause || 'Unknown error');
    super(`${operation}: ${source}`);
    this.name = 'ExperienceApiError';
    this.operation = operation;
  }
}

const throwApiError = (operation: string, error: unknown): never => {
  throw error instanceof ExperienceApiError ? error : new ExperienceApiError(operation, error);
};

const parseUuidResult = (operation: string, value: unknown): string => {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ExperienceApiError(operation, new TypeError('Invalid UUID response'));
  }
  return value;
};

export const getPublicPersonProfileV1 = async (params: GetPublicPersonProfileV1Params) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.publicPersonProfile, params);
  if (error) throwApiError(EXPERIENCE_RPC.publicPersonProfile, error);
  return parseGetPublicPersonProfileV1Result(data);
};

export const getPublicPersonExperiencesV1 = async (
  params: GetPublicPersonExperiencesV1Params,
) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.publicExperiences, params);
  if (error) throwApiError(EXPERIENCE_RPC.publicExperiences, error);
  return parseGetPublicPersonExperiencesV1Result(data);
};

export const getMyPersonExperiencesV1 = async (params: GetMyPersonExperiencesV1Params) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.myExperiences, params);
  if (error) throwApiError(EXPERIENCE_RPC.myExperiences, error);
  return parseGetMyPersonExperiencesV1Result(data);
};

export const createPersonExperienceV1 = async (params: CreatePersonExperienceV1Params) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.createExperience, params);
  if (error) throwApiError(EXPERIENCE_RPC.createExperience, error);
  return parseUuidResult(EXPERIENCE_RPC.createExperience, data);
};

export const updatePersonExperienceV1 = async (params: UpdatePersonExperienceV1Params) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.updateExperience, params);
  if (error) throwApiError(EXPERIENCE_RPC.updateExperience, error);
  return parseUuidResult(EXPERIENCE_RPC.updateExperience, data);
};

export const setPersonExperienceVisibilityV1 = async (
  params: SetPersonExperienceVisibilityV1Params,
) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.setVisibility, params);
  if (error) throwApiError(EXPERIENCE_RPC.setVisibility, error);
  return parseUuidResult(EXPERIENCE_RPC.setVisibility, data);
};

export const reorderPersonExperiencesV1 = async (params: ReorderPersonExperiencesV1Params) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.reorderExperiences, params);
  if (error) throwApiError(EXPERIENCE_RPC.reorderExperiences, error);
  if (!Number.isInteger(data) || (data as number) < 0) {
    throw new ExperienceApiError(EXPERIENCE_RPC.reorderExperiences, new TypeError('Invalid count response'));
  }
  return data as number;
};

export const deletePersonExperienceV1 = async (params: DeletePersonExperienceV1Params) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.deleteExperience, params);
  if (error) throwApiError(EXPERIENCE_RPC.deleteExperience, error);
  return parseUuidResult(EXPERIENCE_RPC.deleteExperience, data);
};

export const createExperienceTransitionV1 = async (
  params: CreateExperienceTransitionV1Params,
) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.createTransition, params);
  if (error) throwApiError(EXPERIENCE_RPC.createTransition, error);
  return parseUuidResult(EXPERIENCE_RPC.createTransition, data);
};

export const updateExperienceTransitionV1 = async (
  params: UpdateExperienceTransitionV1Params,
) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.updateTransition, params);
  if (error) throwApiError(EXPERIENCE_RPC.updateTransition, error);
  return parseUuidResult(EXPERIENCE_RPC.updateTransition, data);
};

export const deleteExperienceTransitionV1 = async (
  params: DeleteExperienceTransitionV1Params,
) => {
  const { data, error } = await supabase.rpc(EXPERIENCE_RPC.deleteTransition, params);
  if (error) throwApiError(EXPERIENCE_RPC.deleteTransition, error);
  return parseUuidResult(EXPERIENCE_RPC.deleteTransition, data);
};
