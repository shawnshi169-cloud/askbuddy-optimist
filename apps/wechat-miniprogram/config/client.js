const DEVELOPMENT_CONFIG_STORAGE_KEY = 'ab_client_config_v1';

// Client-safe values only. Release automation may replace these placeholders.
const CONFIG_BY_ENV_VERSION = Object.freeze({
  develop: Object.freeze({
    environment: 'development',
    supabaseUrl: '',
    supabasePublishableKey: ''
  }),
  trial: Object.freeze({
    environment: 'staging',
    supabaseUrl: '',
    supabasePublishableKey: ''
  }),
  release: Object.freeze({
    environment: 'production',
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
    return CONFIG_BY_ENV_VERSION[envVersion] ? envVersion : 'develop';
  } catch (error) {
    return 'develop';
  }
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
  const envVersion = resolveEnvVersion();
  const base = CONFIG_BY_ENV_VERSION[envVersion];
  const developmentOverride = readDevelopmentOverride(envVersion);

  return {
    environment: base.environment,
    envVersion,
    supabaseUrl: developmentOverride.supabaseUrl || base.supabaseUrl,
    supabasePublishableKey:
      developmentOverride.supabasePublishableKey || base.supabasePublishableKey
  };
}

module.exports = {
  DEVELOPMENT_CONFIG_STORAGE_KEY,
  getClientConfig,
  resolveEnvVersion
};
