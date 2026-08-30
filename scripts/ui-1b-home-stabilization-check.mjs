import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import ts from 'typescript';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

const coreSource = read('src/hooks/pageScrollMemoryCore.ts');
const transpiledCore = ts.transpileModule(coreSource, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const coreUrl = `data:text/javascript;base64,${Buffer.from(transpiledCore.outputText).toString('base64')}`;
const core = await import(coreUrl);

let state = core.createScrollMemoryState(0);
state = core.reduceScrollMemoryState(state, { type: 'scroll', y: 762 });
assert.equal(state.y, 762, 'a non-zero Home position must be retained');

state = core.reduceScrollMemoryState(state, { type: 'deactivate' });
state = core.reduceScrollMemoryState(state, { type: 'scroll', y: 0 });
assert.equal(state.y, 762, 'a route-transition scroll after deactivation must not overwrite Home memory');

state = core.reduceScrollMemoryState(state, { type: 'tab-reselect' });
assert.equal(state.y, 0, 'Home tab reselect must reset scroll memory to zero');

state = core.createScrollMemoryState(420);
state = core.reduceScrollMemoryState(state, { type: 'scroll', y: 0 });
assert.equal(state.y, 0, 'an intentional user scroll to the top must remain a valid saved position');

assert.equal(core.parseStoredScrollY('0'), 0);
assert.equal(core.parseStoredScrollY('762'), 762);
assert.equal(core.parseStoredScrollY('invalid'), null);
assert.equal(core.getScrollRestoreDecision({
  targetY: 762,
  scrollHeight: 2200,
  viewportHeight: 844,
  attempt: 1,
  interrupted: false,
}), 'restore', 'route return restores once the document can carry the saved target');
assert.equal(core.getScrollRestoreDecision({
  targetY: 762,
  scrollHeight: 1000,
  viewportHeight: 844,
  attempt: 1,
  interrupted: false,
}), 'retry', 'restore waits for asynchronous Home content height');
assert.equal(core.getScrollRestoreDecision({
  targetY: 762,
  scrollHeight: 2200,
  viewportHeight: 844,
  attempt: 1,
  interrupted: true,
}), 'stop', 'user interaction cancels pending restoration');

const categorySection = read('src/components/CategorySection.tsx');
assert.match(categorySection, /PRODUCT_CHANNEL_CATALOG/);
assert.match(categorySection, /'education-learning':[\s\S]{0,100}route: '\/education'/);
assert.match(categorySection, /'career-development':[\s\S]{0,100}route: '\/career'/);
assert.match(categorySection, /'lifestyle-services':[\s\S]{0,100}route: '\/lifestyle'/);
assert.match(categorySection, /'hobbies-skills':[\s\S]{0,100}route: '\/hobbies'/);
assert.doesNotMatch(categorySection, /useCategories|public\.categories|skill_categories/);

const channelFeed = read('src/hooks/useChannelFeed.ts');
assert.match(channelFeed, /channel: ProductChannelSlug/);
assert.match(channelFeed, /satisfies GetChannelFeedParams/);
assert.doesNotMatch(channelFeed, /channel: 'education-learning' \|/);
assert.doesNotMatch(channelFeed, /\.from\(['"]skill_categories['"]\)/);
assert.match(channelFeed, /throw rpcResult\.error/);

const scrollHook = read('src/hooks/usePageScrollMemory.ts');
assert.match(scrollHook, /useLayoutEffect/);
assert.match(scrollHook, /history\.scrollRestoration = 'manual'/);
assert.match(scrollHook, /getScrollRestoreDecision/);
assert.match(scrollHook, /requestAnimationFrame\(restoreScroll\)/);
assert.match(scrollHook, /prepareForNavigationRef/);
assert.match(scrollHook, /removeEventListener\('scroll', onScroll\)/);
assert.doesNotMatch(scrollHook, /setTimeout|console\.(?:log|info|debug)/);

const home = read('src/pages/Index.tsx');
assert.match(home, /initialScrollY > 28/);
assert.match(home, /if \(isRestoringScroll\) return/);
assert.match(home, /<CategorySection variant="home" onBeforeNavigate=\{prepareForNavigation\}/);
assert.match(home, /onClickCapture=\{prepareForNavigation\}[\s\S]{0,120}<QuestionCard/);
assert.match(home, /<BottomNav onBeforeNavigate=\{prepareForNavigation\}/);

console.log('UI-1B Home stabilization checks passed.');
