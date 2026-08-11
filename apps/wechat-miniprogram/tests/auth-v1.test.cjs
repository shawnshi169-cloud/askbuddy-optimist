const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const miniProgramRoot = path.resolve(__dirname, '..');
const authPath = require.resolve('../utils/auth');
const transport = require('../utils/auth-transport');
const originalCallWechatAuth = transport.callWechatAuth;
const storage = new Map();
const app = { globalData: {} };

const TEST_CONFIG = {
  environment: 'development',
  envVersion: 'develop',
  supabaseUrl: 'https://example.supabase.co',
  supabasePublishableKey: 'sb_publishable_test_value'
};

function futureSeconds(offset = 900) {
  return Math.floor(Date.now() / 1000) + offset;
}

function validResponse(overrides = {}) {
  return {
    session: {
      accessToken: 'header.payload.signature',
      expiresAt: futureSeconds(),
      tokenType: 'bearer',
      ...(overrides.session || {})
    },
    user: {
      id: '00000000-0000-8000-8000-000000000001',
      nickname: 'Mini User',
      avatarUrl: null,
      ...(overrides.user || {})
    }
  };
}

function installWx({ login, request, getUserProfile } = {}) {
  global.wx = {
    login: login || ((options) => options.success({ code: 'temporary-code' })),
    request: request || ((options) => options.success({ statusCode: 200, data: validResponse() })),
    getUserProfile,
    getAccountInfoSync: () => ({ miniProgram: { envVersion: 'develop' } }),
    getStorageSync: (key) => storage.get(key),
    setStorageSync: (key, value) => storage.set(key, value),
    removeStorageSync: (key) => storage.delete(key)
  };
  global.getApp = () => app;
}

function freshAuth() {
  delete require.cache[authPath];
  return require(authPath);
}

function reset() {
  storage.clear();
  app.globalData = {};
  transport.callWechatAuth = originalCallWechatAuth;
  installWx();
}

async function run(name, test) {
  reset();
  await test();
  process.stdout.write(`PASS ${name}\n`);
}

function backendErrorResponse(code, statusCode, retryAfter = '') {
  return {
    statusCode,
    header: retryAfter ? { 'Retry-After': retryAfter } : {},
    data: {
      error: {
        code,
        message: `${code} message`,
        requestId: 'request-id'
      }
    }
  };
}

