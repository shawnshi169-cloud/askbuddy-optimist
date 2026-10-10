import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';
import { QueryClient } from '@tanstack/react-query';
import { withTopicLocalContract } from './lib/topic-local-contract.mjs';
import { checkOwnerTopicScope, ownerTopicFiles } from './lib/experience-topic-owner-scope.mjs';

const read = (file) => readFileSync(file, 'utf8');
const load = (file, deps = {}) => {
  const { outputText } = ts.transpileModule(read(file), { fileName: file, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => { assert.ok(name in deps, `Unexpected import ${name}`); return deps[name]; }, exports);
  return exports;
};
const model = load('src/features/experience/topics/topicSelection.ts');
const personA = '11111111-1111-4111-8111-111111111111';
const personB = '22222222-2222-4222-8222-222222222222';
const experienceId = '33333333-3333-4333-8333-333333333333';
const id = (n) => `44444444-4444-4444-8444-${n.toString(16).padStart(12, '0')}`;
const a = { topicId: id(1), canonicalName: '测试真实名称', status: 'active' };
const b = { topicId: id(2), canonicalName: '历史名称', status: 'deprecated' };
const row = (topic) => ({ topic_id: topic.topicId, canonical_name: topic.canonicalName, status: topic.status });
assert.notDeepEqual(model.ownerTopicKeys.associations(personA, experienceId), model.ownerTopicKeys.associations(personB, experienceId));
assert.notDeepEqual(model.ownerTopicKeys.draft(personA, experienceId), model.ownerTopicKeys.draft(personB, experienceId));
let selected = model.restoreTopicSelection([a, b]);
assert.equal(model.selectionDirty(selected), false);
assert.deepEqual(selected.selected, [a, b], 'Historical association restored by default');
selected = model.toggleTopic(selected, b);
assert.equal(model.selectionDirty(selected), true);
assert.deepEqual(model.toggleTopic(selected, b), selected, 'Removed deprecated entry cannot be added');
selected = model.toggleTopic(selected, a);
assert.deepEqual(selected.selected, [], 'Zero topics is a valid desired state');
assert.deepEqual(model.toggleTopic(selected, a).selected, [a]);

await withTopicLocalContract(async (_qa, _question, contracts) => {
  for (const [name, input] of Object.entries({
    resolve_canonical_topic_v1: { p_term: '完整别名' },
    get_experience_topics_v1: { p_experience_id: experienceId },
    set_experience_topics_v1: { p_experience_id: experienceId, p_topic_ids: [] },
  })) {
    const contract = contracts.CANONICAL_TOPIC_V1_RPCS[name];
    assert.deepEqual(contract.parseParams(input), input);
    assert.throws(() => contract.parseParams({ ...input, unapproved: true }), `${name}: reject extra arguments`);
    for (const key of Object.keys(input)) {
      const missing = { ...input }; delete missing[key];
      assert.throws(() => contract.parseParams(missing), `${name}: reject missing ${key}`);
      assert.throws(() => contract.parseParams({ ...input, [key]: null }), `${name}: reject null ${key}`);
    }
  }
  let viewer = personA;
  const calls = [];
  let tableResults = [];
  let rpcResults = [];
  const supabase = {
    auth: { getSession: async () => ({ data: { session: { user: { id: viewer } } }, error: null }) },
    from: (table) => {
      const call = { table, filters: [] }; calls.push(call);
      const chain = {};
      for (const method of ['select', 'eq', 'order', 'range', 'ilike', 'in']) chain[method] = (...args) => { call.filters.push([method, ...args]); return chain; };
      chain.then = (resolve, reject) => Promise.resolve(tableResults.shift() ?? { data: [], error: null }).then(resolve, reject);
      return chain;
    },
    rpc: async (name, params) => { calls.push({ name, params }); return rpcResults.shift() ?? { data: null, error: null }; },
  };
  const api = load('src/features/experience/topics/topicApi.ts', {
    zod: { z }, '@/integrations/supabase/client': { supabase },
    '../../../../packages/shared-api/src/canonical-topic-v1': contracts,
  });
  tableResults = [{ data: [row(a)] }];
  rpcResults = [{ data: { topic: { ...a, aliases: ['完整别名'] } } }];
  let page = await api.readTopicCatalog('完整别名', 0);
  assert.equal(page.exact.canonicalName, a.canonicalName, 'Alias must display canonical name, not query text');
  assert.deepEqual(calls[0].filters.slice(0, 4), [
    ['select', 'topic_id,canonical_name,status'], ['eq', 'status', 'active'],
    ['order', 'canonical_name', { ascending: true }], ['order', 'topic_id', { ascending: true }],
  ]);
  assert.equal(calls[1].name, 'resolve_canonical_topic_v1');
  tableResults = [{ data: [] }]; rpcResults = [{ data: { topic: null } }];
  page = await api.readTopicCatalog('不存在', 0);
  assert.deepEqual(page.topics, []); assert.equal(page.exact, null);
  tableResults = [{ data: Array.from({ length: 20 }, (_, index) => row({ ...a, topicId: id(index + 80) })) }];
  page = await api.readTopicCatalog('', 80);
  assert.equal(page.nextOffset, 100, 'Catalog has no Core Seed ceiling');
  assert.deepEqual(calls.at(-1).filters.at(-1), ['range', 80, 99]);
  tableResults = [{ data: null, error: Error('network') }];
  await assert.rejects(api.readTopicCatalog('', 0), /network/);
  tableResults = [{ data: [row(b)] }];
  await assert.rejects(api.readTopicCatalog('', 0), /Inactive/);
  rpcResults = [{ data: { experience: { experienceId, topicIds: [a.topicId, b.topicId] } } }];
  tableResults = [{ data: [row(b), row(a)] }];
  assert.deepEqual(await api.readLinkedTopics(personA, experienceId), [a, b]);
  assert.ok(!calls.at(-1).filters.some(([method]) => method === 'eq'), 'Historical label lookup must not filter to active');
  rpcResults = [{ data: { experience: null } }];
  await assert.rejects(api.readLinkedTopics(personA, experienceId), { code: 'PT404' });
  rpcResults = [{ data: { experience: { experienceId, topicIds: [b.topicId] } } }]; tableResults = [{ data: [] }];
  await assert.rejects(api.readLinkedTopics(personA, experienceId), /label unavailable/);
  for (const ids of [[a.topicId, a.topicId], ['invalid'], [a.topicId, a.topicId.toUpperCase()]]) {
    const count = calls.length;
    await assert.rejects(api.saveLinkedTopics(personA, experienceId, ids));
    assert.equal(calls.length, count, 'Invalid/duplicate inputs never reach RPC');
  }
  for (const ids of [[], [a.topicId, b.topicId], [b.topicId, a.topicId]]) {
    rpcResults = [{ data: { experienceId, topicIds: [...ids].sort() } }];
    const result = await api.saveLinkedTopics(personA, experienceId, ids);
    assert.deepEqual(calls.at(-1).params.p_topic_ids, ids, 'Preserve complete desired input; server owns output ordering');
    assert.deepEqual(result.topicIds, [...ids].sort());
  }
  rpcResults = [{ data: { experienceId, topicIds: [b.topicId, a.topicId] } }];
  await assert.rejects(api.saveLinkedTopics(personA, experienceId, [a.topicId, b.topicId]));
  rpcResults = [{ data: null, error: { code: 'PT422', message: 'TOPIC_INVALID_OR_INACTIVE' } }];
  await assert.rejects(api.saveLinkedTopics(personA, experienceId, [a.topicId]), { code: 'PT422' });
  assert.match(api.topicErrorCopy({ code: 'PT422', message: 'TOPIC_INVALID_OR_INACTIVE' }), /选择已保留/);
  assert.match(api.topicErrorCopy({ code: 'PT404', message: 'TARGET_NOT_FOUND_OR_INACCESSIBLE' }), /无权访问/);
  assert.doesNotMatch(api.topicErrorCopy({ message: 'SQL permission error' }), /SQL|permission/);
  viewer = personB;
  const count = calls.length;
  await assert.rejects(api.readLinkedTopics(personA, experienceId), /OWNER_CHANGED/);
  await assert.rejects(api.saveLinkedTopics(personA, experienceId, []), /OWNER_CHANGED/);
  assert.equal(calls.length, count, 'Changed viewer cannot send an old owner operation');
});

// Execute the actual hook callbacks, with a real QueryClient and isolated persistence doubles.
const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
let associationState = { isSuccess: true, isFetching: false, data: [a, b] };
let failWrite = true;
let failRead = false;
let writes = [];
let reads = [];
let releaseWrite;
const hookHarness = () => {
  const slots = []; let cursor = 0;
  const state = (initial) => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], (next) => { slots[i] = next; }]; };
  const queryOptions = [];
  const hooks = load('src/features/experience/topics/useOwnerExperienceTopics.ts', {
    react: { useState: state, useRef: (initial) => state({ current: initial })[0] },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useQuery: (options) => { queryOptions.push(options); return options.queryKey[0] === 'owner-experience-topic-draft'
        ? { data: client.getQueryData(options.queryKey) } : associationState; },
      useInfiniteQuery: (options) => { queryOptions.push(options); return { data: { pages: [{ topics: [a], exact: a }] } }; },
      useMutation: (options) => ({ mutateAsync: options.mutationFn }),
    },
    './topicSelection': model,
    './topicApi': {
      readLinkedTopics: async (person, experience) => { reads.push([person, experience]); if (failRead) throw Error('read'); return [a]; },
      readTopicCatalog: async () => { throw Error('Not needed by hook harness'); },
      saveLinkedTopics: async (person, experience, ids) => {
        writes.push([person, experience, ids]);
        if (failWrite) throw Error('PT422 test-only');
        if (releaseWrite) await new Promise((resolve) => { releaseWrite = resolve; });
        return { experienceId: experience, topicIds: [...ids].sort() };
      },
      topicErrorCopy: () => '选择已保留',
    },
  });
  return { render: (person = personA, enabled = true) => { cursor = 0; return hooks.useOwnerExperienceTopics(person, experienceId, enabled); }, queryOptions };
};
const harness = hookHarness();
let view = harness.render();
assert.deepEqual(view.selection.selected, [a, b]);
view.change(b);
view = harness.render();
assert.equal(view.dirty, true);
await view.save();
view = harness.render();
assert.deepEqual(view.selection.selected, [a], 'Write failure retains draft');
assert.match(view.notice, /选择已保留/);
associationState = { isSuccess: false, isError: true, data: undefined };
view = harness.render();
assert.equal(view.ready, false);
const before = writes.length;
view.discard(); await view.save();
assert.equal(writes.length, before, 'Failed initial read never permits silent clearing');
assert.deepEqual(view.selection.selected, [a]);
associationState = { isSuccess: true, data: [a, b], isFetching: false };
const other = hookHarness().render(personB);
assert.equal(other.dirty, false, 'A draft cannot become B selection');
assert.deepEqual(hookHarness().render(personA).selection.selected, [a], 'Return to A restores A unsaved choice');
view = harness.render(); failWrite = false; releaseWrite = true;
const pending = view.save();
view = harness.render(); assert.equal(view.busy, true);
const pendingSelection = view.selection;
view.change(a); view.discard(); await view.save();
assert.deepEqual(harness.render().selection, pendingSelection, 'Pending write blocks conflicting actions');
let releaseOldRead;
let oldReadCancelled = false;
const oldRead = client.fetchQuery({
  queryKey: model.ownerTopicKeys.associations(personA, experienceId),
  queryFn: () => new Promise((resolve) => { releaseOldRead = resolve; }),
}).catch(() => { oldReadCancelled = true; });
releaseWrite(); await pending; releaseWrite = null;
await oldRead;
assert.equal(oldReadCancelled, true, 'A pre-write background read must not be reused as the post-save refresh');
releaseOldRead([b]);
await Promise.resolve();
assert.deepEqual(client.getQueryData(model.ownerTopicKeys.associations(personA, experienceId)), [a]);
assert.equal(harness.render().busy, false);
assert.equal(reads.length, 1, 'Always refetch owner association after write success');
assert.deepEqual(reads[0], [personA, experienceId]);
assert.equal(client.getQueryData(model.ownerTopicKeys.draft(personA, experienceId)), null);
assert.equal(client.getQueryData(model.ownerTopicKeys.draft(personB, experienceId)), undefined);
associationState = { isSuccess: true, data: [a], isFetching: false };
view = harness.render(); view.change(a); view = harness.render(); failRead = true;
await view.save(); view = harness.render();
assert.match(view.notice, /已保存.*无法读取/, 'Refresh error must not misreport an already committed write');
assert.equal(client.getQueryData(model.ownerTopicKeys.draft(personA, experienceId)), null);
view = harness.render(); view.change(a); view = harness.render();
associationState = { isSuccess: true, data: [a, b], isFetching: false };
view = harness.render(); assert.equal(view.conflict, true);
const priorWrites = writes.length; await view.save(); assert.equal(writes.length, priorWrites);
view.discard(); assert.equal(harness.render().dirty, false);
assert.equal(harness.render(personA, false).ready, false);
assert.equal(harness.queryOptions.at(-3).enabled, false);
client.clear();

