import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

const root = path.resolve(import.meta.dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8').replace(/\s+/g, ' ');
const require = createRequire(import.meta.url);
const modules = new Map();
const load = (filename) => {
  const absolute = path.resolve(root, filename);
  if (modules.has(absolute)) return modules.get(absolute).exports;
  const module = { exports: {} };
  modules.set(absolute, module);
  const compiled = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const resolveModule = (specifier) => {
    if (specifier === '@/integrations/supabase/client') return { supabase: {} }; // Never instantiate a live client.
    if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return require(specifier);
    const candidate = specifier.startsWith('@/') ? path.join(root, 'src', specifier.slice(2)) : path.resolve(path.dirname(absolute), specifier);
    return load(candidate.endsWith('.ts') ? candidate : `${candidate}.ts`);
  };
  new Function('require', 'module', 'exports', compiled)(resolveModule, module, module.exports);
  return module.exports;
};
const adapter = load('src/lib/adapters/questionAnswerV1.ts');
const cache = load('src/hooks/questionAnswerV1Cache.ts');
const form = load('src/components/question/questionForm.ts');
const contract = load('packages/shared-api/src/question-answer-v1.ts');
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const A = id(1), B = id(2), Q = id(3), AN = id(4), RE = id(5);
const stamp = '2026-09-05T00:00:00Z';
const question = { questionId: Q, requesterPersonId: A, title: '问题', context: '背景', primaryChannel: 'education-learning', topicIds: [], deepExchangeBudgetMaxCents: null, status: 'open', createdAt: stamp, updatedAt: stamp, requester: null, answerCount: 1 };
const answer = { answerId: AN, questionId: Q, authorPersonId: A, author: null, body: '回答', helpfulCount: 0, viewerHasMarkedHelpful: false, replyCount: 1, createdAt: stamp, updatedAt: stamp };
const reply = { replyId: RE, answerId: AN, authorPersonId: B, author: null, body: '回复', createdAt: stamp, updatedAt: stamp };
const createInput = { p_title: '问题', p_context: '背景', p_primary_channel: 'education-learning', p_topic_ids: [], p_deep_exchange_budget_max_cents: null };
const cases = [
  ['createQuestion', 'create_question_v1', createInput, { questionId: Q }],
  ['updateQuestion', 'update_question_v1', { ...createInput, p_question_id: Q }, { questionId: Q }],
  ['closeQuestion', 'close_question_v1', { p_question_id: Q }, { questionId: Q, status: 'closed' }],
  ['question', 'get_question_detail_v1', { p_question_id: Q }, { question }],
  ['questions', 'list_questions_v1', { p_primary_channel: null, p_status: null, p_limit: 20, p_offset: 0 }, { questions: [question], nextOffset: null }],
  ['createAnswer', 'create_answer_v1', { p_question_id: Q, p_body: '回答' }, { answerId: AN }],
  ['deleteAnswer', 'delete_answer_v1', { p_answer_id: AN }, { answerId: AN }],
  ['answers', 'list_question_answers_v1', { p_question_id: Q, p_order: 'comprehensive', p_limit: 20, p_offset: 0 }, { answers: [answer], nextOffset: 1 }],
  ['helpful', 'set_answer_helpful_v1', { p_answer_id: AN, p_is_helpful: true }, { answerId: AN, helpfulCount: 1, viewerHasMarkedHelpful: true }],
  ['createReply', 'create_answer_reply_v1', { p_answer_id: AN, p_body: '回复' }, { replyId: RE }],
  ['deleteReply', 'delete_answer_reply_v1', { p_reply_id: RE }, { replyId: RE }],
  ['replies', 'list_answer_replies_v1', { p_answer_id: AN, p_limit: 20, p_offset: 0 }, { replies: [reply], nextOffset: 1 }],
];
let groups = 0;
const check = async (name, run) => { try { await run(); groups++; } catch (error) { throw new Error(`EC-2D ${name}`, { cause: error }); } };
await check('all twelve adapters use exact request/response parsers and preserve session', async () => {
  for (const [method, rpc, params, result] of cases) {
    let calls = 0;
    const api = adapter.createQuestionAnswerClient({ viewer: async () => B, run: async (name, actual) => { calls++; assert.equal(name, rpc); assert.deepEqual(actual, params); return { data: result, error: null }; } });
    const expected = contract.QUESTION_ANSWER_V1_RPCS[rpc].parseResult(result, params);
    assert.deepEqual(await api[method](params, B), expected);
    assert.equal(calls, 1);
  }
});
await check('request validation rejects absent context, invalid channel/topics/budget before network', async () => {
  let calls = 0;
  const api = adapter.createQuestionAnswerClient({ viewer: async () => A, run: async () => { calls++; throw new Error('must not run'); } });
  for (const patch of [{ p_title: '' }, { p_context: '  ' }, { p_primary_channel: 'other' }, { p_topic_ids: [id(6)] }, { p_deep_exchange_budget_max_cents: 0 }, { p_deep_exchange_budget_max_cents: 1.1 }]) {
    await assert.rejects(api.createQuestion({ ...createInput, ...patch }, A), (e) => e.key === 'INVALID_INPUT');
  }
  assert.equal(calls, 0);
});
await check('response mismatch/invalid pagination/network failures never become success', async () => {
  for (const result of [{ answers: [answer], nextOffset: 99 }, { answers: [{ ...answer, questionId: id(9) }], nextOffset: null }, { answers: [{ ...answer, helpfulCount: -1 }], nextOffset: null }]) {
    const api = adapter.createQuestionAnswerClient({ viewer: async () => B, run: async () => ({ data: result, error: null }) });
    await assert.rejects(api.answers(cases[7][2], B), (e) => e.key === 'UNAVAILABLE');
  }
  let calls = 0;
  const api = adapter.createQuestionAnswerClient({ viewer: async () => B, run: async () => { calls++; throw new Error('raw PGRST SQL'); } });
  await assert.rejects(api.createAnswer(cases[5][2], B), (e) => e.key === 'UNAVAILABLE' && !/PGRST|SQL/.test(e.message));
  assert.equal(calls, 1, 'No fallback request');
});
await check('exact stable error pairs only; no details/context leakage', async () => {
  for (const stable of contract.QUESTION_ANSWER_V1_STABLE_ERRORS) {
    const api = adapter.createQuestionAnswerClient({ viewer: async () => B, run: async () => ({ data: null, error: { code: stable.sqlState, message: stable.messageKey, details: 'private SQL', context: 'private RLS' } }) });
    await assert.rejects(api.createAnswer(cases[5][2], B), (e) => e.key === stable.messageKey && !/PT\d|SQL|RLS|AUTHENTICATION_REQUIRED/.test(e.message));
  }
  const api = adapter.createQuestionAnswerClient({ viewer: async () => B, run: async () => ({ data: null, error: { code: '42501', message: 'QUESTION_CLOSED' } }) });
  await assert.rejects(api.createAnswer(cases[5][2], B), (e) => e.key === 'UNAVAILABLE');
});
await check('auth switch before/after request cannot enter the wrong viewer cache', async () => {
  let viewer = A, calls = 0;
  const api = adapter.createQuestionAnswerClient({ viewer: async () => viewer, run: async () => { calls++; viewer = B; return { data: cases[7][3], error: null }; } });
  await assert.rejects(api.answers(cases[7][2], B), (e) => e.key === 'VIEWER_CHANGED');
  assert.equal(calls, 0);
  await assert.rejects(api.answers(cases[7][2], A), (e) => e.key === 'VIEWER_CHANGED');
  assert.equal(calls, 1);
});
await check('viewer/order/question scoped keys + auth retirement cancel cached and pending reads', async () => {
  const keys = cache.questionAnswerKeys;
  assert.notDeepEqual(keys.answerPage(A, Q, 'latest'), keys.answerPage(B, Q, 'latest'));
  assert.notDeepEqual(keys.answerPage(A, Q, 'latest'), keys.answerPage(null, Q, 'latest'));
  assert.notDeepEqual(keys.answerPage(A, Q, 'latest'), keys.answerPage(A, Q, 'comprehensive'));
  assert.notDeepEqual(keys.answerPage(A, Q, 'latest'), keys.answerPage(A, id(8), 'latest'));
  assert.notDeepEqual(keys.replies(A, AN), keys.replies(A, id(8)));
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
  client.setQueryData(keys.answerPage(A, Q, 'latest'), { viewerHasMarkedHelpful: true });
  client.setQueryData(keys.answerPage(B, Q, 'latest'), { viewerHasMarkedHelpful: false });
  client.setQueryData(['unrelated'], 'preserved');
  let aborted = false;
  const pending = client.fetchQuery({ queryKey: keys.answerPage(A, Q, 'comprehensive'), queryFn: ({ signal }) => new Promise((_resolve, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('cancelled')); })) }).catch(() => null);
  cache.retireOtherQuestionAnswerViewers(client, B);
  await pending;
  assert.equal(aborted, true);
  assert.equal(client.getQueryData(keys.answerPage(A, Q, 'latest')), undefined);
  assert.equal(client.getQueryData(keys.answerPage(A, Q, 'comprehensive')), undefined);
  assert.deepEqual(client.getQueryData(keys.answerPage(B, Q, 'latest')), { viewerHasMarkedHelpful: false });
  assert.equal(client.getQueryData(['unrelated']), 'preserved');
  client.clear();
});
await check('decimal budget exact and draft version isolated', () => {
  for (const [input, cents] of [['', null], ['1', 100], ['0.01', 1], ['12.34', 1234], ['90071992547409.91', Number.MAX_SAFE_INTEGER]]) assert.equal(form.budgetInputToCents(input), cents);
  for (const input of ['0', '-1', '1e2', '1.001', 'abc', '90071992547409.92']) assert.throws(() => form.budgetInputToCents(input));
  assert.equal(form.formatBudgetCents(Number.MAX_SAFE_INTEGER), '90071992547409.91');
  assert.deepEqual(form.parseQuestionDraft(JSON.stringify({ bounty: 50, tags: ['legacy'], title: 'old' })), form.emptyQuestionDraft());
  assert.notEqual(form.questionDraftKey(A), form.questionDraftKey(B));
});
await check('UI only canonical contract, real one-level interactions and server-confirmed success', () => {
  const newPage = read('src/pages/NewQuestion.tsx'), page = read('src/pages/QuestionDetail.tsx');
  const answers = read('src/components/question/AnswerList.tsx'), replies = read('src/components/question/AnswerReplies.tsx');
  const hook = read('src/hooks/useQuestionAnswerV1.ts'), api = read('src/lib/adapters/questionAnswerV1.ts');
  for (const source of [newPage, page, answers, replies, hook, api]) {
    assert.doesNotMatch(source, /create_question_secure|create_answer_secure|accept_answer_v2|answer_likes|bounty_points|reward_points|useQuestions|demoData|mockData|fallbackResult|\.from\(|\/expert(?:-profile)?\//);
    assert.doesNotMatch(source, /已采纳|已核验|已认证|专家回答|预约时段|parentReplyId|p_parent_reply|setQueryData/);
  }
  assert.match(newPage, /p_topic_ids: \[\]/);
  assert.match(newPage, /budgetInputToCents/);
  assert.match(newPage, /!draft\.context\.trim\(\)/);
  assert.match(newPage, /await create\.mutateAsync[\s\S]*localStorage\.removeItem[\s\S]*navigate\(`/);
  assert.match(page, /question\.answerCount/);
  assert.match(page, /useCanonicalQuestion/);
  assert.match(page, /useCanonicalAnswers/);
  assert.match(page, /p_body: message/);
  assert.match(page, /await createAnswer\.mutateAsync[\s\S]*setAnswerOpen\(false\)/);
  assert.match(page, /question\.status !== 'open'/);
  assert.match(page, /viewer === question\.requesterPersonId && question\.status === 'open'/);
  assert.match(page, /useSubmitContentReport/);
  assert.doesNotMatch(page, /useToggleFavorite|error\.message/);
  assert.match(answers, /viewer === answer\.authorPersonId/);
  assert.match(answers, /p_is_helpful: !answer\.viewerHasMarkedHelpful/);
  assert.match(answers, /onOpenPerson\(answer\.authorPersonId\)/);
  assert.match(replies, /if \(closed \|\| create\.isPending/);
  assert.match(replies, /await create\.mutateAsync[\s\S]*setBody\(''\)/);
  assert.match(replies, /viewer === reply\.authorPersonId/);
  assert.match(hook, /p_order: order/);
  assert.match(hook, /page\.nextOffset \?\? undefined/);
  assert.match(hook, /p_offset: pageParam/);
  assert.match(hook, /viewer: initiatingViewer/);
  assert.match(hook, /operation\.viewer/);
  assert.doesNotMatch(hook, /placeholderData|keepPreviousData|\.sort\(/);
  assert.match(api, /CLIENT_RPC_WHITELIST\[name\]/);
  assert.match(api, /contract\.parseParams\(input\)/);
  assert.match(api, /contract\.parseResult\(data, params\)/);
});
console.log(`EC-2D Question/Answer/Reply UI PASS (${groups} groups; no network or Production mutation).`);
