import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

const root = resolve(import.meta.dirname, '..');
const load = (file, imports = {}) => {
  const source = readFileSync(resolve(root, file), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    assert.ok(name in imports, `Unexpected test dependency: ${name}`);
    return imports[name];
  }, exports);
  return exports;
};

const cache = load('src/features/experience/experienceCache.ts');
const form = load('src/components/experience/experienceForm.ts');
const personA = '11111111-1111-4111-8111-111111111111';
const personB = '22222222-2222-4222-8222-222222222222';
const keyA = cache.personExperienceQueryKeys.myExperiences(personA);
const keyB = cache.personExperienceQueryKeys.myExperiences(personB);
assert.notDeepEqual(keyA, keyB, 'Different canonical Persons must never share owner cache keys');
assert.throws(() => cache.bindOwnerOperation(undefined, {}), /identity required/);

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
const submissions = [];
let ownerPage = { personId: personA, experiences: [], page: { hasMore: false, limit: 100, offset: 0 } };
const api = Object.fromEntries([
  'createExperienceTransitionV1', 'createPersonExperienceV1', 'deleteExperienceTransitionV1',
  'deletePersonExperienceV1', 'getPublicPersonExperiencesV1', 'getPublicPersonProfileV1',
  'reorderPersonExperiencesV1', 'setPersonExperienceVisibilityV1',
  'updateExperienceTransitionV1', 'updatePersonExperienceV1',
].map((name) => [name, async () => 'saved']));
api.getMyPersonExperiencesV1 = async () => ownerPage;
const hooks = load('src/features/experience/usePersonExperiences.ts', {
  './experienceCache': cache,
  './experienceApi': api,
  '@tanstack/react-query': {
    useQuery: (options) => options,
    useInfiniteQuery: (options) => options,
    useQueryClient: () => queryClient,
    // Capture actual callbacks/variables, then complete them after an account switch below.
    useMutation: (options) => ({
      isPending: false,
      mutateAsync: async (variables) => { submissions.push({ options, variables }); },
    }),
  },
});

const absent = hooks.useMyPersonExperiences(undefined);
assert.equal(absent.enabled, false);
assert.throws(absent.queryFn, /identity required/);
assert.deepEqual(hooks.useMyPersonExperiences(personA).queryKey, keyA);
assert.deepEqual(hooks.useMyPersonExperiences(personB).queryKey, keyB);
assert.equal(hooks.useMyPersonExperiences(personA, false).enabled, false);
assert.equal((await hooks.useMyPersonExperiences(personA).queryFn()).personId, personA);
ownerPage = { ...ownerPage, personId: personB };
await assert.rejects(hooks.useMyPersonExperiences(personA).queryFn, /identity mismatch/);

const originalA = { personId: personA, experiences: [{ experienceId: 'a1' }, { experienceId: 'a2' }] };
const originalB = { personId: personB, experiences: [{ experienceId: 'b1' }] };
const publicA = cache.personExperienceQueryKeys.publicExperiences(personA);
const publicB = cache.personExperienceQueryKeys.publicExperiences(personB);
const seed = () => {
  queryClient.clear();
  queryClient.setQueryData(keyA, originalA);
  assert.equal(queryClient.getQueryData(keyB), undefined, 'B must not receive cached private Experiences from A');
  queryClient.setQueryData(keyB, originalB);
  queryClient.setQueryData(publicA, []);
  queryClient.setQueryData(publicB, []);
};

for (const [name, input] of [
  ['useCreatePersonExperience', {}], ['useUpdatePersonExperience', {}],
  ['useSetPersonExperienceVisibility', { experienceId: 'a1', visibility: 'private' }],
  ['useReorderPersonExperiences', ['a2', 'a1']], ['useDeletePersonExperience', 'a1'],
  ['useCreateExperienceTransition', {}], ['useUpdateExperienceTransition', {}],
  ['useDeleteExperienceTransition', 't1'],
]) {
  seed();
  const submissionCount = submissions.length;
  assert.throws(() => hooks[name](undefined).mutateAsync(input), /identity required/, name);
  assert.equal(submissions.length, submissionCount, `${name} must reject before dispatch without a Person`);
  await hooks[name](personA).mutateAsync(input);
  const { options, variables } = submissions.at(-1);
  assert.equal(variables.personId, personA);
  const context = await options.onMutate?.(variables);
  hooks[name](personB);
  const result = await options.mutationFn(variables);
  await options.onSuccess?.(result, variables, context);
  await options.onSettled?.(result, null, variables, context);
  assert.equal(queryClient.getQueryState(keyA).isInvalidated, true, name);
  assert.equal(queryClient.getQueryState(publicA).isInvalidated, true, name);
  assert.equal(queryClient.getQueryState(keyB).isInvalidated, false, name);
  assert.equal(queryClient.getQueryState(publicB).isInvalidated, false, name);
  assert.deepEqual(queryClient.getQueryData(keyB), originalB, name);
}

seed();
await hooks.useReorderPersonExperiences(personA).mutateAsync(['a2', 'a1']);
const { options, variables } = submissions.at(-1);
const context = await options.onMutate(variables);
assert.deepEqual(queryClient.getQueryData(keyA).experiences.map((item) => item.experienceId), ['a2', 'a1']);
hooks.useReorderPersonExperiences(personB);
await options.onError(new Error('test-only failure'), variables, context);
assert.deepEqual(queryClient.getQueryData(keyA), originalA, 'Rollback belongs to the original Person');
assert.deepEqual(queryClient.getQueryData(keyB), originalB);
queryClient.clear();

const existing = { city: '上海', cityCode: '310000', title: 'unchanged story' };
assert.equal(form.cityCodeForSubmit(form.withEditedCity(existing, '上海')), '310000');
const changed = form.withEditedCity(existing, '北京');
assert.equal(changed.cityCode, '');
assert.equal(form.cityCodeForSubmit(changed), null);
assert.equal(changed.title, existing.title);
assert.equal(form.cityCodeForSubmit(form.withEditedCity(existing, '')), null);
assert.equal(form.cityCodeForSubmit(form.withEditedCity(changed, '上海')), null, 'Do not infer a code when text is changed back');
console.log('EC-1B owner cache isolation and city integrity checks passed.');
