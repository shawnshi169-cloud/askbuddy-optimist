import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const messages = read('src/hooks/useMessages.ts');
const legacyReadGateIndex = messages.indexOf("!isRuntimeCapabilityAllowed('legacyReadFallback')");
const messageTableFallbackIndex = messages.indexOf(".from('messages')");
assert.ok(legacyReadGateIndex >= 0, 'Messages legacy read fallback must use the canonical runtime capability');
assert.ok(
  messageTableFallbackIndex > legacyReadGateIndex,
  'Messages must check legacyReadFallback before reading the messages table',
);

const topics = read('src/hooks/useHotTopics.ts');
const topicDetailStart = topics.indexOf('export const useTopicDetail');
const topicDetailEnd = topics.indexOf('export const useCreateDiscussion', topicDetailStart);
const topicDetail = topics.slice(topicDetailStart, topicDetailEnd >= 0 ? topicDetailEnd : undefined);
assert.match(topicDetail, /\.eq\('is_hidden', false\)/);
assert.match(topicDetail, /if \(discussionsResult\.error\) throw discussionsResult\.error/);
assert.equal(
  [...topicDetail.matchAll(/\.from\('topic_discussions'\)/g)].length,
  1,
  'Topic Detail must not retry without the canonical visibility filter',
);
assert.doesNotMatch(topicDetail, /fallbackResult/);

const profileData = read('src/hooks/useProfileData.ts');
for (const resultName of ['ordersRes', 'answersRes', 'favoritesRes', 'followingRes']) {
  assert.match(
    profileData,
    new RegExp(`if \\(${resultName}\\.error\\) throw ${resultName}\\.error`),
    `Profile stats must propagate ${resultName}.error`,
  );
}
assert.match(profileData, /orders: ordersRes\.count \?\? 0/);
assert.match(profileData, /answers: answersRes\.count \?\? 0/);
assert.match(profileData, /favorites: favoritesRes\.count \?\? 0/);
assert.match(profileData, /following: followingRes\.count \?\? 0/);

const adapters = read('src/lib/adapters/contentAdapters.ts');
assert.doesNotMatch(adapters, /consultationPrice[^\n]*50/);
assert.doesNotMatch(adapters, /new Date\(\)\.toISOString\(\)/);
assert.doesNotMatch(adapters, /randomuser\.me/);
assert.match(adapters, /consultationPrice: number \| null/);
assert.match(adapters, /createdAt: string \| null/);
assert.match(adapters, /avatar: string \| null/);

const baseline = JSON.parse(read('scripts/typecheck-baseline.json'));
assert.deepEqual(baseline, {}, 'TypeScript baseline must remain empty');

const navbar = read('src/components/Navbar.tsx');
assert.match(navbar, /location: locationLabel/);
assert.match(navbar, /const routerLocation = useLocation\(\)/);
assert.doesNotMatch(navbar, /const location = useLocation\(\)/);

const pageContracts = read('packages/shared-api/src/page-contract-map.ts');
const messagesContract = pageContracts.match(/pageId: "messages"[\s\S]*?\n  },/)?.[0] || '';
assert.match(messagesContract, /fallback:legacyReadFallback:table:messages/);
assert.match(messagesContract, /unavailable in production\/unknown runtime/);

console.log('UI-0a engineering readiness guards passed.');
