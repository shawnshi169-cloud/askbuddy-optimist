import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { checkOwnerTopicScope } from './lib/experience-topic-owner-scope.mjs';

const root = process.cwd(), require = createRequire(import.meta.url);
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const loader = (overrides = {}) => {
  const cache = new Map();
  const load = file => {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} }; cache.set(absolute, module);
    const output = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), { fileName: absolute, compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
    } }).outputText;
    new Function('require', 'module', 'exports', output)(name => {
      if (name in overrides) return overrides[name];
      if (name === '@/integrations/supabase/client') return { supabase: {} };
      if (!name.startsWith('.') && !name.startsWith('@/')) return require(name);
      const candidate = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(absolute), name);
      return load(fs.existsSync(candidate + '.ts') ? candidate + '.ts' : candidate + '.tsx');
    }, module, module.exports);
    return module.exports;
  };
  return load;
};
const load = loader();
const form = load('src/components/question/questionForm.ts');
const adapter = load('src/lib/adapters/questionAnswerV1.ts');
const id = n => `aaaaaaaa-aaaa-4aaa-8aaa-${n.toString(16).padStart(12, '0')}`;
const A = id(1001), B = id(1002), Q = id(1003);
const topic = (n, status = 'active') => ({ topicId: id(n), canonicalName: `规范名称 ${n}`, status });
const a = topic(1), b = topic(2), historic = topic(3, 'deprecated');
const base = { ...form.emptyQuestionDraft(), title: '问题', context: '真实背景', primaryChannel: 'education-learning', budgetInput: '12.34' };
const draft = { ...base, topicIds: [b.topicId, a.topicId] };
const store = () => {
  const data = new Map();
  return { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
};
const storage = store(), session = store();
assert.equal(form.QUESTION_DRAFT_VERSION, 2);
assert.equal(form.questionDraftKey(A), `canonical-question-draft-v2:${A}`);
const { topicIds: _oldIds, ...oldV2 } = base;
assert.deepEqual(form.parseQuestionDraft(JSON.stringify(oldV2)), base);
assert.deepEqual(form.parseQuestionDraft(JSON.stringify(draft)), draft);
assert.deepEqual(form.questionDraftInput(base).p_topic_ids, []);
assert.deepEqual(form.questionDraftInput(draft).p_topic_ids, [b.topicId, a.topicId]);
assert.deepEqual(form.selectQuestionTopic([], a), [a.topicId]);
assert.deepEqual(form.selectQuestionTopic([b.topicId], a), [b.topicId, a.topicId]);
assert.throws(() => form.selectQuestionTopic([a.topicId], a));
assert.throws(() => form.selectQuestionTopic([a.topicId.toUpperCase()], a));
assert.throws(() => form.selectQuestionTopic([], historic));
assert.throws(() => form.selectQuestionTopic([], { ...a, topicId: 'bad' }));
const many = Array.from({ length: 100 }, (_, n) => id(n + 10));
assert.deepEqual(form.questionDraftInput({ ...base, topicIds: many }).p_topic_ids, many, 'No artificial selection ceiling');
for (const topicIds of [[a.topicId, a.topicId.toUpperCase()], ['invalid'], null]) {
  const restored = form.parseQuestionDraft(JSON.stringify({ ...base, topicIds }));
  assert.equal(restored.title, base.title); assert.equal(restored.context, base.context);
  assert.equal(restored.topicRestoreError, true); assert.throws(() => form.questionDraftInput(restored));
}
assert.deepEqual(form.parseQuestionDraft('{broken'), form.emptyQuestionDraft());
storage.setItem(form.questionDraftKey(null), JSON.stringify(draft));
session.setItem(form.QUESTION_DRAFT_HANDOFF, 'pending');
assert.deepEqual(form.readQuestionDraft(storage, session, A).draft, draft);
assert.equal(storage.getItem(form.questionDraftKey(null)), null);
assert.equal(session.getItem(form.QUESTION_DRAFT_HANDOFF), null);
assert.deepEqual(form.readQuestionDraft(storage, session, B).draft, form.emptyQuestionDraft());
const anon = { ...draft, title: '另一份登录前草稿' };
storage.setItem(form.questionDraftKey(null), JSON.stringify(anon)); session.setItem(form.QUESTION_DRAFT_HANDOFF, 'pending');
const conflict = form.readQuestionDraft(storage, session, A);
assert.deepEqual(conflict.draft, draft); assert.match(conflict.notice, /未覆盖或合并/);
assert.deepEqual(JSON.parse(storage.getItem(form.questionDraftKey(null))), anon);
const broken = { getItem: () => { throw Error('denied'); }, setItem: () => { throw Error('denied'); }, removeItem: () => { throw Error('denied'); } };
assert.match(form.readQuestionDraft(broken, session, A).notice, /无法/);
const partial = store(), partialSession = store(); partial.setItem(form.questionDraftKey(null), JSON.stringify(draft));
partialSession.setItem(form.QUESTION_DRAFT_HANDOFF, 'pending');
const failCopy = { ...partial, setItem: () => { throw Error('quota'); } };
form.readQuestionDraft(failCopy, partialSession, A);
assert.equal(partialSession.getItem(form.QUESTION_DRAFT_HANDOFF), `viewer:${A}`);
assert.deepEqual(form.readQuestionDraft(partial, partialSession, B).draft, form.emptyQuestionDraft(), 'Partial handoff must not transfer to B');

let tableRows = [], tableError = null, resolveResult = { data: { topic: null } }; const reads = [];
const supabase = {
  from: table => {
    const call = { table, filters: [] }; reads.push(call); const chain = {};
    for (const method of ['select', 'eq', 'order', 'ilike', 'range', 'in']) chain[method] = (...args) => { call.filters.push([method, ...args]); return chain; };
    chain.then = (resolve, reject) => Promise.resolve({ data: tableRows, error: tableError }).then(resolve, reject); return chain;
  },
  rpc: async (name, args) => { reads.push({ name, args }); return resolveResult; },
};
const catalog = loader({ '@/integrations/supabase/client': { supabase } })('src/features/topics/topicCatalog.ts');
const row = t => ({ topic_id: t.topicId, canonical_name: t.canonicalName, status: t.status });
tableRows = [row(a)]; assert.deepEqual((await catalog.readTopicCatalog('', 0)).topics, [a]);
assert.deepEqual(reads[0].filters.slice(0, 4), [['select', 'topic_id,canonical_name,status'], ['eq', 'status', 'active'], ['order', 'canonical_name', { ascending: true }], ['order', 'topic_id', { ascending: true }]]);
tableRows = []; resolveResult = { data: { topic: { ...a, aliases: ['完整别名'] } } };
assert.equal((await catalog.readTopicCatalog('完整别名', 0)).exact.canonicalName, a.canonicalName);
assert.deepEqual(reads.at(-1), { name: 'resolve_canonical_topic_v1', args: { p_term: '完整别名' } });
resolveResult = { data: { topic: null } }; assert.deepEqual(await catalog.readTopicCatalog('未知词', 0), { topics: [], exact: null, nextOffset: undefined });
tableRows = Array.from({ length: 20 }, (_, i) => row(topic(i + 80)));
assert.equal((await catalog.readTopicCatalog('', 80)).nextOffset, 100);
tableRows = [row(historic)]; await assert.rejects(catalog.readTopicCatalog('', 0), /Inactive/);
assert.deepEqual(await catalog.readTopicLabels([historic.topicId]), [historic]);
tableRows = [row(a)]; assert.deepEqual(await catalog.readTopicLabels([a.topicId, b.topicId]), [a], 'Incomplete label read must not invent a label');
let before = reads.length; assert.deepEqual(await catalog.readTopicLabels([]), []); assert.equal(reads.length, before);
tableError = Error('offline'); await assert.rejects(catalog.readTopicCatalog('', 0), /offline/); await assert.rejects(catalog.readTopicLabels([a.topicId]), /offline/); tableError = null;

const nodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = tree => tree == null || typeof tree === 'boolean' ? '' : Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const harness = () => {
  const slots = []; let cursor = 0, effects = []; const cleanups = [];
  const useState = initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next; }]; };
  const react = { ...React, useState, useRef: initial => useState(() => ({ current: initial }))[0], useEffect: effect => { effects.push(effect); } };
  return { react, render: fn => { cursor = 0; effects = []; const tree = fn(); effects.forEach(effect => { const cleanup = effect(); if (cleanup) cleanups.push(cleanup); }); return tree; }, unmount: () => cleanups.forEach(fn => fn()) };
};
const ui = { '@/components/ui/button': { Button: 'Button' }, '@/components/ui/input': { Input: 'Input' }, '@/components/ui/textarea': { Textarea: 'Textarea' }, '@/components/layout/SubPageHeader': { default: 'Header' } };
let selected = [a.topicId, b.topicId], disabled = false, discoveryState = { isError: true }, labelState = { isError: true };
const queryKeys = [], pickerHarness = harness();
const Picker = loader({ ...ui, react: pickerHarness.react, '@/features/topics/topicCatalog': catalog,
  '@tanstack/react-query': { useInfiniteQuery: options => { queryKeys.push(options.queryKey); return discoveryState; }, useQuery: options => { queryKeys.push(options.queryKey); return labelState; } },
})('src/components/question/QuestionTopicPicker.tsx').default;
const picker = viewer => pickerHarness.render(() => Picker({ viewer, topicIds: selected, disabled, onChange: ids => { selected = ids; } }));
let tree = picker(A); assert.match(text(tree), /名称暂不可用/);
nodes(tree).find(node => node.props?.['aria-label']?.startsWith('移除话题')).props.onClick();
assert.deepEqual(selected, [b.topicId], 'Catalog/label error never prevents removal');
tree = picker(A); nodes(tree).find(node => text(node) === '清空话题选择').props.onClick(); assert.deepEqual(selected, []);
discoveryState = { data: { pages: [{ topics: [a, b, historic], exact: null }] } }; labelState = { data: [] };
tree = picker(A); nodes(tree).find(node => node.type === 'Button' && text(node) === a.canonicalName).props.onClick(); assert.deepEqual(selected, [a.topicId]);
tree = picker(A); nodes(tree).find(node => node.type === 'Button' && text(node) === b.canonicalName).props.onClick(); assert.deepEqual(selected, [a.topicId, b.topicId]);
tree = picker(A); assert.equal(nodes(tree).find(node => node.type === 'Button' && text(node) === historic.canonicalName).props.disabled, true);
disabled = true; tree = picker(A); nodes(tree).find(node => node.props?.['aria-label']?.startsWith('移除话题')).props.onClick(); assert.deepEqual(selected, [a.topicId, b.topicId]);
const keyA = [...queryKeys.at(-1)]; picker(B); assert.notDeepEqual(queryKeys.at(-1), keyA);

