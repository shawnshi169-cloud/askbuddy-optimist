const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const appConfig = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'));

const coverage = {
  home: ['city-chip', 'home-bell', 'category-grid', 'topic-scroll', 'home-segmented', 'expert-list'],
  search: ['search-box', 'result-tabs', 'question-result', 'expert-result', 'skill-result', 'post-result'],
  ask: ['publish-tip', 'form-card', 'ask-action-bar'],
  discover: ['discover-tabs', 'composer-card', 'post-list', 'post-detail-sheet'],
  messages: ['message-tabs', 'conversation-list', 'notification-list', 'call-entry'],
  profile: ['identity-card', 'session-strip', 'stats-card', 'common-grid', 'help-card'],
  'question-detail': ['asker-strip', 'question-body-card', 'answers-card', 'answer-editor-sheet'],
  channel: ['channel-search', 'featured-card', 'subcategory-scroll', 'channel-segmented', 'channel-fab'],
  'topic-detail': ['topic-hero', 'article-card', 'discussion-card', 'topic-action-bar'],
  'city-selector': ['city-search', 'city-segmented', 'city-grid'],
  'expert-detail': ['expert-hero', 'expert-stats', 'service-card', 'expert-actions'],
  'skill-publish': ['form-card', 'category-options', 'fixed-action-bar'],
  'chat-detail': ['chat-header', 'chat-scroll', 'chat-composer'],
  'profile-section': ['section-intro', 'section-list', 'draft-list', 'contract-tip'],
  'post-editor': ['post-editor-header', 'editor-card', 'media-preview-grid', 'fixed-action-bar'],
  'discover-interactions': ['interaction-summary', 'interaction-card', 'interaction-note'],
  call: ['call-mode-switch', 'call-avatar-shell', 'session-card', 'call-actions']
};

const expectedRoutes = Object.keys(coverage).map((page) => `pages/${page}/index`);
assert.deepEqual(appConfig.pages, expectedRoutes, 'app.json must register the complete 17-page route set');

for (const [page, markers] of Object.entries(coverage)) {
  const pageRoot = path.join(root, 'pages', page);
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    assert.equal(fs.existsSync(path.join(pageRoot, `index.${extension}`)), true, `${page} missing index.${extension}`);
  }

  const wxml = fs.readFileSync(path.join(pageRoot, 'index.wxml'), 'utf8');
  for (const marker of markers) {
    assert.match(wxml, new RegExp(marker), `${page} missing visual section ${marker}`);
  }

  const controller = fs.readFileSync(path.join(pageRoot, 'index.js'), 'utf8');
  assert.doesNotMatch(controller, /utils\/ui-catalog|utils\/call\/service/, `${page} imports legacy UI/business services`);
  assert.doesNotMatch(controller, /wx\.login|getUserProfile/, `${page} bypasses the Auth v1 adapter`);
}

const tabBarController = fs.readFileSync(path.join(root, 'custom-tab-bar/index.js'), 'utf8');
for (const label of ['首页', '发现', '发布', '消息', '我的']) {
  assert.match(tabBarController, new RegExp(`text: '${label}'`), `custom tab bar missing ${label}`);
}

const projectConfig = JSON.parse(fs.readFileSync(path.join(root, 'project.config.json'), 'utf8'));
assert.equal(projectConfig.appid, 'touristappid', 'UI reconciliation must not import the real UAT AppID');

global.wx = {
  getWindowInfo: () => ({ windowWidth: 375, statusBarHeight: 44 }),
  getMenuButtonBoundingClientRect: () => ({ left: 278, right: 365, top: 48, height: 32 })
};
const navigation = require('../utils/navigation');
const navLayout = navigation.getNavigationLayout();
assert.equal(navLayout.headerHeight, 88, 'custom header must include status bar and navigation bar heights');
assert.match(navLayout.headerStyle, /padding-top:44px/, 'custom header must reserve the status bar explicitly');
assert.match(navLayout.headerStyle, /padding-right:107px/, 'custom header must reserve the WeChat capsule');
delete global.wx;

process.stdout.write('PASS complete 17-page visual route coverage\n');
process.stdout.write('PASS page controllers preserve Auth/runtime safety boundaries\n');
process.stdout.write('PASS custom tab bar visual coverage\n');
process.stdout.write('PASS custom header safe area and capsule spacing\n');
process.stdout.write('PASS project config remains touristappid\n');
