import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';
import React from 'react';
import * as jsx from 'react/jsx-runtime';
import { QueryClient, queryOptions } from '@tanstack/react-query';
import { withTopicLocalContract } from './lib/topic-local-contract.mjs';
import { checkOwnerTopicScope, publicTopicFiles } from './lib/experience-topic-owner-scope.mjs';

const read = (file) => readFileSync(file, 'utf8');
const load = (file, deps = {}) => {
  const { outputText } = ts.transpileModule(read(file), { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX,
  } });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    if (name === 'react/jsx-runtime') return jsx;
    assert.ok(name in deps, `Unexpected import ${name}`); return deps[name];
  }, exports);
  return exports;
};
const personA = '11111111-1111-4111-8111-111111111111';
const personB = '22222222-2222-4222-8222-222222222222';
const experienceId = '33333333-3333-4333-8333-333333333333';
const id = (n) => `44444444-4444-4444-8444-${n.toString(16).padStart(12, '0')}`;
const experience = { experienceId, personId: personA, visibility: 'public', title: '真实经历',
  description: '经历正文', timeRange: {}, location: null, canShare: ['分享内容'], transitions: [] };
const a = { topicId: id(1), canonicalName: '本地隔离测试名称', status: 'active' };
const b = { topicId: id(2), canonicalName: '历史名称', status: 'deprecated' };
const row = (topic) => ({ topic_id: topic.topicId, canonical_name: topic.canonicalName, status: topic.status });
const response = (topicIds) => ({ data: { experience: { experienceId, topicIds } } });
const signal = () => new AbortController().signal;

await withTopicLocalContract(async (_qa, _questions, contracts) => {
  let viewer = null;
  let rpcResult;
  let rows = [];
  let afterRpc = () => {};
  const calls = [];
  const supabase = {
    auth: { getSession: async () => ({ data: { session: viewer ? { user: { id: viewer } } : null } }) },
    rpc: (name, args) => ({ abortSignal: async (abort) => {
      abort.throwIfAborted(); calls.push({ name, args, viewer }); const result = rpcResult; afterRpc(); return result;
    } }),
    from: (table) => {
      const call = { table, filters: [] }; calls.push(call);
      const chain = {};
      for (const method of ['select', 'in']) chain[method] = (...args) => { call.filters.push([method, ...args]); return chain; };
      chain.abortSignal = async (abort) => { abort.throwIfAborted(); return { data: rows }; };
      return chain;
    },
  };
  const api = load('src/features/experience/topics/publicTopicApi.ts', {
    zod: { z }, '@/integrations/supabase/client': { supabase },
    '../../../../packages/shared-api/src/canonical-topic-v1': contracts,
  });
  for (const caller of [null, personA, personB]) {
    viewer = caller; rpcResult = response([a.topicId, b.topicId]); rows = [row(b), row(a)];
    assert.deepEqual(await api.readPublicExperienceTopics(experience, caller, signal()), [a, b]);
    assert.equal(calls.at(-2).viewer, caller, 'Authenticated caller must never be forced anonymous');
    assert.deepEqual(calls.at(-1).filters, [['select', 'topic_id,canonical_name,status'], ['in', 'topic_id', [a.topicId, b.topicId]]]);
  }
  rpcResult = response([a.topicId]); rows = [row(a)];
  assert.deepEqual(await api.readPublicExperienceTopics(experience, viewer, signal()), [a]);
  for (const result of [response([]), { data: { experience: null } }]) {
    rpcResult = result; const count = calls.length;
    assert.deepEqual(await api.readPublicExperienceTopics(experience, viewer, signal()), result.data.experience ? [] : null);
    assert.equal(calls.length, count + 1, 'No labels for zero or inaccessible associations');
  }
  let count = calls.length;
  await assert.rejects(api.readPublicExperienceTopics({ ...experience, visibility: 'private' }, viewer, signal()), /Public Experience required/);
  assert.equal(calls.length, count, 'An owner-private row never starts the public projection');
  for (const result of [response([b.topicId, a.topicId]), response([a.topicId, a.topicId]), response(['bad']),
    { data: { experience: { experienceId: id(7), topicIds: [] } } }, { data: { experience: null, extra: true } }]) {
    rpcResult = result; count = calls.length;
    await assert.rejects(api.readPublicExperienceTopics(experience, viewer, signal()));
    assert.equal(calls.length, count + 1, 'Malformed RPC result rejected before label fetch');
  }
  for (const labels of [[], [row({ ...a, topicId: id(99) })], [row(a), row(a)], [{ ...row(a), extra: 'private' }]]) {
    rpcResult = response([a.topicId]); rows = labels;
    await assert.rejects(api.readPublicExperienceTopics(experience, viewer, signal()));
  }
  rpcResult = { data: null, error: Error('network') };
  await assert.rejects(api.readPublicExperienceTopics(experience, viewer, signal()), /network/);
  viewer = personA; count = calls.length;
  await assert.rejects(api.readPublicExperienceTopics(experience, null, signal()), /VIEWER_CHANGED/);
  assert.equal(calls.length, count, 'Queued old viewer cannot execute under a new session');
  rpcResult = response([a.topicId]); afterRpc = () => { viewer = personB; }; count = calls.length;
  await assert.rejects(api.readPublicExperienceTopics(experience, personA, signal()), /VIEWER_CHANGED/);
  assert.equal(calls.length, count + 1, 'Account switch prevents label disclosure and old-key cache result');
  const aborted = new AbortController(); aborted.abort(); count = calls.length;
  await assert.rejects(api.readPublicExperienceTopics(experience, personB, aborted.signal));
  assert.equal(calls.length, count);
  assert.ok(calls.every((call) => call.name === 'get_experience_topics_v1' || call.table === 'canonical_topics_v1'));
});

