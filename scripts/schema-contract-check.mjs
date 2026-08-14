import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const migrationsDir = join(root, 'supabase', 'migrations');
const typesPath = join(root, 'src', 'integrations', 'supabase', 'types.ts');

const requiredMigrationPatterns = [
  'create_recharge_payment_order',
  'confirm_recharge_payment',
  'search_app_content',
  'submit_content_report',
  'get_admin_dashboard',
  'apply_content_moderation_action',
  'list_pending_recharge_orders',
  'admin_confirm_recharge_order',
  'content_reports',
  'audit_events',
  'app_config',
  'call_sessions',
  'create_call_session_v1',
  'accept_call_v1',
  'reject_call_v1',
  'end_call_v1',
  'wechat_identities',
  'claim_wechat_identity_v1',
];

const migrationFiles = readdirSync(migrationsDir)
  .filter((name) => name.endsWith('.sql'))
  .sort();

const migrationText = migrationFiles
  .map((name) => readFileSync(join(migrationsDir, name), 'utf8'))
  .join('\n');

const missingPatterns = requiredMigrationPatterns.filter(
  (pattern) => !migrationText.includes(pattern)
);

if (missingPatterns.length > 0) {
  console.error('Missing migration contracts:', missingPatterns.join(', '));
  process.exit(1);
}

const typesText = readFileSync(typesPath, 'utf8');
const requiredTypePatterns = [
  'create_recharge_payment_order',
  'search_app_content',
  'get_admin_dashboard',
  'review_content_report',
  'apply_content_moderation_action',
  'list_pending_recharge_orders',
  'admin_confirm_recharge_order',
  'upsert_app_config',
  'call_sessions',
  'create_call_session_v1',
  'accept_call_v1',
  'reject_call_v1',
  'end_call_v1',
];

const missingTypePatterns = requiredTypePatterns.filter(
  (pattern) => !typesText.includes(pattern)
);

if (missingTypePatterns.length > 0) {
  console.error('Missing generated type contracts:', missingTypePatterns.join(', '));
  process.exit(1);
}

const sharedTypesPath = join(root, 'packages', 'shared-types', 'src', 'contracts.ts');
const sharedApiPath = join(root, 'packages', 'shared-api', 'src', 'wechat-auth-v1.ts');
const edgeFunctionPath = join(root, 'supabase', 'functions', 'wechat-auth', 'index.ts');
const edgeCorePath = join(root, 'supabase', 'functions', 'wechat-auth', 'core.mjs');
const supabaseConfigPath = join(root, 'supabase', 'config.toml');
const serviceRoleFixPath = join(
  migrationsDir,
  '20260814053306_fix_service_role_claim_detection.sql',
);
const wechatIdentityMigrationPath = join(
  migrationsDir,
  '20260811160000_wechat_auth_v1_identities.sql',
);

const sharedTypesText = readFileSync(sharedTypesPath, 'utf8');
const sharedApiText = readFileSync(sharedApiPath, 'utf8');
const edgeFunctionText = readFileSync(edgeFunctionPath, 'utf8');
const edgeCoreText = readFileSync(edgeCorePath, 'utf8');
const supabaseConfigText = readFileSync(supabaseConfigPath, 'utf8');
const serviceRoleFixText = readFileSync(serviceRoleFixPath, 'utf8');
const wechatIdentityMigrationText = readFileSync(wechatIdentityMigrationPath, 'utf8');

