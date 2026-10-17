import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const compile = (path, dependencies = {}, globals = {}) => {
  const module = { exports: {} };
  const source = readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React },
  });
  vm.runInNewContext(outputText, { ...globals, module, exports: module.exports, require: (name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unreviewed AuthProvider dependency: ${name}`);
    return dependencies[name];
  } }, { filename: path });
  return module.exports;
};

export const flushPromises = async () => { for (let i = 0; i < 16; i++) await Promise.resolve(); };
export const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

// Executes the actual provider, parser and callbacks. Hook slots persist across
// synchronous rerenders; this deliberately observes every state setter, not just
// React's batched result. It is not a DOM renderer or real Supabase Auth.
export const mountAuthProvider = (client) => {
  const slots = [], effects = [], timers = new Map(), observations = [], logs = [];
  let cursor = 0, value, mounted = true, postUnmountWrites = 0, nextTimer = 1;
  const react = {
    createContext: () => ({ Provider: 'AuthProvider' }),
    useContext: () => value,
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => {
        if (!mounted) { postUnmountWrites++; return; }
        slots[index] = typeof next === 'function' ? next(slots[index]) : next;
        render();
      }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect: (effect, deps) => {
      assert.equal(deps.length, 0, 'Harness supports mount effects only');
      const index = cursor++;
      if (!(index in slots)) { slots[index] = true; effects.push({ effect, cleanup: null }); }
    },
    createElement: (type, props) => ({ type, props }),
  };
  const { AuthProvider } = compile('src/contexts/AuthContext.tsx', {
    react: { ...react, default: react },
    '@/integrations/supabase/client': { supabase: client },
    '../../packages/shared-api/src/private-profile-v1': compile('packages/shared-api/src/private-profile-v1.ts'),
  }, {
    setTimeout: (callback, delay) => {
      assert.equal(delay, 0);
      const id = nextTimer++;
      timers.set(id, callback);
      return id;
    },
    clearTimeout: (id) => timers.delete(id),
    console: { warn: (...args) => logs.push(['warn', ...args]), error: (...args) => logs.push(['error', ...args]) },
    window: { location: { origin: 'https://offline.example.invalid' } },
  });
  function render() {
    cursor = 0;
    value = AuthProvider({ children: null }).props.value;
    const { user, session, profile, loading } = value;
    assert.equal(user?.id ?? null, session?.user?.id ?? null, 'Atomic session/user consistency');
    assert.ok(!profile || (user && profile.user_id === user.id), 'No cross-viewer private profile at any observed state');
    observations.push(structuredClone({ user, session, profile, loading }));
  }
  render();
  for (const entry of effects) entry.cleanup = entry.effect();
  return {
    get value() { return value; },
    get postUnmountWrites() { return postUnmountWrites; },
    observations, logs, timers,
    runTimers: () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } },
    unmount: () => { for (const entry of effects) entry.cleanup?.(); mounted = false; },
    replayEffects: () => {
      for (const entry of effects) entry.cleanup?.();
      for (const entry of effects) entry.cleanup = entry.effect();
    },
  };
};

export const controlledAuth = () => {
  const initial = [], profiles = [], balances = [], logouts = [], subscriptions = [], passwordCalls = [];
  const client = {
    auth: {
      getSession: () => { const call = deferred(); initial.push(call); return call.promise; },
      onAuthStateChange: (callback) => {
        const sub = { callback, active: true };
        subscriptions.push(sub);
        return { data: { subscription: { unsubscribe: () => { sub.active = false; } } } };
      },
      signOut: () => { const call = deferred(); logouts.push(call); return call.promise; },
      signInWithPassword: async (params) => { passwordCalls.push(['signIn', params]); return { error: null }; },
      signUp: async (params) => { passwordCalls.push(['signUp', params]); return { error: null }; },
    },
    rpc: (...args) => {
      assert.deepEqual(args, ['get_my_private_profile_v1']);
      const call = deferred(); profiles.push(call); return call.promise;
    },
    from: (table) => {
      assert.equal(table, 'point_accounts');
      return { select: (columns) => {
        assert.equal(columns, 'available_balance');
        return { eq: (key, userId) => {
          assert.equal(key, 'user_id');
          return { maybeSingle: () => {
            const call = { ...deferred(), userId }; balances.push(call); return call.promise;
          } };
        } };
      } };
    },
  };
  return {
    client, initial, profiles, balances, logouts, subscriptions, passwordCalls,
    emit: (event, session) => {
      const before = profiles.length;
      for (const sub of subscriptions) if (sub.active) assert.equal(sub.callback(event, session), undefined, 'Auth callback must be synchronous');
      assert.equal(profiles.length, before, 'No Supabase read under Auth callback lock');
    },
  };
};
