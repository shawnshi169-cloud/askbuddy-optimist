import assert from 'node:assert/strict';
import { controlledAuth, flushPromises, mountAuthProvider } from './lib/auth-provider-harness.mjs';

const A = '11111111-1111-4111-8111-111111111111';
const B = '22222222-2222-4222-8222-222222222222';
const session = (id, token = 'one') => ({ user: { id }, access_token: `offline-not-a-jwt:${id}:${token}` });
const response = (id, version = 'one') => ({ data: { profile: {
  userId: id, nickname: version, avatarUrl: null, coverUrl: null, bio: null,
  phone: `offline-private:${id}:${version}`, city: null,
} }, error: null });
let fixtures = [];
const setup = () => {
  const c = controlledAuth();
  const h = mountAuthProvider(c.client);
  const f = { c, h };
  fixtures.push(f);
  return f;
};
const start = (f, id, event = 'SIGNED_IN', token = 'one') => {
  f.c.emit(event, session(id, token));
  f.h.runTimers();
  return f.c.profiles.length - 1;
};
const finish = async (f, index, id, version = 'one', balance = 17) => {
  const count = f.c.balances.length;
  f.c.profiles[index].resolve(response(id, version));
  await flushPromises();
  assert.equal(f.c.balances.length, count + 1, 'Current profile reaches real balance query adapter');
  const call = f.c.balances.at(-1);
  assert.equal(call.userId, id);
  call.resolve({ data: { available_balance: balance }, error: null });
  await flushPromises();
};
const state = (f) => JSON.stringify(f.h.observations.at(-1));
const owner = (f, id, version = 'one') => {
  assert.equal(f.h.value.user?.id, id);
  assert.equal(f.h.value.session?.user.id, id);
  assert.equal(f.h.value.profile?.user_id, id);
  assert.equal(f.h.value.profile?.nickname, version);
  assert.equal(f.h.value.profile?.phone, `offline-private:${id}:${version}`);
  assert.equal(Object.hasOwn(f.h.value.profile, 'id'), false);
};
const anonymous = (f) => {
  assert.equal(f.h.value.user, null);
  assert.equal(f.h.value.session, null);
  assert.equal(f.h.value.profile, null);
  assert.equal(f.h.value.loading, false);
};
const test = async (name, run) => {
  fixtures = [];
  try {
    await run();
    for (const { h } of fixtures) {
      for (const entry of h.observations) {
        if (entry.profile) assert.ok(entry.profile.phone.startsWith(`offline-private:${entry.user.id}:`));
      }
      assert.doesNotMatch(JSON.stringify(h.logs), /offline-private|offline-not-a-jwt|sensitive-error/);
      assert.equal(h.postUnmountWrites, 0);
    }
    console.log(`PASS ${name}`);
  } finally {
    for (const { c, h } of fixtures) {
      h.unmount();
      assert.equal(h.timers.size, 0);
      assert.ok(c.subscriptions.every((sub) => !sub.active));
    }
  }
};