let readCount = 0;
let release;
const cache = load('src/features/experience/topics/publicTopicQuery.ts', {
  '@tanstack/react-query': { queryOptions },
  './publicTopicApi': { readPublicExperienceTopics: async () => {
    readCount++; if (release) await new Promise((resolve) => { release = resolve; }); return [a];
  } },
});
const keys = cache.publicTopicKeys;
assert.notDeepEqual(keys.viewer(experienceId, personA), keys.viewer(experienceId, personB));
assert.notDeepEqual(keys.viewer(experienceId, null), keys.viewer(experienceId, personA));
assert.notEqual(keys.viewer(experienceId, personA)[0], 'owner-experience-topics');
const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
release = true;
const options = cache.publicTopicQueryOptions(experience, null);
const one = client.fetchQuery(options), duplicate = client.fetchQuery(options);
await Promise.resolve(); await Promise.resolve();
assert.equal(readCount, 1, 'Same canonical identity + viewer deduplicates concurrent reads');
release(); await one; await duplicate; release = null;
await client.fetchQuery(options); assert.equal(readCount, 1, 'Fresh projection uses cache');
for (const viewer of [personA, personB]) client.setQueryData(keys.viewer(experienceId, viewer), [b]);
client.setQueryData(keys.viewer('other', personA), [b]);
client.setQueryData(['owner-experience-topic-draft', personA, experienceId], { selected: [b] });
await cache.refreshPublicTopicProjection(client, experienceId);
for (const viewer of [null, personA, personB]) assert.equal(client.getQueryState(keys.viewer(experienceId, viewer)).isInvalidated, true);
assert.equal(client.getQueryState(keys.viewer('other', personA)).isInvalidated, false);
assert.deepEqual(client.getQueryData(['owner-experience-topic-draft', personA, experienceId]), { selected: [b] });
client.clear();

const schedule = cache.createPublicTopicReadQueue();
const releases = []; let active = 0, maximum = 0, starts = 0;
const controllers = Array.from({ length: 10 }, () => new AbortController());
const jobs = controllers.map((controller) => schedule(async () => {
  starts++; active++; maximum = Math.max(active, maximum);
  await new Promise((resolve) => releases.push(resolve)); active--;
}, controller.signal).catch((error) => { assert.equal(error.name, 'AbortError'); }));
await Promise.resolve(); assert.equal(starts, 3);
controllers[7].abort();
while (starts < 9 || releases.length) {
  releases.splice(0).forEach((resolve) => resolve());
  for (let i = 0; i < 8; i++) await Promise.resolve();
}
await Promise.all(jobs);
assert.equal(maximum, 3); assert.equal(starts, 9, 'Unmount cancels queued card without spending a read');