// Actual composer callbacks -> actual canonical adapter, only transport/storage are isolated doubles.
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
let viewer = A, errorKey = 'TOPIC_INVALID_OR_INACTIVE', pending = false, release, calls = [], navigation = [];
const api = adapter.createQuestionAnswerClient({ viewer: async () => viewer, run: async (name, input) => {
  calls.push({ name, input }); if (release) await new Promise(resolve => { release = resolve; });
  return errorKey === 'NETWORK' ? Promise.reject(Error('lost response')) : errorKey ? { data: null, error: { code: 'PT422', message: errorKey } } : { data: { questionId: Q }, error: null };
} });
const composer = (owner, local = store(), authSession = store()) => {
  globalThis.localStorage = local; globalThis.sessionStorage = authSession;
  const h = harness();
  const Page = loader({ ...ui, react: h.react,
    '@/lib/adapters/questionAnswerV1': adapter, '@/components/question/QuestionTopicPicker': { default: 'Picker' },
    '@/components/question/questionForm': form,
    'react-router-dom': { useNavigate: () => (...args) => navigation.push(args), useLocation: () => ({ pathname: '/new' }) },
    '@/utils/navigation': { buildFromState: () => ({}), navigateBackOr: () => {}, navigateToAuthWithReturn: () => navigation.push('auth') },
    '@/hooks/useQuestionAnswerV1': { useQuestionAnswerViewer: () => ({ viewer: owner, loading: false }), useCreateCanonicalQuestion: scope => ({ isPending: pending, mutateAsync: async input => { pending = true; try { return await api.createQuestion(input, scope); } finally { pending = false; } } }) },
  })('src/pages/NewQuestion.tsx').default;
  const element = Page(), render = () => h.render(() => element.type(element.props)); render();
  return { render, local, authSession, unmount: h.unmount, submit: current => nodes(current).find(node => node.type === 'form').props.onSubmit({ preventDefault() {} }) };
};
const local = store(); local.setItem(form.questionDraftKey(A), JSON.stringify(draft)); local.setItem(form.questionDraftKey(B), JSON.stringify({ ...base, title: 'B only' }));
let c = composer(A, local), t = c.render(); release = true;
const first = c.submit(t); await flush(); await c.submit(t); assert.equal(calls.length, 1, 'Synchronous lock prevents repeated publish');
assert.deepEqual(calls[0], { name: 'create_question_v1', input: form.questionDraftInput(draft) });
const busyTree = c.render(); assert.equal(nodes(busyTree).find(node => node.type === 'Picker').props.disabled, true);
nodes(busyTree).find(node => node.type === 'Picker').props.onChange([]);
release(); release = null; await first; t = c.render();
assert.match(text(t), /所选话题已不可用/); assert.equal(navigation.length, 0);
const retained = form.parseQuestionDraft(local.getItem(form.questionDraftKey(A)));
for (const field of ['title', 'context', 'primaryChannel', 'budgetInput', 'topicIds']) assert.deepEqual(retained[field], draft[field]);
errorKey = null; await c.submit(t); assert.equal(local.getItem(form.questionDraftKey(A)), null);
assert.equal(form.parseQuestionDraft(local.getItem(form.questionDraftKey(B))).title, 'B only');
assert.equal(navigation.at(-1)[0], `/question/${Q}`); before = calls.length; await c.submit(t); assert.equal(calls.length, before);
const zeroStorage = store(); zeroStorage.setItem(form.questionDraftKey(A), JSON.stringify(base)); c = composer(A, zeroStorage); await c.submit(c.render()); assert.deepEqual(calls.at(-1).input.p_topic_ids, []);
errorKey = 'NETWORK'; const failed = store(); failed.setItem(form.questionDraftKey(A), JSON.stringify(draft)); c = composer(A, failed); await c.submit(c.render()); t = c.render();
assert.match(text(t), /上次发布结果尚未确认/); before = calls.length; await c.submit(t); assert.equal(calls.length, before);
c = composer(A, failed); await c.submit(c.render()); assert.equal(calls.length, before, 'Remount cannot automatically repeat ambiguous publish');
assert.deepEqual(form.parseQuestionDraft(failed.getItem(form.questionDraftKey(A))).topicIds, draft.topicIds);
viewer = B; const switched = store(); switched.setItem(form.questionDraftKey(A), JSON.stringify(draft)); c = composer(A, switched); before = calls.length; await c.submit(c.render()); assert.equal(calls.length, before, 'Viewer check blocks A input under B');
viewer = null; const anonStorage = store(), handoffSession = store(); anonStorage.setItem(form.questionDraftKey(null), JSON.stringify(draft)); c = composer(null, anonStorage, handoffSession); before = calls.length; await c.submit(c.render());
assert.equal(calls.length, before); assert.equal(navigation.at(-1), 'auth'); assert.equal(handoffSession.getItem(form.QUESTION_DRAFT_HANDOFF), 'pending');
viewer = A; c = composer(A, anonStorage, handoffSession); t = c.render(); assert.deepEqual(nodes(t).find(node => node.type === 'Picker').props.topicIds, draft.topicIds);
assert.equal(nodes(t).find(node => node.props?.id === 'question-context').props.value, draft.context);
const corruptStorage = store(); corruptStorage.setItem(form.questionDraftKey(A), JSON.stringify({ ...base, topicIds: ['not-uuid'] })); c = composer(A, corruptStorage); before = calls.length; await c.submit(c.render()); assert.equal(calls.length, before);
delete globalThis.localStorage; delete globalThis.sessionStorage;

