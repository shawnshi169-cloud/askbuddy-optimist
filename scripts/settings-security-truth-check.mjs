import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const load = (path, dependencies = {}) => {
  const { outputText } = ts.transpileModule(read(path), {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, {
    module, exports: module.exports,
    require: (name) => {
      assert.ok(Object.hasOwn(dependencies, name), `Unreviewed settings dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: path });
  return module.exports;
};
const navigation = load('src/utils/navigation.ts');
const runtime = load('src/config/runtimeModeCore.ts');
const nodes = (tree) => tree == null || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = (tree) => tree == null || typeof tree === 'boolean' ? ''
  : Array.isArray(tree) ? tree.map(text).join('')
    : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const normalized = (tree) => text(tree).replace(/\s+/g, ' ').trim();

// Actual page components/callbacks run without data clients, storage, timers or network.
// UI primitives are tree markers; browser semantics/visuals are verified separately.
let viewer = null;
let loading = false;
let location;
let navigations = [];
const auth = {
  get user() { return viewer; },
  get loading() { return loading; },
  get profile() { assert.fail('Security settings must not consume potentially stale private profile state'); },
  get session() { assert.fail('No session or device facts are authorized on these pages'); },
};
const dependencies = {
  react: { ...React, default: React },
  'react-router-dom': {
    useNavigate: () => (...args) => navigations.push(args),
    useLocation: () => location,
  },
  '@/contexts/AuthContext': { useAuth: () => auth },
  '@/components/ui/card': { Card: 'Card', CardContent: 'CardContent' },
  '@/components/ui/button': { Button: 'Button' },
  '@/components/layout/SubPageHeader': { default: 'Header' },
  '@/utils/navigation': navigation,
};
const specs = [
  { name: 'PrivacySettings', route: '/settings/privacy', title: '隐私设置', target: '/profile/experiences',
    anonymous: '登录后管理经历可见性', signedIn: '管理经历可见性',
    headings: ['资料与互动隐私设置暂不可用', '单条经历的可见性'] },
  { name: 'AccountSecurity', route: '/settings/account', title: '账号与安全', target: '/settings/change-password',
    anonymous: '登录后修改密码', signedIn: '修改密码',
    headings: ['登录密码', '暂不可用的账号功能', '账号注销暂不可用'] },
  { name: 'BlacklistSettings', route: '/settings/blacklist', title: '黑名单管理',
    headings: ['黑名单功能暂不可用'] },
  { name: 'LoginActivity', route: '/settings/login-activity', title: '登录活动',
    headings: ['登录设备记录暂不可用'] },
];
const approvedParagraphs = {
  PrivacySettings: [
    '目前不提供个人主页、教育背景、工作资料或话题的可见性开关，也不提供关注、私信、活动与在线状态、已读回执或社交推荐控制。',
    '此前保存的偏好不代表这些限制已经生效。本页不会更改或删除这些历史偏好。',
    '你可以在「我的经历」中，将自己的一条经历设为公开或私密。这只影响该条经历，不会改变整个个人主页的可见性。',
  ],
  AccountSecurity: [
    '登录后可前往密码修改页面设置新密码。',
    '本页暂不展示手机号或第三方账号绑定状态，也不提供绑定管理和账号找回设置。',
    '当前没有可用的账号注销功能，无法在本页删除账号或数据。',
  ],
  BlacklistSettings: [
    '当前未提供可核实的黑名单和屏蔽管理能力。本页不展示用户列表，也不能屏蔽用户或解除屏蔽。',
    '这不表示你的黑名单为空。',
  ],
  LoginActivity: [
    '当前无法在这里查看真实登录设备、地点或时间，也不能通过本页退出其他设备。',
    '本页不提供账号安全检查结果。',
  ],
};

for (const spec of specs) {
  const path = `src/pages/settings/${spec.name}.tsx`;
  const source = read(path);
  assert.doesNotMatch(source, /useState|useEffect|useUserSettings|useSavePrivacySettings|useToast|localStorage|sessionStorage|\bfetch\b|supabase/);
  const Page = load(path, dependencies).default;
  const bodies = [];
  // Reuse the same loaded component across A -> B -> anon, including stale-user/loading inputs.
  for (const state of [
    { user: null, loading: true }, { user: { id: 'unit-viewer-a' }, loading: false },
    { user: { id: 'unit-viewer-a' }, loading: true },
    { user: { id: 'unit-viewer-b' }, loading: false }, { user: null, loading: false },
  ]) {
    viewer = state.user;
    loading = state.loading;
    location = { pathname: spec.route, search: '?local-unit=1', hash: '', state: null };
    navigations = [];
    const tree = Page();
    const all = nodes(tree);
    assert.equal(tree.type, 'main');
    assert.deepEqual(all.filter((n) => n.type === 'h2').map(normalized), spec.headings);
    assert.deepEqual(all.filter((n) => n.type === 'p').map(normalized), approvedParagraphs[spec.name]);
    const header = all.find((n) => n.type === 'Header');
    assert.equal(header.props.title, spec.title);
    assert.equal(header.props.variant, 'content');
    assert.ok(all.every((n) => ['main', 'div', 'h2', 'p', 'Header', 'Card', 'CardContent', 'Button'].includes(n.type)),
      'No switches, records, inputs, dialogs or unreviewed controls');
    assert.doesNotMatch(normalized(tree), /unit-viewer|183\*|Apple|WeChat|QQ|已绑定|未绑定|iPhone|MacBook|iPad|深圳|广州|已移出|恢复互动|删除成功/);
    const buttons = all.filter((n) => n.type === 'Button');
    assert.equal(buttons.length, spec.name === 'AccountSecurity' ? 2 : spec.target ? 1 : 0);
    assert.deepEqual(navigations, [], 'Rendering must not perform an operation');
    if (spec.target) {
      const action = buttons[0];
      assert.equal(Boolean(action.props.disabled), loading);
      assert.equal(normalized(action), loading ? '正在确认登录状态…' : viewer ? spec.signedIn : spec.anonymous);
      action.props.onClick();
      // Normalize VM realms without discarding any navigation payload fields.
      assert.deepEqual(JSON.parse(JSON.stringify(navigations)), loading ? [] : [[viewer ? spec.target : '/auth', {
        state: { from: { pathname: spec.route, search: '?local-unit=1', hash: '' } },
      }]]);
      if (!loading && !viewer) {
        assert.equal(navigation.getReturnPathFromAuthState(navigations[0][1].state), `${spec.route}?local-unit=1`);
      }
    }
    if (spec.name === 'AccountSecurity') {
      navigations = [];
      assert.equal(normalized(buttons[1]), '查看登录活动功能说明');
      buttons[1].props.onClick();
      assert.equal(navigations[0][0], '/settings/login-activity');
      assert.equal(navigations[0][1].state.from.pathname, spec.route);
    }
    bodies.push(all.filter((n) => n.type === 'p').map(normalized));
  }
  assert.ok(bodies.every((body) => JSON.stringify(body) === JSON.stringify(bodies[0])), 'No viewer-specific records retained');
}

// Check real route registration and retained behavior, not just destination strings in the new pages.
const app = read('src/App.tsx');
assert.match(app, /path="\/settings\/change-password" element=\{<ChangePassword/);
assert.match(app, /path="\/profile\/experiences" element=\{<MyExperiences/);
assert.match(read('src/pages/settings/ChangePassword.tsx'), /supabase\.auth\.updateUser\(\{ password: newPassword \}\)/);
assert.match(read('src/pages/profile/MyExperiences.tsx'), /useSetPersonExperienceVisibility\(user\?\.id\)/);
for (const mode of ['staging', 'production', 'unknown']) {
  assert.equal(runtime.isPresentationFixtureAllowedForMode(runtime.resolveRuntimeMode(mode), true), false);
}
console.log('PASS: four actual settings page trees and callbacks; A/B/anon/loading; no data clients, preference writes, records, switches or fake success.');
console.log('PASS: password/Experience routes and auth-return preserved; unavailable capabilities remain unavailable after login; staging/production fixtures off.');
console.log('Scope: isolated page behavior, not genuine Auth, password mutation, Experience visibility mutation or UX-P0B race verification.');