// Render actual local presentation without a browser or business fixtures in application code.
let result = {}, queryConfig, effect;
const topicComponent = load('src/components/experience/PublicExperienceTopics.tsx', {
  react: { useRef: () => ({ current: {} }), useState: () => [true, () => {}], useEffect: (fn) => { effect = fn; } },
  '@tanstack/react-query': { useQuery: (config) => { queryConfig = config; return result; } },
  '@/contexts/AuthContext': { useAuth: () => ({ user: null, loading: false }) },
  '@/features/experience/topics/publicTopicQuery': cache,
}).default;
const nodes = (node) => !node || typeof node !== 'object' ? [] : [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
const text = (node) => typeof node === 'string' ? node : !node || typeof node !== 'object' ? '' : React.Children.toArray(node.props?.children).map(text).join('');
result = { data: [a, b] };
let tree = topicComponent({ experience });
assert.match(text(tree), /相关话题.*本地隔离测试名称.*历史名称.*历史关联/);
assert.equal(queryConfig.enabled, true);
assert.ok(!nodes(tree).some((node) => node.type === 'a' || node.type === 'button'));
assert.ok(nodes(tree).filter((node) => node.type === 'li').every((node) => node.props.className.includes('[overflow-wrap:anywhere]')));
let observed = false, disconnected = false;
globalThis.IntersectionObserver = class {
  constructor(callback, options) { this.callback = callback; assert.equal(options.rootMargin, '120px'); }
  observe() { observed = true; this.callback([{ isIntersecting: true }]); }
  disconnect() { disconnected = true; }
};
const dispose = effect(); assert.ok(observed && disconnected); dispose(); delete globalThis.IntersectionObserver;
for (const data of [[], null]) {
  result = { data }; tree = topicComponent({ experience });
  assert.equal(nodes(tree).some((node) => node.type === 'section'), false); assert.equal(text(tree), '');
}
let retried = false;
result = { data: [a], isError: true, refetch: () => { retried = true; } };
tree = topicComponent({ experience });
assert.doesNotMatch(text(tree), /本地隔离测试名称/); assert.match(text(tree), /暂时无法加载/);
nodes(tree).find((node) => node.type === 'button').props.onClick(); assert.equal(retried, true);
result = { data: [a], isFetching: true };
assert.doesNotMatch(text(topicComponent({ experience })), /本地隔离测试名称/, 'No stale projection while rechecking visibility');
const card = load('src/components/experience/PersonExperienceCard.tsx', {
  react: React, 'lucide-react': { Eye: 'eye', ArrowUp: 'arrow-up', ArrowDown: 'arrow-down' }, '@/lib/utils': { cn: (...args) => args.filter(Boolean).join(' ') },
  '@/components/ui/dropdown-menu': {}, './ExperienceTransitionPath': {},
  './experiencePresentation': { EXPERIENCE_KIND_LABELS: {}, formatExperienceTimeRange: () => null },
}).default;
const sentinel = React.createElement('public-topics-sentinel');
assert.ok(nodes(card({ experience, publicTopics: sentinel })).some((node) => node.type === 'public-topics-sentinel'));
assert.ok(!nodes(card({ experience, ownerMode: true, reorderMode: true, publicTopics: sentinel })).some((node) => node.type === 'public-topics-sentinel'));
assert.match(text(card({ experience, publicTopics: tree })), /经历正文.*TA愿意分享.*关联话题暂时无法加载/);

for (const file of publicTopicFiles) assert.doesNotMatch(read(file), /\.select\(['"]\*['"]\)|core-v1\.json|\b79\b|service_role|createClient|verified|matchScore|canShare|set_experience_topics_v1|\/topic\//);
assert.match(read('src/features/experience/topics/publicTopicApi.ts'), /contract\.parseParams[\s\S]*contract\.parseResult/);
const person = read('src/pages/PublicPerson.tsx');
assert.match(person, /pages\.flatMap/); assert.match(person, /fetchNextPage\(\)/);
assert.match(read('src/features/experience/topics/useOwnerExperienceTopics.ts'), /refreshPublicTopicProjection\(client, experienceId\)/);
checkOwnerTopicScope(/canonical-topic-v1|CANONICAL_TOPIC_V1_RPCS|resolve_canonical_topic_v1|get_experience_topics_v1|set_experience_topics_v1|canonical_topics_v1|canonical_topic_terms_v1|experience_topics_v1|question_topics_v1/);
console.log('PASS: public Topic visibility/caller isolation, strict real labels/history, local UI states, dedupe/bounded reads, owner-save refresh and closed scope.');
