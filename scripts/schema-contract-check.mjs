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

const sharedTypesText = readFileSync(sharedTypesPath, 'utf8');
const sharedApiText = readFileSync(sharedApiPath, 'utf8');
const edgeFunctionText = readFileSync(edgeFunctionPath, 'utf8');
const edgeCoreText = readFileSync(edgeCorePath, 'utf8');
const supabaseConfigText = readFileSync(supabaseConfigPath, 'utf8');

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
assert.match(edgeCoreText, /claim_wechat_identity_v1/);
assert.match(edgeFunctionText, /new SignJWT/);
assert.doesNotMatch(`${edgeFunctionText}\n${edgeCoreText}`, /mock_token/);
assert.doesNotMatch(`${edgeFunctionText}\n${edgeCoreText}`, /\b(?:email|phone|password)\s*:/);
assert.ok(
  edgeFunctionText.indexOf('const userId = await resolveWechatUser')
    < edgeFunctionText.indexOf('const claims = buildWechatJwtClaims'),
  'Final Auth user validation must complete before JWT claims are built.',
);

const {
  WECHAT_AUTH_ERROR_CODES,
  buildWechatAuthResponse,
  buildWechatJwtClaims,
  consumeRateLimit,
  deriveWechatUserId,
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

function createMockAuthAdmin() {
  const users = new Map();
  const identities = new Map();
  const stats = { successfulUserCreates: 0 };

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
          return { data: { user: users.get(userId) ?? null }, error: null };
        },
        async createUser(attributes) {
          if (users.has(attributes.id)) {
            return { data: { user: null }, error: new Error('duplicate') };
          }
          const user = { id: attributes.id, app_metadata: attributes.app_metadata };
          users.set(attributes.id, user);
          stats.successfulUserCreates += 1;
          return { data: { user }, error: null };
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

const mockAdmin = createMockAuthAdmin();
const firstLoginUserId = await resolveWechatUser(
  mockAdmin.client,
  'wx-test-app',
  'first-login-openid',
  null,
  identitySecret,
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
  /session_key|openid|unionid|AppSecret|service_role|refreshToken/i,
);

assert.equal(normalizeRateLimit('invalid'), 10);
const buckets = new Map();
assert.equal(consumeRateLimit(buckets, 'client', 1_000, 1).allowed, true);
assert.equal(consumeRateLimit(buckets, 'client', 1_001, 1).allowed, false);

console.log('Schema contract check passed.');
