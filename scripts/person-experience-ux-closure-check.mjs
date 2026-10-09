import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { QueryClient } from '@tanstack/react-query';

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const load = (file, dependencies = {}) => {
  const { outputText } = ts.transpileModule(read(file), { fileName: file, compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React,
  } });
  const exports = {};
  new Function('require', 'exports', outputText)((name) => {
    assert.ok(name in dependencies, `Unexpected dependency ${name}`);
    return dependencies[name];
  }, exports);
  return exports;
};
const profileSource = read('src/pages/EditProfile.tsx');
const editorSource = read('src/pages/ExperienceEditor.tsx');
const publicSource = read('src/pages/PublicPerson.tsx');
const cardSource = read('src/components/experience/PersonExperienceCard.tsx');
assert.doesNotMatch(profileSource, /educationList|workList|privacySettings|selectedTopics|recommendedTopics|已认证|北京大学|阿里巴巴/);
assert.doesNotMatch(profileSource, /\b(?:school|industry|phone|gender|city_code|is_verified|is_expert)\b/);
assert.match(cardSource, /ownerMode \? '我可以分享' : 'TA愿意分享'/);
assert.doesNotMatch(cardSource, /可以和TA聊/);
assert.doesNotMatch(publicSource, /contributionSummary|answerCount|postCount|useMyPersonExperiences/);
assert.match(publicSource, /usePublicPersonExperiences\(personId, Boolean\(person\)\)/);
assert.match(publicSource, /isSelf \? '我的经历' : 'TA的经历'/);
assert.match(read('src/pages/profile/MyExperiences.tsx'), /navigate\(`\/person\/\$\{user\.id\}`/);
assert.match(editorSource, /transitionDirty \|\| transitionBusy \|\| saving/);
assert.match(editorSource, /onBusyChange=\{setTransitionBusy\}/);
assert.doesNotMatch(editorSource, /setTimeout/);
assert.match(editorSource, /draftSaved \?/);
assert.match(editorSource, /经历类型（必填）/);
assert.match(editorSource, /swipeBackDisabled = hasUnsavedChanges \|\| saving \|\| transitionBusy/);
assert.match(read('src/hooks/useEditorExit.ts'), /beforeunload/);
assert.match(editorSource, /var\(--safe-area-inset-bottom, env\(safe-area-inset-bottom\)\)/);
const bootstrap = read('src/main.tsx');
assert.ok(bootstrap.indexOf('initializeEditorHistoryGuard(window)') < bootstrap.indexOf('createRoot(document'), 'History guard must register before HashRouter');

const draft = load('src/components/experience/experienceDraft.ts');
const storage = new Map();
const localStorage = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
};
assert.equal(draft.persistExperienceDraft(localStorage, 'owner-a', '{"title":"test-only"}'), true);
assert.equal(localStorage.getItem('owner-a'), '{"title":"test-only"}');
assert.equal(localStorage.getItem('owner-b'), null);
assert.equal(draft.persistExperienceDraft({ setItem: () => { throw Error('quota'); } }, 'owner-a', '{}'), false);
assert.equal(draft.persistExperienceDraft(localStorage, 'owner-a', null), true);
assert.equal(localStorage.getItem('owner-a'), null);

const { installEditorHistoryGuard } = load('src/utils/editorHistoryGuard.ts');
let popHandler;
let blocked = true;
let proceed;
const movements = [];
const host = {
  history: { state: { idx: 4 }, go: (delta) => movements.push(delta) },
  addEventListener: (name, handler, capture) => { assert.equal(name, 'popstate'); assert.equal(capture, true); popHandler = handler; },
  removeEventListener: (_, handler, capture) => { assert.equal(handler, popHandler); assert.equal(capture, true); popHandler = null; },
};
const dispose = installEditorHistoryGuard(host, () => blocked, (callback) => { proceed = callback; });
const pop = (idx) => { let stopped = false; popHandler({ state: { idx }, stopImmediatePropagation: () => { stopped = true; } }); return stopped; };
assert.equal(pop(3), true);
assert.deepEqual(movements, [1]);
assert.equal(proceed, undefined, 'Do not ask until editor entry is restored');
assert.equal(pop(4), true);
assert.equal(typeof proceed, 'function');
// Cancel means remaining on the editor, with no second navigation.
assert.deepEqual(movements, [1]);
assert.equal(pop(2), true); // Browser history menu may jump multiple entries.
assert.equal(pop(4), true);
proceed();
assert.deepEqual(movements, [1, 2, -2]);
assert.equal(pop(2), false, 'Confirmed POP must reach HashRouter');
dispose();
assert.equal(pop(3), false, 'Unmount must release the editor; the bootstrap listener stays inert');
blocked = false;
const cleanDispose = installEditorHistoryGuard(host, () => blocked, () => assert.fail('Clean editor must not prompt'));
assert.equal(pop(3), false);
cleanDispose();