await test('T01 A success after switching to B cannot commit or launch a stale balance read', async () => {
  const f = setup();
  start(f, A); start(f, B);
  assert.equal(f.h.value.profile, null);
  const before = state(f);
  f.c.profiles[0].resolve(response(A));
  await flushPromises();
  assert.equal(state(f), before);
  assert.equal(f.c.balances.length, 0);
  await finish(f, 1, B); owner(f, B);
});
await test('T02 A late errors cannot clear B success', async () => {
  for (const rejected of [false, true]) {
    const f = setup(); start(f, A); start(f, B);
    await finish(f, 1, B);
    const before = state(f);
    if (rejected) f.c.profiles[0].reject(new Error('sensitive-error'));
    else f.c.profiles[0].resolve({ data: null, error: { message: 'sensitive-error' } });
    await flushPromises();
    assert.equal(state(f), before); owner(f, B);
  }
});
await test('T03 A late success after SIGNED_OUT stays anonymous', async () => {
  const f = setup(); start(f, A); f.c.emit('SIGNED_OUT', null);
  const before = state(f);
  f.c.profiles[0].resolve(response(A)); await flushPromises();
  assert.equal(state(f), before); anonymous(f);
  assert.equal(f.c.balances.length, 0);
});
await test('T04 A late failure after SIGNED_OUT has no effect', async () => {
  const f = setup(); start(f, A); f.c.emit('SIGNED_OUT', null);
  const count = f.h.observations.length;
  f.c.profiles[0].reject(new Error('sensitive-error')); await flushPromises();
  anonymous(f); assert.equal(f.h.observations.length, count);
});
await test('T05 initialization success/error/rejection and late INITIAL_SESSION cannot overwrite events', async () => {
  for (const result of ['success', 'null', 'error', 'reject']) {
    const f = setup(); start(f, B); await finish(f, 0, B);
    const before = state(f);
    if (result === 'reject') f.c.initial[0].reject(new Error('sensitive-error'));
    else f.c.initial[0].resolve({ data: { session: result === 'null' ? null : session(A) }, error: result === 'error' ? new Error('sensitive-error') : null });
    await flushPromises();
    f.c.emit('INITIAL_SESSION', session(A)); f.h.runTimers();
    assert.equal(state(f), before); assert.equal(f.c.profiles.length, 1); owner(f, B);
  }
  for (const reject of [false, true]) {
    const f = setup();
    if (reject) f.c.initial[0].reject(new Error('sensitive-error'));
    else f.c.initial[0].resolve({ data: { session: null }, error: new Error('sensitive-error') });
    await flushPromises(); anonymous(f);
    start(f, A, 'INITIAL_SESSION'); await finish(f, 0, A); owner(f, A);
  }
  const f = setup();
  f.c.initial[0].resolve({ data: { session: session(A) }, error: null }); await flushPromises();
  f.c.emit('INITIAL_SESSION', session(A)); f.h.runTimers();
  assert.equal(f.c.profiles.length, 1); await finish(f, 0, A); owner(f, A);
  const g = setup();
  g.c.initial[0].resolve({ data: { session: null }, error: null }); await flushPromises(); anonymous(g);
  start(g, B, 'INITIAL_SESSION'); await finish(g, 0, B); owner(g, B);
});
await test('T06 same-viewer refresh sequence: latest request wins success and failure', async () => {
  for (const lateFailure of [false, true]) {
    const f = setup(); start(f, A); await finish(f, 0, A);
    const first = f.h.value.refreshProfile(), second = f.h.value.refreshProfile();
    await finish(f, 2, A, 'new', 30); await second;
    const before = state(f);
    if (lateFailure) f.c.profiles[1].reject(new Error('sensitive-error'));
    else f.c.profiles[1].resolve(response(A, 'old'));
    await first;
    assert.equal(state(f), before); owner(f, A, 'new');
    assert.equal(f.h.value.profile.available_balance, 30);
  }
  const f = setup(); start(f, A); await finish(f, 0, A);
  const first = f.h.value.refreshProfile(), second = f.h.value.refreshProfile();
  f.c.profiles[2].reject(new Error('sensitive-error')); await second;
  assert.equal(f.h.value.profile, null);
  f.c.profiles[1].resolve(response(A, 'old')); await first;
  assert.equal(f.h.value.profile, null, 'Old success cannot undo a current failure');
});
await test('T07 A -> B -> A never reauthorizes first A request or queued callback', async () => {
  const f = setup(); start(f, A); start(f, B); start(f, A);
  await finish(f, 2, A, 'third');
  const before = state(f);
  f.c.profiles[0].resolve(response(A, 'first')); f.c.profiles[1].resolve(response(B));
  await flushPromises(); assert.equal(state(f), before); owner(f, A, 'third');
  const g = setup(); g.c.emit('SIGNED_IN', session(A));
  const canceled = [...g.h.timers.values()][0];
  start(g, B); start(g, A);
  const count = g.c.profiles.length; canceled();
  assert.equal(g.c.profiles.length, count);
});
await test('T08 pending RPC, balance, initialization and scheduled callback cannot commit after unmount/replay', async () => {
  const f = setup(); start(f, A);
  f.c.emit('SIGNED_IN', session(B));
  const canceled = [...f.h.timers.values()][0], subscriber = f.c.subscriptions[0].callback;
  f.h.unmount(); const count = f.h.observations.length;
  canceled(); subscriber('SIGNED_IN', session(A));
  f.c.profiles[0].resolve(response(A));
  f.c.initial[0].resolve({ data: { session: session(A) }, error: null });
  await flushPromises();
  assert.equal(f.h.observations.length, count); assert.equal(f.c.profiles.length, 1);
  const g = setup(); start(g, A);
  g.c.profiles[0].resolve(response(A, 'before-replay')); await flushPromises();
  g.h.replayEffects(); start(g, A); await finish(g, 1, A, 'after-replay');
  const before = state(g);
  g.c.balances[0].resolve({ data: { available_balance: 999 }, error: null });
  g.c.initial[0].resolve({ data: { session: session(B) }, error: null });
  g.c.subscriptions[0].callback('SIGNED_OUT', null);
  await flushPromises(); assert.equal(state(g), before); owner(g, A, 'after-replay');
});
await test('T09 same-viewer TOKEN_REFRESHED preserves valid profile; pending reads rebind; USER_UPDATED refreshes', async () => {
  const f = setup(); start(f, A); await finish(f, 0, A);
  const old = f.h.value.profile;
  f.c.emit('TOKEN_REFRESHED', session(A, 'two')); f.h.runTimers();
  assert.equal(f.h.value.profile, old); assert.equal(f.c.profiles.length, 1);
  assert.equal(f.h.value.session.access_token, session(A, 'two').access_token);
  f.c.emit('SIGNED_IN', session(A, 'two')); f.h.runTimers();
  assert.equal(f.c.profiles.length, 1);
  const pending = f.h.value.refreshProfile();
  f.c.emit('TOKEN_REFRESHED', session(A, 'three')); f.h.runTimers();
  f.c.profiles[1].resolve(response(A, 'stale-token')); await pending;
  assert.equal(f.h.value.profile, old);
  await finish(f, 2, A, 'refreshed');
  f.c.emit('USER_UPDATED', session(A, 'three')); f.h.runTimers();
  owner(f, A, 'refreshed'); await finish(f, 3, A, 'updated'); owner(f, A, 'updated');
  f.c.emit('PASSWORD_RECOVERY', session(A, 'three')); f.h.runTimers();
  assert.equal(f.c.profiles.length, 4);
});
await test('T10 wrong owner/null/malformed private profile fails closed before balance read', async () => {
  for (const result of [response(B), { data: { profile: null }, error: null }, { data: { profile: { phone: 'sensitive-error' } }, error: null }]) {
    const f = setup(); start(f, A); f.c.profiles[0].resolve(result); await flushPromises();
    assert.equal(f.h.value.user.id, A); assert.equal(f.h.value.profile, null);
    assert.equal(f.c.balances.length, 0);
  }
});
await test('T11 balance fallback/rejection/delay retain safe semantics and request ownership', async () => {
  for (const rejected of [false, true]) {
    const f = setup(); start(f, A); f.c.profiles[0].resolve(response(A)); await flushPromises();
    if (rejected) f.c.balances[0].reject(new Error('sensitive-error'));
    else f.c.balances[0].resolve({ data: null, error: { message: 'sensitive-error' } });
    await flushPromises();
    if (rejected) assert.equal(f.h.value.profile, null);
    else { owner(f, A); assert.equal(f.h.value.profile.available_balance, 0); }
  }
  for (const rejected of [false, true]) {
    const f = setup(); start(f, A); f.c.profiles[0].resolve(response(A)); await flushPromises();
    start(f, B); await finish(f, 1, B); const before = state(f);
    if (rejected) f.c.balances[0].reject(new Error('sensitive-error'));
    else f.c.balances[0].resolve({ data: { available_balance: 999 }, error: null });
    await flushPromises(); assert.equal(state(f), before); owner(f, B);
  }
  const f = setup(); start(f, A); f.c.profiles[0].resolve(response(A, 'old')); await flushPromises();
  const latest = f.h.value.refreshProfile(); await finish(f, 1, A, 'latest'); await latest;
  f.c.balances[0].resolve({ data: { available_balance: 999 }, error: null }); await flushPromises();
  owner(f, A, 'latest'); assert.equal(f.h.value.profile.available_balance, 17);
});
await test('T12 refresh/logout overlap, returned and thrown signOut failure, and late logout completion', async () => {
  for (const failure of ['returned', 'thrown', 'success']) {
    const f = setup(); start(f, A); await finish(f, 0, A);
    const refresh = f.h.value.refreshProfile();
    const outcome = f.h.value.signOut().then(() => 'ok', () => 'failed');
    await f.h.value.refreshProfile(); assert.equal(f.c.profiles.length, 2, 'No refresh while logout pending');
    f.c.profiles[1].resolve(response(A, 'obsolete')); await refresh;
    owner(f, A);
    if (failure === 'thrown') f.c.logouts[0].reject(new Error('offline logout failure'));
    else f.c.logouts[0].resolve({ error: failure === 'returned' ? new Error('offline logout failure') : null });
    assert.equal(await outcome, failure === 'success' ? 'ok' : 'failed');
    if (failure === 'success') anonymous(f);
    else {
      owner(f, A);
      const next = f.h.value.refreshProfile(); await finish(f, 2, A, 'after-failed-logout'); await next;
      owner(f, A, 'after-failed-logout');
    }
  }
  for (const failure of [false, true]) {
    const f = setup(); start(f, A);
    const outcome = f.h.value.signOut().then(() => 'ok', () => 'failed');
    f.c.emit('SIGNED_OUT', null); start(f, B); await finish(f, 1, B);
    const before = state(f);
    f.c.logouts[0].resolve({ error: failure ? new Error('offline logout failure') : null });
    assert.equal(await outcome, failure ? 'failed' : 'ok'); assert.equal(state(f), before);
    f.c.profiles[0].resolve(response(A)); await flushPromises(); owner(f, B);
  }
  const f = setup(); const outcome = f.h.value.signOut();
  f.c.initial[0].resolve({ data: { session: session(A) }, error: null }); await flushPromises();
  assert.equal(f.c.profiles.length, 0);
  f.c.logouts[0].resolve({ error: null }); await outcome; anonymous(f);
  const g = setup(); const failed = g.h.value.signOut().then(() => false, () => true);
  g.c.logouts[0].resolve({ error: new Error('offline logout failure') });
  assert.equal(await failed, true); assert.equal(g.h.value.loading, false);
  g.c.initial[0].resolve({ data: { session: session(A) }, error: null }); await flushPromises();
  assert.equal(g.h.value.profile, null);
  start(g, B); await finish(g, 0, B); owner(g, B);
});
await test('T13 anonymous -> A -> B -> anonymous: all observable states are viewer-consistent', async () => {
  const f = setup(); f.c.emit('INITIAL_SESSION', null); anonymous(f);
  start(f, A); await finish(f, 0, A); owner(f, A);
  f.c.emit('SIGNED_IN', session(B));
  assert.equal(f.h.value.user.id, B); assert.equal(f.h.value.profile, null);
  f.h.runTimers(); await finish(f, 1, B); owner(f, B);
  f.c.emit('SIGNED_OUT', null); anonymous(f);
  f.c.initial[0].resolve({ data: { session: session(A) }, error: null }); await flushPromises(); anonymous(f);
  assert.equal((await f.h.value.signIn('offline@example.invalid', 'not-a-real-password')).error, null);
  assert.equal((await f.h.value.signUp('offline@example.invalid', 'not-a-real-password', 'offline')).error, null);
  assert.deepEqual(f.c.passwordCalls.map(([name]) => name), ['signIn', 'signUp']);
  const failure = new Error('offline auth failure');
  f.c.client.auth.signInWithPassword = async () => ({ error: failure });
  f.c.client.auth.signUp = async () => { throw failure; };
  assert.equal((await f.h.value.signIn('offline@example.invalid', 'not-a-real-password')).error, failure);
  assert.equal((await f.h.value.signUp('offline@example.invalid', 'not-a-real-password')).error, failure);
  anonymous(f); // SDK results alone do not fabricate a session.
});
console.log('Auth viewer isolation: T01-T13 PASS using actual provider + parser, controlled hooks, Auth/RPC/balance promises and scheduler.');
console.log('No network, real credentials, Supabase Auth E2E, DOM/device QA, database, or Production verification.');

await import('./profile-logout-check.mjs');
