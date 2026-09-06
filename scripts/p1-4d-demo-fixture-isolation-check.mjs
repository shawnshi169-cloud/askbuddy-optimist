import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const collectSourceFiles = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(path);
    return ['.ts', '.tsx'].includes(extname(entry.name)) ? [path] : [];
  });

const runtimeCore = read('src/config/runtimeModeCore.ts');
const transpiledRuntime = ts.transpileModule(runtimeCore, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const runtimeUrl = `data:text/javascript;base64,${Buffer.from(transpiledRuntime.outputText).toString('base64')}`;
const runtime = await import(runtimeUrl);

assert.equal(runtime.isPresentationFixtureAllowedForMode('development', true), true);
assert.equal(runtime.isPresentationFixtureAllowedForMode('development', false), false);
assert.equal(runtime.isPresentationFixtureAllowedForMode('staging', true), false);
assert.equal(runtime.isPresentationFixtureAllowedForMode('production', true), false);
assert.equal(
  runtime.isPresentationFixtureAllowedForMode(runtime.resolveRuntimeMode('trial'), true),
  false,
);
assert.equal(
  runtime.isPresentationFixtureAllowedForMode(runtime.resolveRuntimeMode('release'), true),
  false,
);
assert.equal(
  runtime.isPresentationFixtureAllowedForMode(runtime.resolveRuntimeMode(undefined), true),
  false,
);

const runtimeClient = read('src/config/runtimeMode.ts');
assert.match(runtimeClient, /VITE_PRESENTATION_FIXTURES === "true"/);
assert.match(runtimeClient, /isPresentationFixtureAllowedForMode/);
assert.match(read('.env.example'), /VITE_PRESENTATION_FIXTURES="false"/);
assert.match(read('docs/runtime-mode-governance.md'), /isPresentationFixtureAllowed\(\)/);

for (const file of collectSourceFiles(join(root, 'src'))) {
  const source = readFileSync(file, 'utf8');
  if (!source.includes("from '@/lib/demoData'")) continue;
  assert.match(
    source,
    /isPresentationFixtureAllowed/,
    `${file} consumes demoData without the canonical presentation fixture gate`,
  );
}

const home = read('src/pages/Index.tsx');
assert.match(home, /const experts = presentationFixturesEnabled/);
assert.match(home, /const homepageQuestions = presentationFixturesEnabled/);
assert.match(home, /presentationFixturesEnabled \? \(/);
assert.match(home, /title="热榜暂时为空"/);

const categories = read('src/components/CategorySection.tsx');
assert.match(categories, /PRODUCT_CHANNEL_CATALOG/);
assert.doesNotMatch(categories, /presentationCategoryFixtures|useCategories|public\.categories/);

const search = read('src/hooks/useSearch.ts');
assert.match(search, /const demoMatchedQuestions = presentationFixturesEnabled \? demoQuestions/);
assert.match(search, /const demoMatchedUsers = presentationFixturesEnabled \? demoExperts/);
assert.match(search, /const demoMatchedPosts = presentationFixturesEnabled \? demoTopics/);
assert.match(search, /!isRuntimeCapabilityAllowed\('legacyReadFallback'\)/);

const searchPage = read('src/pages/SearchResults.tsx');
assert.match(searchPage, /presentationFixturesEnabled[\s\S]{0,120}popularSearchTerms/);
assert.match(searchPage, /presentationFixturesEnabled[\s\S]{0,180}demoQuestions/);

const channelHook = read('src/hooks/useChannelFeed.ts');
assert.match(channelHook, /presentationFixturesEnabled[\s\S]{0,180}buildPresentationFixtureFeed/);
assert.match(channelHook, /throw rpcResult\.error/);
for (const page of [
  'CareerDevelopment',
  'EducationLearning',
  'HobbiesSkills',
  'LifestyleServices',
]) {
  const source = read(`src/pages/${page}.tsx`);
  assert.doesNotMatch(source, /demoData|allExperts|fallbackExperts|fallbackQuestions/);
  assert.match(source, /const filteredExperts = feed\?\.experts \|\| \[\]/);
  assert.match(source, /const filteredQuestions = feed\?\.questions \|\| \[\]/);
}

const messages = read('src/pages/Messages.tsx');
assert.match(messages, /const allConversations = presentationFixturesEnabled/);
assert.match(messages, /: realConversations/);

const discover = read('src/pages/Discover.tsx');
assert.doesNotMatch(discover, /demoData|demoPosts|mockPosts|samplePosts/);
assert.match(discover, /const presentationTopicFixtures =/);
assert.match(
  discover,
  /topicChips=\{presentationFixturesEnabled \? presentationTopicFixtures/,
);
assert.doesNotMatch(discover, /topicChips=\{plazaTopics/);
const interactions = read('src/pages/DiscoverInteractions.tsx');
assert.match(interactions, /presentationFixturesEnabled[\s\S]{0,180}realInteractions\.length === 0/);
assert.doesNotMatch(interactions, /const usingDemo = realInteractions\.length === 0/);

const topics = read('src/hooks/useHotTopics.ts');
assert.match(topics, /if \(error\)[\s\S]{0,160}isPresentationFixtureAllowed\(\)[\s\S]{0,100}throw error/);
assert.match(topics, /topicId\.startsWith\('demo-topic-'\)[\s\S]{0,220}isPresentationFixtureAllowed\(\)/);
assert.doesNotMatch(topics, /if \(fallbackResult\.error\) return \[\]/);

// Canonical detail no longer consumes presentation fixtures at all.
assert.doesNotMatch(read('src/pages/QuestionDetail.tsx'), /demoData|demoQuestion|fixture|fallbackResult/);
for (const path of [
  'src/pages/ExpertProfile.tsx',
  'src/pages/ExpertDetail.tsx',
  'src/pages/ChatDetail.tsx',
]) {
  const source = read(path);
  assert.match(source, /requestedDemo\w+ && !presentationFixturesEnabled/);
}

const community = read('src/pages/profile/MyCommunity.tsx');
const communityChat = read('src/pages/profile/CommunityChat.tsx');
assert.match(community, /if \(!presentationFixturesEnabled\) return \[\]/);
assert.match(community, /presentationFixturesEnabled && isLoading/);
assert.match(community, /presentationFixturesEnabled && error/);
assert.match(communityChat, /if \(!presentationFixturesEnabled\)[\s\S]{0,240}社群聊天暂未开放/);

const pageContracts = read('packages/shared-api/src/page-contract-map.ts');
for (const pageId of ['home', 'search', 'discover', 'messages', 'channel', 'topic-detail']) {
  const entry = pageContracts.match(new RegExp(`pageId: "${pageId}"[\\s\\S]*?\\n  },`))?.[0] || '';
  assert.match(entry, /fixture:development-only/);
  assert.match(entry, /Production|production/);
}

console.log('P1.4d demo fixture isolation guards passed.');