assert.match(
  serviceRoleFixText,
  /CREATE OR REPLACE FUNCTION public\.is_service_role\(\)[\s\S]*coalesce\(auth\.role\(\), ''\) = 'service_role'/,
  'Service-role detection must use the Supabase Auth role helper.',
);
assert.match(serviceRoleFixText, /SET search_path = ''/);
assert.doesNotMatch(
  serviceRoleFixText,
  /request\.jwt\.claim\.role|current_user|current_role|session_user/,
  'Service-role detection must not rely on incomplete claims or execution identity.',
);
assert.match(
  wechatIdentityMigrationText,
  /IF NOT public\.is_service_role\(\) THEN[\s\S]*RAISE EXCEPTION 'service role required'/,
  'WeChat identity claim must retain its service-role guard.',
);
assert.match(
  wechatIdentityMigrationText,
  /REVOKE ALL ON FUNCTION public\.claim_wechat_identity_v1\(text, text, text, uuid\)[\s\S]*FROM PUBLIC, anon, authenticated/,
  'WeChat identity claim must remain unavailable to public client roles.',
);
assert.match(
  wechatIdentityMigrationText,
  /GRANT EXECUTE ON FUNCTION public\.claim_wechat_identity_v1\(text, text, text, uuid\)[\s\S]*TO service_role/,
  'WeChat identity claim must remain executable by service_role.',
);
assert.match(
  migrationText,
  /CREATE OR REPLACE FUNCTION public\.confirm_recharge_payment\([\s\S]*IF NOT \(public\.is_service_role\(\) OR public\.has_role\(auth\.uid\(\), 'admin'\)\) THEN/,
  'Recharge confirmation must retain its controlled server/admin authorization guard.',
);

for (const pattern of [
  'WechatAuthResponse',
  'WechatAuthErrorPayload',
  'WECHAT_AUTH_ERROR_CODE',
]) {
  assert.ok(sharedTypesText.includes(pattern), `Missing WeChat Auth shared type: ${pattern}`);
}

for (const pattern of [
  'WechatLoginRequest',
  'WechatAuthV1SuccessResponse',
  'WechatAuthV1ErrorResponse',
  'wechat_auth_v1: "wechat-auth"',
]) {
  assert.ok(sharedApiText.includes(pattern), `Missing WeChat Auth shared API contract: ${pattern}`);
}

assert.doesNotMatch(
  `${sharedTypesText}\n${sharedApiText}`,
  /\b(?:openid|unionid|session_key|serviceRole|service_role|refreshToken)\s*:/,
  'Client contract must not expose sensitive WeChat/server fields or an unsupported refresh token.',
);
assert.match(supabaseConfigText, /\[functions\.wechat-auth\][\s\S]*verify_jwt\s*=\s*false/);
assert.match(edgeCoreText, /auth\.admin\.createUser/);
assert.match(edgeCoreText, /email:\s*buildWechatSyntheticEmail\(candidateUserId\)/);
assert.match(edgeCoreText, /claim_wechat_identity_v1/);
assert.match(edgeFunctionText, /new SignJWT/);
assert.doesNotMatch(`${edgeFunctionText}\n${edgeCoreText}`, /mock_token/);
assert.doesNotMatch(
  `${edgeFunctionText}\n${edgeCoreText}`,
  /\b(?:phone|password|email_confirm)\s*:/,
);
assert.ok(
  edgeFunctionText.indexOf('const userId = await resolveWechatUser')
    < edgeFunctionText.indexOf('const claims = buildWechatJwtClaims'),
  'Final Auth user validation must complete before JWT claims are built.',
);

const {
  WECHAT_AUTH_ERROR_CODES,
  buildWechatAuthResponse,
  buildWechatJwtClaims,
  buildWechatSyntheticEmail,
  consumeRateLimit,
  deriveWechatUserId,
  isRecoverableWechatBootstrapUser,
  isUserNotFoundError,
  normalizeRateLimit,
  normalizeWechatExchange,
  resolveWechatUser,
  validateWechatLoginRequest,
} = await import(pathToFileURL(edgeCorePath).href);

assert.throws(
  () => validateWechatLoginRequest({ code: '' }),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.INVALID_REQUEST,
);
assert.throws(
  () => validateWechatLoginRequest({ code: 'contains spaces' }),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.INVALID_REQUEST,
);
assert.throws(
  () => normalizeWechatExchange({ errcode: 40029, errmsg: 'raw upstream detail' }),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.INVALID_WECHAT_CODE
    && !error.message.includes('raw upstream detail'),
);

const normalizedIdentity = normalizeWechatExchange({
  openid: 'openid_for_contract_test',
  unionid: 'unionid_for_contract_test',
  session_key: 'must-not-leave-server',
});
assert.deepEqual(normalizedIdentity, {
  openid: 'openid_for_contract_test',
  unionid: 'unionid_for_contract_test',
});
assert.ok(!Object.hasOwn(normalizedIdentity, 'session_key'));

const identitySecret = 'contract-test-only-secret-with-32-characters';
const derivedIds = await Promise.all(
  Array.from({ length: 4 }, () =>
    deriveWechatUserId('wx-test-app', 'stable-openid', identitySecret)),
);
assert.equal(new Set(derivedIds).size, 1, 'Concurrent derivation must select one auth user UUID.');
assert.match(derivedIds[0], /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
assert.notEqual(
  derivedIds[0],
  await deriveWechatUserId('wx-test-app', 'different-openid', identitySecret),
);

const syntheticEmail = buildWechatSyntheticEmail(derivedIds[0]);
assert.equal(syntheticEmail, `${derivedIds[0]}@wechat.askbuddy.invalid`);
assert.equal(syntheticEmail, buildWechatSyntheticEmail(derivedIds[0]));
assert.ok(syntheticEmail.endsWith('.invalid'));
assert.ok(!syntheticEmail.includes('stable-openid'));
assert.ok(!syntheticEmail.includes('unionid_for_contract_test'));
assert.throws(
  () => buildWechatSyntheticEmail('not-a-uuid'),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
);
assert.equal(isUserNotFoundError({ status: 404, code: 'user_not_found' }), true);
assert.equal(isUserNotFoundError({ status: 404, code: 'other_error' }), false);
assert.equal(isUserNotFoundError({ status: 500, code: 'user_not_found' }), false);
assert.equal(
  isRecoverableWechatBootstrapUser({
    id: derivedIds[0],
    email: syntheticEmail,
    app_metadata: { provider: 'email', providers: ['email'] },
  }, derivedIds[0]),
  true,
);
assert.equal(
  isRecoverableWechatBootstrapUser({
    id: derivedIds[0],
    email: 'unrelated@example.com',
    app_metadata: { provider: 'email', providers: ['email'] },
  }, derivedIds[0]),
  false,
);

function createMockAuthAdmin(options = {}) {
  const users = new Map();
  const identities = new Map();
  const stats = {
    createUserAttributes: [],
    getUserByIdCalls: 0,
    metadataUpdates: 0,
    metadataUpdateAttempts: 0,
    successfulUserCreates: 0,
    userNotFoundLookups: 0,
  };

  const client = {
    from(table) {
      assert.equal(table, 'wechat_identities');
      const filters = {};
      return {
        select() {
          return this;
        },
        eq(column, value) {
          filters[column] = value;
          return this;
        },
        async maybeSingle() {
          const userId = identities.get(`${filters.app_id}:${filters.openid}`);
          return { data: userId ? { user_id: userId } : null, error: null };
        },
      };
    },
    auth: {
      admin: {
        async getUserById(userId) {
          stats.getUserByIdCalls += 1;
          const user = users.get(userId) ?? null;
          if (!user) {
            if (options.lookupError) {
              return { data: { user: null }, error: options.lookupError };
            }
            stats.userNotFoundLookups += 1;
            return {
              data: { user: null },
              error: {
                status: 404,
                code: 'user_not_found',
              },
            };
          }
          return { data: { user }, error: null };
        },
        async createUser(attributes) {
          stats.createUserAttributes.push(structuredClone(attributes));
          if (options.forceRaceTransition) {
            users.set(attributes.id, {
              id: attributes.id,
              email: attributes.email,
              app_metadata: { provider: 'email', providers: ['email'] },
            });
            return {
              data: { user: null },
              error: { status: 422, code: 'user_already_exists' },
            };
          }
          if (users.has(attributes.id)) {
            return {
              data: { user: null },
              error: { status: 422, code: 'user_already_exists' },
            };
          }
          const appMetadata = options.createProvider === 'wechat'
            ? attributes.app_metadata
            : { provider: 'email', providers: ['email'] };
          const user = {
            id: attributes.id,
            email: attributes.email,
            app_metadata: appMetadata,
          };
          users.set(attributes.id, user);
          stats.successfulUserCreates += 1;
          return { data: { user }, error: null };
        },
        async updateUserById(userId, attributes) {
          stats.metadataUpdateAttempts += 1;
          const user = users.get(userId);
          if (!user) {
            return { data: { user: null }, error: new Error('missing user') };
          }
          if (options.failMetadataUpdateOnce && stats.metadataUpdateAttempts === 1) {
            return {
              data: { user: null },
              error: { status: 500, code: 'unexpected_failure' },
            };
          }
          const updatedUser = {
            ...user,
            app_metadata: attributes.app_metadata,
          };
          users.set(userId, updatedUser);
          stats.metadataUpdates += 1;
          return { data: { user: updatedUser }, error: null };
        },
      },
    },
    async rpc(name, params) {
      assert.equal(name, 'claim_wechat_identity_v1');
      const identityKey = `${params.p_app_id}:${params.p_openid}`;
      if (!identities.has(identityKey)) {
        identities.set(identityKey, params.p_candidate_user_id);
      }
      return { data: identities.get(identityKey), error: null };
    },
  };

  return { client, identities, stats, users };
}

function createWechatAuthUser(userId, overrides = {}) {
  return {
    id: userId,
    app_metadata: {
      provider: 'wechat',
      providers: ['wechat'],
    },
    banned_until: null,
    deleted_at: null,
    ...overrides,
  };
}

async function assertIdentityRejected(admin, openid) {
  await assert.rejects(
    () => resolveWechatUser(
      admin,
      'wx-test-app',
      openid,
      null,
      identitySecret,
    ),
    (error) => error?.code === WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR
      && error.message === 'Unable to validate the authenticated identity.',
  );
}

const lookupFailureAdmin = createMockAuthAdmin({
  lookupError: { status: 500, code: 'unexpected_failure' },
});
await assert.rejects(
  () => resolveWechatUser(
    lookupFailureAdmin.client,
    'wx-test-app',
    'lookup-failure-openid',
    null,
    identitySecret,
  ),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR
    && error.message === 'Unable to resolve the authenticated identity.',
);
assert.equal(lookupFailureAdmin.stats.createUserAttributes.length, 0);
assert.equal(lookupFailureAdmin.users.size, 0);
assert.equal(lookupFailureAdmin.identities.size, 0);

const mockAdmin = createMockAuthAdmin();
const firstLoginUserId = await resolveWechatUser(
  mockAdmin.client,
  'wx-test-app',
  'first-login-openid',
  null,
  identitySecret,
);
assert.equal(
  firstLoginUserId,
  await deriveWechatUserId('wx-test-app', 'first-login-openid', identitySecret),
  'Synthetic email support must not change the deterministic candidate user id.',
);
const repeatLoginUserId = await resolveWechatUser(
  mockAdmin.client,
  'wx-test-app',
  'first-login-openid',
  null,
  identitySecret,
);
assert.equal(repeatLoginUserId, firstLoginUserId);
assert.equal(mockAdmin.users.size, 1);
assert.equal(mockAdmin.identities.size, 1);
assert.equal(mockAdmin.stats.successfulUserCreates, 1);
assert.equal(mockAdmin.stats.metadataUpdates, 1);
assert.equal(mockAdmin.stats.userNotFoundLookups, 1);
assert.equal(mockAdmin.stats.createUserAttributes.length, 1);
assert.equal(
  mockAdmin.stats.createUserAttributes[0].email,
  buildWechatSyntheticEmail(firstLoginUserId),
);
assert.ok(!Object.hasOwn(mockAdmin.stats.createUserAttributes[0], 'email_confirm'));
assert.ok(!Object.hasOwn(mockAdmin.stats.createUserAttributes[0], 'password'));
assert.ok(!Object.hasOwn(mockAdmin.stats.createUserAttributes[0], 'phone'));

const concurrentUserIds = await Promise.all(
  Array.from({ length: 4 }, () =>
    resolveWechatUser(
      mockAdmin.client,
      'wx-test-app',
      'concurrent-openid',
      null,
      identitySecret,
    )),
);
assert.equal(new Set(concurrentUserIds).size, 1);
assert.equal(mockAdmin.users.size, 2, 'Concurrent login must not create duplicate auth users.');
assert.equal(mockAdmin.identities.size, 2, 'Concurrent login must keep one identity row per openid.');
assert.equal(mockAdmin.stats.successfulUserCreates, 2);

const metadataOverrideAdmin = createMockAuthAdmin({ createProvider: 'email' });
const metadataOverrideUserId = await resolveWechatUser(
  metadataOverrideAdmin.client,
  'wx-test-app',
  'metadata-override-openid',
  null,
  identitySecret,
);
assert.deepEqual(
  metadataOverrideAdmin.users.get(metadataOverrideUserId).app_metadata,
  { provider: 'wechat', providers: ['wechat'] },
);
assert.equal(metadataOverrideAdmin.stats.metadataUpdates, 1);

const raceTransitionAdmin = createMockAuthAdmin({ forceRaceTransition: true });
const raceTransitionUserId = await resolveWechatUser(
  raceTransitionAdmin.client,
  'wx-test-app',
  'race-transition-openid',
  null,
  identitySecret,
);
assert.equal(
  raceTransitionAdmin.users.get(raceTransitionUserId).app_metadata.provider,
  'wechat',
);
assert.equal(raceTransitionAdmin.stats.createUserAttributes.length, 1);
assert.equal(raceTransitionAdmin.stats.metadataUpdateAttempts, 1);
assert.equal(raceTransitionAdmin.identities.size, 1);

const partialRecoveryAdmin = createMockAuthAdmin({ failMetadataUpdateOnce: true });
const partialRecoveryOpenid = 'partial-recovery-openid';
const partialRecoveryUserId = await deriveWechatUserId(
  'wx-test-app',
  partialRecoveryOpenid,
  identitySecret,
);
await assert.rejects(
  () => resolveWechatUser(
    partialRecoveryAdmin.client,
    'wx-test-app',
    partialRecoveryOpenid,
    null,
    identitySecret,
  ),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
);
assert.equal(
  partialRecoveryAdmin.users.get(partialRecoveryUserId).app_metadata.provider,
  'email',
);
assert.equal(partialRecoveryAdmin.identities.size, 0);
assert.equal(
  partialRecoveryAdmin.users.get(partialRecoveryUserId).email,
  buildWechatSyntheticEmail(partialRecoveryUserId),
);
assert.equal(
  await resolveWechatUser(
    partialRecoveryAdmin.client,
    'wx-test-app',
    partialRecoveryOpenid,
    null,
    identitySecret,
  ),
  partialRecoveryUserId,
);
assert.equal(
  partialRecoveryAdmin.users.get(partialRecoveryUserId).app_metadata.provider,
  'wechat',
);
assert.equal(partialRecoveryAdmin.stats.createUserAttributes.length, 1);
assert.equal(partialRecoveryAdmin.stats.metadataUpdateAttempts, 2);
assert.equal(partialRecoveryAdmin.identities.size, 1);

const existingActiveAdmin = createMockAuthAdmin();
existingActiveAdmin.identities.set('wx-test-app:existing-active-openid', firstLoginUserId);
existingActiveAdmin.users.set(firstLoginUserId, createWechatAuthUser(firstLoginUserId));
assert.equal(
  await resolveWechatUser(
    existingActiveAdmin.client,
    'wx-test-app',
    'existing-active-openid',
    null,
    identitySecret,
  ),
  firstLoginUserId,
);

const bannedAdmin = createMockAuthAdmin();
bannedAdmin.identities.set('wx-test-app:banned-openid', firstLoginUserId);
bannedAdmin.users.set(firstLoginUserId, createWechatAuthUser(firstLoginUserId, {
  banned_until: '2999-01-01T00:00:00.000Z',
}));
await assertIdentityRejected(bannedAdmin.client, 'banned-openid');

const deletedAdmin = createMockAuthAdmin();
deletedAdmin.identities.set('wx-test-app:deleted-openid', firstLoginUserId);
deletedAdmin.users.set(firstLoginUserId, createWechatAuthUser(firstLoginUserId, {
  deleted_at: '2026-01-01T00:00:00.000Z',
}));
await assertIdentityRejected(deletedAdmin.client, 'deleted-openid');

const missingAdmin = createMockAuthAdmin();
missingAdmin.identities.set('wx-test-app:missing-openid', firstLoginUserId);
await assertIdentityRejected(missingAdmin.client, 'missing-openid');

const providerMismatchAdmin = createMockAuthAdmin();
providerMismatchAdmin.identities.set('wx-test-app:provider-mismatch-openid', firstLoginUserId);
providerMismatchAdmin.users.set(firstLoginUserId, createWechatAuthUser(firstLoginUserId, {
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
}));
await assertIdentityRejected(providerMismatchAdmin.client, 'provider-mismatch-openid');

const conflictingUserAdmin = createMockAuthAdmin();
const conflictingOpenid = 'conflicting-candidate-openid';
const conflictingUserId = await deriveWechatUserId(
  'wx-test-app',
  conflictingOpenid,
  identitySecret,
);
conflictingUserAdmin.users.set(conflictingUserId, {
  id: conflictingUserId,
  email: 'unrelated@example.com',
  app_metadata: { provider: 'email', providers: ['email'] },
});
await assert.rejects(
  () => resolveWechatUser(
    conflictingUserAdmin.client,
    'wx-test-app',
    conflictingOpenid,
    null,
    identitySecret,
  ),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
);
assert.equal(conflictingUserAdmin.identities.size, 0);
assert.equal(conflictingUserAdmin.stats.metadataUpdateAttempts, 0);

const conflictingProviderAdmin = createMockAuthAdmin();
const conflictingProviderOpenid = 'conflicting-provider-openid';
const conflictingProviderUserId = await deriveWechatUserId(
  'wx-test-app',
  conflictingProviderOpenid,
  identitySecret,
);
conflictingProviderAdmin.users.set(conflictingProviderUserId, {
  id: conflictingProviderUserId,
  email: buildWechatSyntheticEmail(conflictingProviderUserId),
  app_metadata: { provider: 'google', providers: ['google'] },
});
await assert.rejects(
  () => resolveWechatUser(
    conflictingProviderAdmin.client,
    'wx-test-app',
    conflictingProviderOpenid,
    null,
    identitySecret,
  ),
  (error) => error?.code === WECHAT_AUTH_ERROR_CODES.AUTH_IDENTITY_ERROR,
);
assert.equal(conflictingProviderAdmin.identities.size, 0);
assert.equal(conflictingProviderAdmin.stats.metadataUpdateAttempts, 0);

const claims = buildWechatJwtClaims(
  derivedIds[0],
  'https://project-ref.supabase.co',
  1_700_000_000,
  900,
);
assert.equal(claims.sub, derivedIds[0]);
assert.equal(claims.role, 'authenticated');
assert.equal(claims.aud, 'authenticated');
assert.equal(claims.exp, 1_700_000_900);

const contractResponse = buildWechatAuthResponse(
  'short-lived-user-token',
  1_700_000_900,
  derivedIds[0],
  { nickname: 'Tester', avatar_url: null },
);
assert.deepEqual(Object.keys(contractResponse.session).sort(), [
  'accessToken',
  'expiresAt',
  'tokenType',
]);
assert.doesNotMatch(
  JSON.stringify(contractResponse),
  /session_key|openid|unionid|AppSecret|service_role|refreshToken|wechat\.askbuddy\.invalid/i,
);

assert.equal(normalizeRateLimit('invalid'), 10);
const buckets = new Map();
assert.equal(consumeRateLimit(buckets, 'client', 1_000, 1).allowed, true);
assert.equal(consumeRateLimit(buckets, 'client', 1_001, 1).allowed, false);

console.log('Schema contract check passed.');
