const DEVELOPMENT_CONFIG_STORAGE_KEY = 'ab_client_config_v1';
const UNKNOWN_ENV_VERSION = 'unknown';

const RUNTIME_POLICY_BY_ENV_VERSION = Object.freeze({
  develop: Object.freeze({
    environment: 'development',
    authMode: 'real',
    legacyDataMode: 'mock'
  }),
  trial: Object.freeze({
    environment: 'staging',
    authMode: 'real',
    legacyDataMode: 'disabled'
  }),
  release: Object.freeze({
    environment: 'production',
    authMode: 'real',
    legacyDataMode: 'disabled'
  })
});

const UNKNOWN_RUNTIME_POLICY = Object.freeze({
  environment: UNKNOWN_ENV_VERSION,
  authMode: 'real',
  legacyDataMode: 'disabled'
});

function isKnownEnvVersion(envVersion) {
  return Object.prototype.hasOwnProperty.call(
    RUNTIME_POLICY_BY_ENV_VERSION,
    envVersion
  );
}

// Client-safe values only. Release automation may replace these placeholders.
const CONFIG_BY_ENV_VERSION = Object.freeze({
  develop: Object.freeze({
    supabaseUrl: '',
    supabasePublishableKey: ''
  }),
  trial: Object.freeze({
    supabaseUrl: '',
    supabasePublishableKey: ''
  }),
  release: Object.freeze({
    supabaseUrl: '',
    supabasePublishableKey: ''
  })
});

function resolveEnvVersion() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    const envVersion = accountInfo && accountInfo.miniProgram
      ? accountInfo.miniProgram.envVersion
      : '';
    return isKnownEnvVersion(envVersion) ? envVersion : UNKNOWN_ENV_VERSION;
  } catch (error) {
    return UNKNOWN_ENV_VERSION;
  }
}

function getRuntimePolicy(envVersion = resolveEnvVersion()) {
  const knownEnvVersion = isKnownEnvVersion(envVersion);
  const policy = knownEnvVersion
    ? RUNTIME_POLICY_BY_ENV_VERSION[envVersion]
    : UNKNOWN_RUNTIME_POLICY;
  return {
    ...policy,
    envVersion: knownEnvVersion ? envVersion : UNKNOWN_ENV_VERSION
  };
}

function readDevelopmentOverride(envVersion) {
  if (envVersion !== 'develop') return {};

  try {
    const value = wx.getStorageSync(DEVELOPMENT_CONFIG_STORAGE_KEY);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    return {
      supabaseUrl: typeof value.supabaseUrl === 'string' ? value.supabaseUrl : '',
      supabasePublishableKey: typeof value.supabasePublishableKey === 'string'
        ? value.supabasePublishableKey
        : ''
    };
  } catch (error) {
    return {};
  }
}

function getClientConfig() {
  const runtimePolicy = getRuntimePolicy();
  const base = CONFIG_BY_ENV_VERSION[runtimePolicy.envVersion] || {
    supabaseUrl: '',
    supabasePublishableKey: ''
  };
  const developmentOverride = readDevelopmentOverride(runtimePolicy.envVersion);

  return {
    ...runtimePolicy,
    supabaseUrl: developmentOverride.supabaseUrl || base.supabaseUrl,
    supabasePublishableKey:
      developmentOverride.supabasePublishableKey || base.supabasePublishableKey
  };
}

module.exports = {
  DEVELOPMENT_CONFIG_STORAGE_KEY,
  getClientConfig,
  getRuntimePolicy,
  resolveEnvVersion
};
