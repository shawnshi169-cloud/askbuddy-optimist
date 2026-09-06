import type { AnswerOrderV1 } from '../../packages/shared-types/src/question-answer-v1';
import type { QueryClient } from '@tanstack/react-query';

export const QA_PAGE_SIZE = 20;
export type ViewerScope = string | null;
export const questionAnswerKeys = {
  scope: (viewer: ViewerScope) =>
    ['canonical-question-answer-v1', viewer ?? 'anon'] as const,
  detail: (viewer: ViewerScope, questionId: string) =>
    [...questionAnswerKeys.scope(viewer), 'detail', questionId] as const,
  answers: (viewer: ViewerScope, questionId: string) =>
    [...questionAnswerKeys.scope(viewer), 'answers', questionId] as const,
  answerPage: (viewer: ViewerScope, questionId: string, order: AnswerOrderV1) =>
    [
      ...questionAnswerKeys.answers(viewer, questionId),
      order,
      QA_PAGE_SIZE,
    ] as const,
  replies: (viewer: ViewerScope, answerId: string) =>
    [
      ...questionAnswerKeys.scope(viewer),
      'replies',
      answerId,
      QA_PAGE_SIZE,
    ] as const,
};

export const retireOtherQuestionAnswerViewers = (
  client: QueryClient,
  viewer: ViewerScope,
) => {
  const [prefix, scope] = questionAnswerKeys.scope(viewer);
  const filter = {
    predicate: (query: { queryKey: readonly unknown[] }) =>
      query.queryKey[0] === prefix && query.queryKey[1] !== scope,
  };
  void client.cancelQueries(filter);
  client.removeQueries(filter);
};