const apiSource = read('src/features/experience/topics/topicApi.ts');
assert.doesNotMatch(apiSource, /\.select\(['"]\*['"]\)|\.insert\(|\.update\(|\.upsert\(|\.delete\(|\b79\b|core-v1\.json|createClient/);
assert.match(apiSource, /\.range\(offset, offset \+ TOPIC_PAGE_SIZE - 1\)/);
for (const rpc of ['resolve_canonical_topic_v1', 'get_experience_topics_v1', 'set_experience_topics_v1']) {
  assert.match(apiSource, new RegExp(`CANONICAL_TOPIC_V1_RPCS\\.${rpc}`));
  assert.ok(apiSource.includes(`Database['public']['Functions']['${rpc}']['Args']`));
}
assert.equal((apiSource.match(/contract\.parseParams/g) ?? []).length, 3);
assert.equal((apiSource.match(/contract\.parseResult/g) ?? []).length, 3);
const editor = read('src/pages/ExperienceEditor.tsx');
assert.match(editor, /hasUnsavedChanges = formDirty \|\| transitionDirty \|\| topicDirty/);
assert.match(editor, /busy: saving \|\| transitionBusy \|\| topicBusy/);
assert.match(editor, /if \(topicDirty \|\| topicBusy\) \{[\s\S]*?return;/);
assert.doesNotMatch(editor, /saveLinkedTopics|set_experience_topics_v1/);
assert.match(read('src/components/experience/ExperienceTopicManager.tsx'), /保存话题关联/);
assert.match(read('src/components/experience/ExperienceTopicManager.tsx'), /user\?\.id === personId/);
for (const file of ownerTopicFiles) assert.doesNotMatch(read(file), /core-v1\.json|\b79\b|canShare|create_person_experience|Transition.*mutate|service_role/);
checkOwnerTopicScope(/canonical-topic-v1|CANONICAL_TOPIC_V1_RPCS|resolve_canonical_topic_v1|get_experience_topics_v1|set_experience_topics_v1|canonical_topics_v1|canonical_topic_terms_v1|experience_topics_v1|question_topics_v1/);
console.log('PASS: Experience Owner Topic linking: strict RPCs, active pagination, aliases, historical links, independent save, errors, scoped drafts/cache and closed consumer boundaries.');