(async () => {
  await run('wx.login without code rejects', async () => {
    installWx({ login: (options) => options.success({}) });
    const auth = freshAuth();
    await assert.rejects(auth.loginWithWechat(), (error) => error.kind === 'wechat');
    assert.equal(auth.getAuthSnapshot().authState, 'anonymous');
  });

  await run('backend success saves session and user', async () => {
    const auth = freshAuth();
    transport.callWechatAuth = async () => validResponse();
    const result = await auth.loginWithWechat();
    assert.equal(result.authState, 'authenticated');
    assert.equal(storage.get(auth.STORAGE_KEYS.session).tokenType, 'bearer');
    assert.equal(storage.get(auth.STORAGE_KEYS.user).nickname, 'Mini User');
  });

  await run('null nickname remains authenticated', async () => {
    const auth = freshAuth();
    transport.callWechatAuth = async () => validResponse({ user: { nickname: null } });
    const result = await auth.loginWithWechat();
    assert.equal(result.authState, 'authenticated');
    assert.equal(result.user.nickname, null);
  });

  await run('valid stored session restores authenticated', async () => {
    const seed = freshAuth();
    const response = validResponse();
    storage.set(seed.STORAGE_KEYS.session, response.session);
    storage.set(seed.STORAGE_KEYS.user, response.user);
    const auth = freshAuth();
    assert.equal(auth.restoreSession().authState, 'authenticated');
  });

  await run('expired stored session does not restore', async () => {
    const seed = freshAuth();
    const response = validResponse({ session: { expiresAt: futureSeconds(-10) } });
    storage.set(seed.STORAGE_KEYS.session, response.session);
    storage.set(seed.STORAGE_KEYS.user, response.user);
    const auth = freshAuth();
    assert.equal(auth.restoreSession().authState, 'anonymous');
    assert.equal(storage.has(seed.STORAGE_KEYS.session), false);
  });

  await run('legacy mock token is rejected and cleared', async () => {
    const auth = freshAuth();
    storage.set(auth.STORAGE_KEYS.legacyToken, 'mock_token_legacy');
    assert.equal(auth.restoreSession().authState, 'anonymous');
    assert.equal(storage.has(auth.STORAGE_KEYS.legacyToken), false);
  });

  await run('malformed backend response rejects', async () => {
    const auth = freshAuth();
    transport.callWechatAuth = async () => ({ session: {}, user: {} });
    await assert.rejects(auth.loginWithWechat(), (error) => error.kind === 'invalid_response');
  });

  await run('INVALID_WECHAT_CODE is normalized', async () => {
    await assert.rejects(
      transport.callWechatAuth('code', {
        config: TEST_CONFIG,
        requestImpl: (options) => options.success(backendErrorResponse('INVALID_WECHAT_CODE', 401))
      }),
      (error) => error.kind === 'backend' && error.code === 'INVALID_WECHAT_CODE'
    );
  });

  await run('RATE_LIMITED and Retry-After are normalized', async () => {
    await assert.rejects(
      transport.callWechatAuth('code', {
        config: TEST_CONFIG,
        requestImpl: (options) => options.success(backendErrorResponse('RATE_LIMITED', 429, '7'))
      }),
      (error) => error.code === 'RATE_LIMITED' && error.retryAfterSeconds === 7
    );
  });

  await run('network failure never falls back to mock login', async () => {
    storage.set('ab_client_config_v1', TEST_CONFIG);
    installWx({ request: (options) => options.fail({ errMsg: 'request:fail network' }) });
    const auth = freshAuth();
    await assert.rejects(auth.loginWithWechat(), (error) => error.kind === 'network');
    assert.equal(auth.getAuthSnapshot().authState, 'anonymous');
    assert.equal(storage.has(auth.STORAGE_KEYS.session), false);
  });

  await run('simultaneous re-auth uses one login exchange', async () => {
    let loginCount = 0;
    let exchangeCount = 0;
    let releaseExchange;
    installWx({
      login: (options) => {
        loginCount += 1;
        options.success({ code: 'temporary-code' });
      }
    });
    const auth = freshAuth();
    transport.callWechatAuth = () => {
      exchangeCount += 1;
      return new Promise((resolve) => {
        releaseExchange = () => resolve(validResponse());
      });
    };
    const first = auth.ensureValidSession();
    const second = auth.ensureValidSession();
    await new Promise((resolve) => setImmediate(resolve));
    releaseExchange();
    await Promise.all([first, second]);
    assert.equal(loginCount, 1);
    assert.equal(exchangeCount, 1);
  });

  await run('logout clears memory and versioned storage', async () => {
    const auth = freshAuth();
    transport.callWechatAuth = async () => validResponse();
    await auth.loginWithWechat();
    const result = auth.logout();
    assert.equal(result.authState, 'anonymous');
    assert.equal(result.session, null);
    assert.equal(result.user, null);
    assert.equal(storage.size, 0);
  });

  await run('wx.getUserProfile is not an auth prerequisite', async () => {
    let profileCalls = 0;
    installWx({
      getUserProfile: () => {
        profileCalls += 1;
        throw new Error('must not be called');
      }
    });
    const auth = freshAuth();
    transport.callWechatAuth = async () => validResponse();
    await auth.loginWithWechat();
    assert.equal(profileCalls, 0);
  });

  await run('production auth path does not generate mock tokens', async () => {
    const runtimeFiles = [
      'app.js',
      'pages/profile/index.js',
      'utils/auth.js',
      'utils/auth-transport.js'
    ];
    const source = runtimeFiles
      .map((file) => fs.readFileSync(path.join(miniProgramRoot, file), 'utf8'))
      .join('\n');
    assert.equal(source.includes('mock_' + 'token'), false);
  });

  await run('Mini Program runtime contains no server-only secret identifiers', async () => {
    const prohibited = [
      'WECHAT_' + 'APP_SECRET',
      'SERVICE_' + 'ROLE',
      'PRIVATE_' + 'JWK',
      'WECHAT_IDENTITY_' + 'HMAC_SECRET',
      'session_' + 'key',
      'open' + 'id',
      'union' + 'id'
    ];
    const runtimeFiles = [];
    const visit = (directory) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const fullPath = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'tests') visit(fullPath);
        } else if (entry.name.endsWith('.js')) {
          runtimeFiles.push(fullPath);
        }
      }
    };
    visit(miniProgramRoot);
    const source = runtimeFiles.map((file) => fs.readFileSync(file, 'utf8')).join('\n');
    for (const identifier of prohibited) {
      assert.equal(source.includes(identifier), false, `runtime contains ${identifier}`);
    }
  });

  await run('401 recovery retries at most once', async () => {
    let requestCount = 0;
    let reauthCount = 0;
    await assert.rejects(
      transport.requestAuthenticated({ url: 'https://example.supabase.co/rest/v1/profiles' }, {
        config: TEST_CONFIG,
        ensureSession: async () => ({ session: validResponse().session }),
        reauthenticate: async () => {
          reauthCount += 1;
          return { session: validResponse({ session: { accessToken: 'new.token.value' } }).session };
        },
        requestImpl: (options) => {
          requestCount += 1;
          options.success({ statusCode: 401, data: {} });
        }
      }),
      (error) => error.kind === 'unauthorized'
    );
    assert.equal(requestCount, 2);
    assert.equal(reauthCount, 1);
  });

  await run('missing client config fails closed', async () => {
    await assert.rejects(
      transport.callWechatAuth('code', {
        config: { supabaseUrl: '', supabasePublishableKey: '' },
        requestImpl: () => assert.fail('request must not start')
      }),
      (error) => error.kind === 'configuration'
    );
  });

  process.stdout.write('WeChat Auth v1 Mini Program consumer tests passed.\n');
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