const cache = load('src/features/experience/experienceCache.ts');
const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } });
const personA = '11111111-1111-4111-8111-111111111111';
const personB = '22222222-2222-4222-8222-222222222222';
client.setQueryData(cache.personExperienceQueryKeys.publicProfile(personA), {});
client.setQueryData(cache.personExperienceQueryKeys.publicProfile(personB), {});
const invalidations = [];
const profileHooks = load('src/hooks/useProfile.ts', {
  '@tanstack/react-query': { useMutation: (options) => options, useQueryClient: () => ({ invalidateQueries: async (options) => { invalidations.push(options); return client.invalidateQueries(options); } }) },
  '@/features/experience/experienceCache': cache,
  '@/integrations/supabase/client': { supabase: {} },
  '@/contexts/AuthContext': { useAuth: () => ({ user: { id: personA }, refreshProfile: async () => {} }) },
  '@/hooks/use-toast': { useToast: () => ({ toast: () => {} }) },
});
await profileHooks.useUpdateProfile().onSuccess({ user_id: personA });
assert.deepEqual(invalidations[0], { queryKey: cache.personExperienceQueryKeys.publicProfile(personA), exact: true, refetchType: 'all' });
assert.equal(client.getQueryState(cache.personExperienceQueryKeys.publicProfile(personA)).isInvalidated, true);
assert.equal(client.getQueryState(cache.personExperienceQueryKeys.publicProfile(personB)).isInvalidated, false);
client.clear();

// Execute actual component callbacks with a tiny deterministic hook harness.
// These are isolated unit inputs, never application fixtures or database rows.
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const harness = () => {
  const slots = []; let cursor = 0; let effects = [];
  const useState = (initial) => { const index = cursor++; if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial; return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }]; };
  const useRef = (initial) => { const [ref] = useState(() => ({ current: initial })); return ref; };
  const react = { ...React, useState, useRef, useEffect: (callback) => effects.push(callback), useMemo: (callback) => callback() };
  return { react: { ...react, default: react }, render: (component) => { cursor = 0; effects = []; const tree = component(); const current = effects; effects = []; current.forEach((effect) => effect()); return tree; } };
};
const nodes = (tree) => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = (tree) => tree == null || typeof tree === 'boolean' ? '' : Array.isArray(tree) ? tree.map(text).join('') : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const common = {};
for (const [path, names] of Object.entries({
  '@/components/ui/avatar': ['Avatar', 'AvatarFallback', 'AvatarImage'],
  '@/components/ui/button': ['Button'], '@/components/ui/input': ['Input'], '@/components/ui/textarea': ['Textarea'], '@/components/ui/label': ['Label'], '@/components/ui/skeleton': ['Skeleton'],
  '@/components/ui/alert-dialog': ['AlertDialog', 'AlertDialogAction', 'AlertDialogCancel', 'AlertDialogContent', 'AlertDialogDescription', 'AlertDialogFooter', 'AlertDialogHeader', 'AlertDialogTitle'],
  '@/components/ui/select': ['Select', 'SelectContent', 'SelectItem', 'SelectTrigger', 'SelectValue'], '@/components/ui/switch': ['Switch'],
  'lucide-react': ['Loader2', 'Building2', 'GraduationCap', 'MapPin', 'UserRound'],
})) common[path] = Object.fromEntries(names.map((name) => [name, name]));
for (const [path, name] of Object.entries({ '@/components/layout/SubPageHeader': 'Header', '@/components/common/PageStateCard': 'State', '@/components/experience/PersonExperienceCard': 'ExperienceCard', '@/components/experience/ExperienceTransitionManager': 'TransitionManager' })) common[path] = { default: name };
let navigations = [];
const navigation = { navigateBackOr: () => navigations.push('back'), navigateToAuthWithReturn: () => navigations.push('auth'), buildFromState: () => ({}) };
let saveFails = true;
let savedPayload;
const profileHarness = harness();
const profileModule = load('src/pages/EditProfile.tsx', {
  ...common, react: profileHarness.react,
  'react-router-dom': { useNavigate: () => () => navigations.push('route'), useLocation: () => ({ pathname: '/edit-profile' }) },
  '@/contexts/AuthContext': { useAuth: () => ({ user: { id: personA }, profile: { nickname: '', bio: '', city: '', avatar_url: '', cover_url: '' }, loading: false }) },
  '@/hooks/useProfile': { useUpdateProfile: () => ({ isPending: false, mutateAsync: async (payload) => { savedPayload = payload; if (saveFails) throw Error('test'); } }), useUploadAvatar: () => ({}), useUploadCover: () => ({}) },
  '@/hooks/useEditorExit': { useEditorExit: () => ({ open: false, requestExit: (action) => action() }) },
  '@/utils/navigation': navigation,
});
const profileForm = profileModule.default().type;
profileHarness.render(profileForm);
let tree = profileHarness.render(profileForm);
nodes(tree).find((n) => n.props?.id === 'profile-bio').props.onChange({ target: { value: 'unsaved test input' } });
tree = profileHarness.render(profileForm);
nodes(tree).find((n) => n.type === 'Button').props.onClick();
await flush();
tree = profileHarness.render(profileForm);
assert.deepEqual(navigations, []);
assert.match(text(tree), /资料暂时无法保存/);
assert.equal(nodes(tree).find((n) => n.props?.id === 'profile-bio').props.value, 'unsaved test input');
saveFails = false;
nodes(tree).find((n) => n.type === 'Button').props.onClick();
await flush();
assert.deepEqual(navigations, ['back']);
assert.deepEqual(Object.keys(savedPayload).sort(), ['avatar_url', 'bio', 'city', 'cover_url', 'nickname']);

