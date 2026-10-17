import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import React from 'react';
import { controlledAuth, mountAuthProvider } from './lib/auth-provider-harness.mjs';

const load = (path, dependencies) => {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  });
  const module = { exports: {} };
  vm.runInNewContext(outputText, { module, exports: module.exports, require: (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unreviewed Profile logout test dependency: ${name}`);
    return dependencies[name];
  } }, { filename: path });
  return module.exports;
};
const nodes = (tree) => tree == null || typeof tree !== 'object' ? []
  : Array.isArray(tree) ? tree.flatMap(nodes) : [tree, ...nodes(tree.props?.children)];
const text = (tree) => tree == null || typeof tree === 'boolean' ? ''
  : Array.isArray(tree) ? tree.map(text).join('')
    : typeof tree === 'object' ? text(tree.props?.children) : String(tree);
const forbidden = () => assert.fail('Logout must not navigate, mutate profile data, or create unrelated side effects');

// Execute the real Profile handler and SettingsMenu trees with persistent hook
// slots and the real AuthProvider harness. UI primitives are markers, not a DOM.
const mountProfile = (provider, mobile) => {
  const slots = [], feedback = [];
  let cursor = 0, menu;
  const react = {
    ...React,
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = next; render(); }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
  };
  const common = {
    react: { ...react, default: react },
    'react-router-dom': {
      useNavigate: () => forbidden,
      useLocation: () => ({ pathname: '/profile', search: '', hash: '', state: null }),
    },
    'lucide-react': Object.fromEntries([
      'Settings', 'FileText', 'User', 'BookOpenText', 'Bookmark', 'Loader2', 'Camera', 'ChevronRight',
      'ImagePlus', 'CircleHelp', 'MessageSquareText', 'Info', 'Edit3', 'MessageCircle', 'Lock', 'Bell',
      'Eye', 'Folder', 'HelpCircle', 'Shield', 'MessageSquare', 'LogOut',
    ].map((name) => [name, `Icon:${name}`])),
    '@/components/ui/button': { Button: 'Button' },
    '@/utils/navigation': { buildFromState: forbidden, navigateToAuthWithReturn: forbidden },
  };
  const SettingsMenu = load('src/components/profile/SettingsMenu.tsx', {
    ...common,
    '@/hooks/use-mobile': { useIsMobile: () => mobile },
    '@/components/ui/dialog': { Dialog: 'Dialog', DialogContent: 'DialogContent', DialogTitle: 'DialogTitle' },
    '@/components/ui/drawer': { Drawer: 'Drawer', DrawerContent: 'DrawerContent', DrawerTitle: 'DrawerTitle' },
  }).default;
  const Profile = load('src/pages/Profile.tsx', {
    ...common,
    '@/contexts/AuthContext': { useAuth: () => provider.value },
    '@/hooks/use-toast': { useToast: () => ({ toast: (value) => feedback.push(structuredClone(value)) }) },
    '@/components/ui/avatar': { Avatar: 'Avatar', AvatarImage: 'AvatarImage', AvatarFallback: 'AvatarFallback' },
    '@/components/ui/card': { Card: 'Card', CardContent: 'CardContent' },
    '@/components/ui/skeleton': { Skeleton: 'Skeleton' },
    '@/components/BottomNav': { default: 'BottomNav' },
    '@/components/profile/SettingsMenu': { default: SettingsMenu },
    '@/hooks/useProfile': {
      useUploadAvatar: () => ({ mutateAsync: forbidden }), useUploadCover: () => ({ mutateAsync: forbidden }),
      useUpdateProfile: () => ({ mutateAsync: forbidden }),
    },
    '@/hooks/useProfileData': { useProfileStats: () => ({ data: null }) },
    '@/hooks/useHotTopics': { useIsAdmin: () => ({ data: false }) },
    '@/hooks/usePageScrollMemory': { usePageScrollMemory: () => {} },
    '@/components/common/PageStateCard': { default: 'PageStateCard' },
  }).default;
  function render() {
    cursor = 0;
    menu = nodes(Profile()).find((node) => node.type === SettingsMenu);
    assert.ok(menu, 'Profile must render its real SettingsMenu');
  }
  render();
  return {
    feedback, render,
    get signingOut() { return menu.props.signingOut; },
    get button() {
      const tree = SettingsMenu(menu.props);
      assert.equal(tree.type, mobile ? 'Drawer' : 'Dialog');
      return nodes(tree).find((node) => node.type === 'Button' && node.props.onClick === menu.props.onSignOut);
    },
  };
};

const A = '11111111-1111-4111-8111-111111111111';
for (const mobile of [false, true]) {
  for (const outcome of ['success', 'returned-error', 'rejected']) {
    const auth = controlledAuth();
    const provider = mountAuthProvider(auth.client);
    try {
      auth.emit('SIGNED_IN', { user: { id: A }, access_token: 'offline-not-a-jwt' });
      const page = mountProfile(provider, mobile);
      assert.equal(page.button.props.disabled, false);
      assert.equal(text(page.button), '退出登录');
      const pending = page.button.props.onClick();
      assert.equal(auth.logouts.length, 1);
      assert.equal(page.signingOut, true);
      assert.equal(page.button.props.disabled, true);
      assert.equal(text(page.button), '正在退出…');
      assert.deepEqual(page.feedback, [], 'No success or failure feedback before settlement');
      assert.equal(provider.value.user.id, A, 'Pending logout must not force an anonymous state');

      if (outcome === 'rejected') auth.logouts[0].reject(new Error('sensitive SDK detail'));
      else auth.logouts[0].resolve({ error: outcome === 'returned-error' ? new Error('sensitive SDK detail') : null });
      await assert.doesNotReject(pending, 'Profile must consume the signOut rejection');
      assert.equal(page.signingOut, false, 'finally restores the UI after success or failure');
      if (outcome !== 'success') {
        assert.equal(provider.value.user.id, A, 'Failed logout must retain SDK-authoritative state');
        assert.equal(provider.value.session.user.id, A);
        assert.deepEqual(page.feedback, [{
          title: '退出登录失败', description: '未能完成退出登录，请重试。', variant: 'destructive',
        }]);
        assert.equal(page.button.props.disabled, false, 'Failure restores the retry button');
        assert.equal(text(page.button), '退出登录');
        const retry = page.button.props.onClick();
        assert.equal(auth.logouts.length, 2, 'Retry actually calls signOut again');
        assert.equal(page.button.props.disabled, true);
        assert.equal(page.feedback.length, 1, 'Pending retry must not emit success');
        auth.logouts[1].resolve({ error: null });
        await assert.doesNotReject(retry);
        assert.equal(page.signingOut, false);
      }
      assert.equal(provider.value.user, null);
      assert.equal(provider.value.session, null);
      assert.equal(provider.value.profile, null);
      assert.deepEqual(page.feedback.at(-1), { title: '已退出登录' });
      assert.equal(page.feedback.filter((item) => item.title === '已退出登录').length, 1);
      page.render();
      assert.equal(page.button, undefined, 'SDK-authoritative anonymous state hides logout');
      assert.doesNotMatch(JSON.stringify(page.feedback), /sensitive SDK detail|offline-not-a-jwt/);
      console.log(`PASS Profile logout ${mobile ? 'mobile' : 'desktop'} ${outcome}: pending/disabled, feedback, reset and retry`);
    } finally {
      provider.unmount();
      assert.equal(provider.timers.size, 0);
      assert.equal(provider.postUnmountWrites, 0);
      assert.ok(auth.subscriptions.every((sub) => !sub.active));
    }
  }
}
console.log('Profile logout consumer PASS: actual Profile + SettingsMenu + AuthProvider; controlled offline SDK, not browser/device or genuine Auth E2E.');