const pickerSource = read('src/components/question/QuestionTopicPicker.tsx'), catalogSource = read('src/features/topics/topicCatalog.ts');
assert.doesNotMatch(pickerSource + catalogSource, /core-v1\.json|\b79\b|service_role|createClient|useMutation|\/topic\/|\.insert\(|\.update\(|\.upsert\(|\.delete\(|Math\.random/);
assert.match(pickerSource, /readTopicCatalog\(term, pageParam\)/); assert.match(pickerSource, /readTopicLabels\(topicIds\)/);
assert.doesNotMatch(pickerSource, /<form/); // Picker lives inside the real Question form.
assert.match(pickerSource, /event\.preventDefault\(\); search\(\)/);
assert.match(read('src/pages/NewQuestion.tsx'), /<QuestionComposer key=\{viewer \?\? 'anon'\}/);
assert.match(read('src/hooks/useQuestionAnswerV1.ts'), /retry: false/);
checkOwnerTopicScope(/canonical-topic-v1|CANONICAL_TOPIC_V1_RPCS|resolve_canonical_topic_v1|get_experience_topics_v1|set_experience_topics_v1|canonical_topics_v1|canonical_topic_terms_v1|experience_topics_v1|question_topics_v1/);
console.log('PASS: Question Topic Picker: genuine catalog/alias, ordered 0..N transport, V2/handoff/privacy, failure retention, duplicate prevention and scoped consumers (isolated only).');