const publicHarness = harness();
let viewer = personA;
let experienceState = { isError: true, data: undefined };
const publicModule = load('src/pages/PublicPerson.tsx', {
  ...common, react: publicHarness.react,
  'react-router-dom': { useNavigate: () => () => {}, useLocation: () => ({}), useParams: () => ({ userId: personA }) },
  '@/contexts/AuthContext': { useAuth: () => ({ user: { id: viewer } }) },
  '@/features/experience': { usePublicPersonProfile: () => ({ data: { person: { userId: personA } } }), usePublicPersonExperiences: () => experienceState },
  '@/utils/navigation': navigation,
});
tree = publicHarness.render(publicModule.default);
assert.match(text(tree), /暂时无法加载公开经历/);
experienceState = { isError: true, isFetchNextPageError: true, hasNextPage: true, data: { pages: [{ experiences: [{ experienceId: 'test-only-id' }] }] } };
tree = publicHarness.render(publicModule.default);
assert.equal(nodes(tree).filter((n) => n.type === 'ExperienceCard').length, 1);
assert.match(text(tree), /重试加载更多/);
assert.doesNotMatch(text(tree), /暂时无法加载公开经历/);
experienceState = { data: { pages: [{ experiences: [] }] } };
tree = publicHarness.render(publicModule.default);
assert.match(text(tree), /我的经历/);
assert.match(text(tree), /你还没有公开经历/);
viewer = personB;
tree = publicHarness.render(publicModule.default);
assert.match(text(tree), /TA的经历/);
assert.doesNotMatch(text(tree), /管理我的经历/);

console.log('Person / Experience UX closure checks passed: profile save/cache, history, draft persistence, public pagination and visibility boundary.');

const experienceHarness = harness();
let writes = 0;
let exitOptions;
const experience = {
  experienceId: 'unit-experience', personId: personA, title: 'unit title', description: 'unit description', kind: 'work',
  timeRange: { startYear: null, startMonth: null, endYear: null, endMonth: null, isCurrent: false },
  canShare: [], visibility: 'private', sortOrder: 0, transitions: [],
};
const kinds = load('packages/shared-types/src/experience-v1.ts');
const editorModule = load('src/pages/ExperienceEditor.tsx', {
  ...common, react: experienceHarness.react,
  'react-router-dom': { useNavigate: () => () => navigations.push('editor-route'), useLocation: () => ({}), useParams: () => ({ experienceId: 'unit-experience' }) },
  '@/contexts/AuthContext': { useAuth: () => ({ user: { id: personA }, loading: false }) },
  '@/features/experience': {
    useMyPersonExperiences: () => ({ isSuccess: true, data: { experiences: [experience] } }),
    useCreatePersonExperience: () => ({ isPending: false, mutateAsync: async () => { writes++; } }),
    useUpdatePersonExperience: () => ({ isPending: false, mutateAsync: async () => { writes++; } }),
  },
  '@/components/experience/experiencePresentation': { EXPERIENCE_KIND_LABELS: {} },
  '@/components/experience/experienceForm': load('src/components/experience/experienceForm.ts'),
  '@/components/experience/experienceDraft': draft,
  '@/hooks/use-toast': { useToast: () => ({ toast: () => {} }) },
  '@/hooks/useEditorExit': { useEditorExit: (options) => { exitOptions = options; return { open: false, requestExit: () => {} }; } },
  '@/utils/navigation': navigation,
  '../../packages/shared-types/src/experience-v1': kinds,
});
globalThis.document = { body: { dataset: {} } };
const editorForm = editorModule.default().type;
experienceHarness.render(editorForm);
tree = experienceHarness.render(editorForm);
const transition = nodes(tree).find((n) => n.type === 'TransitionManager');
transition.props.onDirtyChange(true);
tree = experienceHarness.render(editorForm);
assert.equal(exitOptions.dirty, true);
const saveButton = nodes(tree).find((n) => n.type === 'Button' && text(n).includes('保存修改'));
assert.equal(saveButton.props.disabled, true);
navigations = [];
saveButton.props.onClick();
await flush();
assert.equal(writes, 0);
assert.deepEqual(navigations, []);
transition.props.onDirtyChange(false);
transition.props.onBusyChange(true);
tree = experienceHarness.render(editorForm);
assert.equal(exitOptions.busy, true);
assert.equal(nodes(tree).find((n) => n.type === 'Button' && text(n).includes('保存修改')).props.disabled, true);
transition.props.onBusyChange(false);
tree = experienceHarness.render(editorForm);
nodes(tree).find((n) => n.type === 'Button' && text(n).includes('保存修改')).props.onClick();
await flush();
assert.equal(writes, 1);
assert.deepEqual(navigations, ['editor-route']);
delete globalThis.document;
console.log('Experience main-save/Transition dirty and pending callbacks passed.');
