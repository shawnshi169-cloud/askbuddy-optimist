import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const app = read('src/App.tsx');
const bottomNav = read('src/components/BottomNav.tsx');
const profile = read('src/pages/Profile.tsx');
const publicPerson = read('src/pages/PublicPerson.tsx');
const myExperiences = read('src/pages/profile/MyExperiences.tsx');
const editor = read('src/pages/ExperienceEditor.tsx');
const card = read('src/components/experience/PersonExperienceCard.tsx');
const transitionManager = read('src/components/experience/ExperienceTransitionManager.tsx');
const experienceApi = read('src/features/experience/experienceApi.ts');
const experienceHooks = read('src/features/experience/usePersonExperiences.ts');
const newUi = [publicPerson, myExperiences, editor, card, transitionManager].join('\n');
const experienceDataLayer = [experienceApi, experienceHooks].join('\n');

assert.match(app, /path="\/person\/:userId"/);
assert.match(app, /path="\/profile\/experiences"/);
assert.match(app, /path="\/experience\/new"/);
assert.match(app, /path="\/experience\/:experienceId\/edit"/);

for (const rpcName of [
  'get_public_person_profile_v1',
  'get_public_person_experiences_v1',
  'get_my_person_experiences_v1',
  'create_person_experience_v1',
  'update_person_experience_v1',
  'set_person_experience_visibility_v1',
  'reorder_person_experiences_v1',
  'delete_person_experience_v1',
  'create_experience_transition_v1',
  'update_experience_transition_v1',
  'delete_experience_transition_v1',
]) {
  assert.match(experienceApi, new RegExp(`CLIENT_RPC_WHITELIST\\.${rpcName}`));
}

assert.match(experienceApi, /parseGetPublicPersonProfileV1Result/);
assert.match(experienceApi, /parseGetPublicPersonExperiencesV1Result/);
assert.match(experienceApi, /parseGetMyPersonExperiencesV1Result/);
assert.doesNotMatch(experienceDataLayer, /\.from\(['"](?:person_experiences|experience_transitions|experience_claims|experts|skill_offers)['"]\)/);

for (const claimRpc of [
  'create_experience_claim_v1',
  'update_experience_claim_v1',
  'delete_experience_claim_v1',
]) {
  assert.doesNotMatch(newUi, new RegExp(claimRpc));
  assert.doesNotMatch(experienceDataLayer, new RegExp(`CLIENT_RPC_WHITELIST\\.${claimRpc}`));
}

assert.doesNotMatch(newUi, /专家|达人|已认证专家|发布技能服务|服务次数|好评率|匹配度/);
assert.doesNotMatch(newUi, /\bclaims\b|\bphone\b|\bdeletedAt\b/);
assert.doesNotMatch(newUi, /\/expert(?:-profile)?\//);

assert.match(bottomNav, />我有问题</);
assert.match(bottomNav, />我有经验 \/ 技能</);
assert.match(bottomNav, /navigate\('\/experience\/new'/);
assert.doesNotMatch(bottomNav, /navigate\('\/skill-publish'/);

assert.match(profile, /查看我的主页/);
assert.match(profile, /\/profile\/experiences/);
assert.doesNotMatch(profile, /我的收益|我的社群|达人认证|积分/);
assert.match(app, /path="\/skill-publish"/);
assert.match(app, /path="\/expert\/:id"/);
assert.match(app, /path="\/expert-profile\/:id"/);

assert.match(experienceHooks, /while \(true\)/);
assert.match(experienceHooks, /page\.page\.hasMore/);
assert.match(experienceHooks, /onError:[\s\S]*context\?\.previous/);
assert.match(editor, /person-experience-draft-v1:/);
assert.match(editor, /swipeBackDisabled/);
assert.match(editor, /p_visibility: form\.visibility/);
assert.match(transitionManager, /useCreateExperienceTransition/);
assert.match(card, /experience\.visibility/);

console.log('EC-1B Person + Experience UI guard passed.');
