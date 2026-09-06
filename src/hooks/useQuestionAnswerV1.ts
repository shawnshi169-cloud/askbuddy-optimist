import { useLayoutEffect } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  questionAnswerClient as api,
  QuestionAnswerUiError,
} from '@/lib/adapters/questionAnswerV1';
import {
  questionAnswerKeys as keys,
  QA_PAGE_SIZE,
  retireOtherQuestionAnswerViewers,
  type ViewerScope,
} from './questionAnswerV1Cache';
import type { AnswerOrderV1 } from '../../packages/shared-types/src/question-answer-v1';

type Input<N extends keyof typeof api> = Parameters<(typeof api)[N]>[0];

export const useQuestionAnswerViewer = () => {
  const { user, loading } = useAuth();
  const viewer = user?.id ?? null;
  const client = useQueryClient();
  useLayoutEffect(() => {
    // Also prune on mount: an account may have changed while this feature was not mounted.
    if (!loading) retireOtherQuestionAnswerViewers(client, viewer);
  }, [viewer, loading, client]);
  return { viewer, loading };
};

export const useCanonicalQuestion = (
  id: string,
  viewer: ViewerScope,
  enabled = true,
) =>
  useQuery({
    queryKey: keys.detail(viewer, id),
    queryFn: ({ signal }) =>
      api.question({ p_question_id: id }, viewer, signal),
    enabled: enabled && Boolean(id),
    retry: false,
  });
export const useCanonicalAnswers = (
  id: string,
  order: AnswerOrderV1,
  viewer: ViewerScope,
  enabled: boolean,
) =>
  useInfiniteQuery({
    queryKey: keys.answerPage(viewer, id, order),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api.answers(
        {
          p_question_id: id,
          p_order: order,
          p_limit: QA_PAGE_SIZE,
          p_offset: pageParam,
        },
        viewer,
        signal,
      ),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    enabled: enabled && Boolean(id),
    retry: false,
  });
export const useCanonicalReplies = (
  id: string,
  viewer: ViewerScope,
  enabled: boolean,
) =>
  useInfiniteQuery({
    queryKey: keys.replies(viewer, id),
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) =>
      api.replies(
        { p_answer_id: id, p_limit: QA_PAGE_SIZE, p_offset: pageParam },
        viewer,
        signal,
      ),
    getNextPageParam: (page) => page.nextOffset ?? undefined,
    enabled,
    retry: false,
  });

const useCanonicalMutation = <P, R>(
  viewer: ViewerScope,
  write: (input: P, viewer: ViewerScope) => Promise<R>,
  targets: (
    input: P,
    result: R,
    viewer: ViewerScope,
  ) => readonly (readonly unknown[])[],
) => {
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({
      input,
      viewer: initiatingViewer,
    }: {
      input: P;
      viewer: string;
    }) => write(input, initiatingViewer),
    onSuccess: async (result, operation) => {
      for (const queryKey of targets(
        operation.input,
        result,
        operation.viewer,
      )) {
        await client.invalidateQueries({ queryKey });
      }
    },
    retry: false,
  });
  return {
    ...mutation,
    mutateAsync: (input: P) => {
      if (!viewer)
        return Promise.reject(
          new QuestionAnswerUiError('AUTHENTICATION_REQUIRED'),
        );
      return mutation.mutateAsync({ input, viewer });
    },
  };
};
const questionTargets = (viewer: ViewerScope, id: string) => [
  keys.detail(viewer, id),
  keys.answers(viewer, id),
];
export const useCreateCanonicalQuestion = (viewer: ViewerScope) =>
  useCanonicalMutation(viewer, api.createQuestion, (_input, result, scope) => [
    keys.detail(scope, result.questionId),
  ]);
export const useCloseCanonicalQuestion = (viewer: ViewerScope) =>
  useCanonicalMutation(viewer, api.closeQuestion, (input, _result, scope) =>
    questionTargets(scope, input.p_question_id),
  );
export const useCreateCanonicalAnswer = (viewer: ViewerScope) =>
  useCanonicalMutation(viewer, api.createAnswer, (input, _result, scope) =>
    questionTargets(scope, input.p_question_id),
  );
export const useDeleteCanonicalAnswer = (
  viewer: ViewerScope,
  questionId: string,
) =>
  useCanonicalMutation(viewer, api.deleteAnswer, (input, _result, scope) => [
    ...questionTargets(scope, questionId),
    keys.replies(scope, input.p_answer_id),
  ]);
export const useCanonicalHelpful = (viewer: ViewerScope, questionId: string) =>
  useCanonicalMutation(viewer, api.helpful, (_input, _result, scope) => [
    keys.answers(scope, questionId),
  ]);
export const useCreateCanonicalReply = (
  viewer: ViewerScope,
  questionId: string,
) =>
  useCanonicalMutation(viewer, api.createReply, (input, _result, scope) => [
    ...questionTargets(scope, questionId),
    keys.replies(scope, input.p_answer_id),
  ]);
export const useDeleteCanonicalReply = (
  viewer: ViewerScope,
  questionId: string,
  answerId: string,
) =>
  useCanonicalMutation(viewer, api.deleteReply, (_input, _result, scope) => [
    ...questionTargets(scope, questionId),
    keys.replies(scope, answerId),
  ]);
export type CreateCanonicalQuestionInput = Input<'createQuestion'>;
