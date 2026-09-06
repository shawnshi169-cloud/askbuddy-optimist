import { supabase } from '@/integrations/supabase/client';
import { CLIENT_RPC_WHITELIST } from '../../../packages/shared-api/src/rpc-whitelist';
import {
  QUESTION_ANSWER_V1_RPCS,
  parseQuestionAnswerV1StableError,
  type QuestionAnswerV1RpcName,
  type QuestionAnswerV1RpcParams,
  type QuestionAnswerV1StableError,
} from '../../../packages/shared-api/src/question-answer-v1';

export type ViewerScope = string | null;
type Params = QuestionAnswerV1RpcParams<QuestionAnswerV1RpcName>;
type ErrorKey = QuestionAnswerV1StableError['messageKey'];
const messages: Record<ErrorKey, string> = {
  TARGET_NOT_FOUND_OR_INACCESSIBLE: '内容不存在或暂时无法访问。',
  QUESTION_CLOSED: '问题已关闭，不能再新增回答或回复。',
  SELF_HELPFUL_FORBIDDEN: '不能为自己的回答标记有帮助。',
  CANONICAL_TOPIC_NOT_READY: '话题暂不可用，请移除话题后重试。',
  INVALID_INPUT: '请检查填写内容后重试。',
  AUTHENTICATION_REQUIRED: '请先登录后再操作。',
  IMMUTABLE_FIELD: '这项信息不支持修改。',
  UNSUPPORTED_TRANSACTION_ISOLATION: '服务暂时无法完成操作，请稍后重试。',
};

export class QuestionAnswerUiError extends Error {
  constructor(readonly key: ErrorKey | 'UNAVAILABLE' | 'VIEWER_CHANGED') {
    super(
      key === 'VIEWER_CHANGED'
        ? '登录状态已改变，请重新操作。'
        : key === 'UNAVAILABLE'
          ? '暂时无法完成操作，请稍后重试。'
          : messages[key],
    );
  }
}
export const questionAnswerErrorText = (error: unknown) =>
  error instanceof QuestionAnswerUiError
    ? error.message
    : '暂时无法完成操作，请稍后重试。';

export interface QuestionAnswerTransport {
  viewer: () => Promise<ViewerScope>;
  run: (
    name: QuestionAnswerV1RpcName,
    params: Params,
    signal?: AbortSignal,
  ) => PromiseLike<{ data: unknown; error: unknown }>;
}

// Injectable transport keeps parser/identity/error behavior testable without any live writes.
export const createQuestionAnswerClient = (
  transport: QuestionAnswerTransport,
) => {
  const bind =
    <P extends Params, R>(
      name: QuestionAnswerV1RpcName,
      contract: {
        parseParams: (value: unknown) => P;
        parseResult: (value: unknown, request: unknown) => R;
      },
    ) =>
    async (input: P, viewer: ViewerScope, signal?: AbortSignal): Promise<R> => {
      const assertActive = () => {
        if (signal?.aborted) throw new DOMException('Cancelled', 'AbortError');
      };
      const assertViewer = async () => {
        assertActive();
        if ((await transport.viewer()) !== viewer)
          throw new QuestionAnswerUiError('VIEWER_CHANGED');
        assertActive();
      };
      if (CLIENT_RPC_WHITELIST[name] !== `public.${name}`)
        throw new QuestionAnswerUiError('UNAVAILABLE');
      let params: P;
      try {
        params = contract.parseParams(input);
      } catch {
        throw new QuestionAnswerUiError('INVALID_INPUT');
      }
      await assertViewer();
      try {
        const { data, error } = await transport.run(name, params, signal);
        await assertViewer();
        if (error) {
          const stable = parseQuestionAnswerV1StableError(error);
          throw new QuestionAnswerUiError(stable?.messageKey ?? 'UNAVAILABLE');
        }
        return contract.parseResult(data, params);
      } catch (error) {
        if (error instanceof QuestionAnswerUiError || signal?.aborted)
          throw error;
        throw new QuestionAnswerUiError('UNAVAILABLE');
      }
    };
  return {
    createQuestion: bind(
      'create_question_v1',
      QUESTION_ANSWER_V1_RPCS.create_question_v1,
    ),
    updateQuestion: bind(
      'update_question_v1',
      QUESTION_ANSWER_V1_RPCS.update_question_v1,
    ),
    closeQuestion: bind(
      'close_question_v1',
      QUESTION_ANSWER_V1_RPCS.close_question_v1,
    ),
    question: bind(
      'get_question_detail_v1',
      QUESTION_ANSWER_V1_RPCS.get_question_detail_v1,
    ),
    questions: bind(
      'list_questions_v1',
      QUESTION_ANSWER_V1_RPCS.list_questions_v1,
    ),
    createAnswer: bind(
      'create_answer_v1',
      QUESTION_ANSWER_V1_RPCS.create_answer_v1,
    ),
    deleteAnswer: bind(
      'delete_answer_v1',
      QUESTION_ANSWER_V1_RPCS.delete_answer_v1,
    ),
    answers: bind(
      'list_question_answers_v1',
      QUESTION_ANSWER_V1_RPCS.list_question_answers_v1,
    ),
    helpful: bind(
      'set_answer_helpful_v1',
      QUESTION_ANSWER_V1_RPCS.set_answer_helpful_v1,
    ),
    createReply: bind(
      'create_answer_reply_v1',
      QUESTION_ANSWER_V1_RPCS.create_answer_reply_v1,
    ),
    deleteReply: bind(
      'delete_answer_reply_v1',
      QUESTION_ANSWER_V1_RPCS.delete_answer_reply_v1,
    ),
    replies: bind(
      'list_answer_replies_v1',
      QUESTION_ANSWER_V1_RPCS.list_answer_replies_v1,
    ),
  };
};

export const questionAnswerClient = createQuestionAnswerClient({
  viewer: async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new QuestionAnswerUiError('UNAVAILABLE');
    return data.session?.user.id ?? null;
  },
  run: (name, params, signal) => {
    const request = supabase.rpc(name, params);
    return signal ? request.abortSignal(signal) : request;
  },
});
