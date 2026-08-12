const { getClientConfig } = require('../config/client');

const AUTH_ERROR_CODES = new Set([
  'INVALID_REQUEST',
  'INVALID_WECHAT_CODE',
  'WECHAT_UPSTREAM_ERROR',
  'AUTH_IDENTITY_ERROR',
  'AUTH_SESSION_ERROR',
  'RATE_LIMITED'
]);

class AuthClientError extends Error {
  constructor({ kind, message, code = null, requestId = null, statusCode = 0, retryAfterSeconds = 0, cause = null }) {
    super(message);
    this.name = 'AuthClientError';
    this.kind = kind;
    this.code = code;
    this.requestId = requestId;
    this.statusCode = statusCode;
    this.retryAfterSeconds = retryAfterSeconds;
    this.cause = cause;
  }
}

function configurationError(message) {
  return new AuthClientError({ kind: 'configuration', message });
}

function validateClientConfig(source = getClientConfig()) {
  const knownEnvVersions = new Set(['develop', 'trial', 'release']);
  if (!source || !knownEnvVersions.has(source.envVersion)) {
    throw configurationError('Mini Program runtime environment is unknown.');
  }

  const supabaseUrl = typeof source.supabaseUrl === 'string'
    ? source.supabaseUrl.trim().replace(/\/+$/, '')
    : '';
  const supabasePublishableKey = typeof source.supabasePublishableKey === 'string'
    ? source.supabasePublishableKey.trim()
    : '';

  if (!supabaseUrl || !/^https:\/\/[^/]+/i.test(supabaseUrl)) {
    throw configurationError('Mini Program SUPABASE_URL is not configured.');
  }
  if (!supabasePublishableKey) {
    throw configurationError('Mini Program Supabase publishable key is not configured.');
  }

  return {
    ...source,
    supabaseUrl,
    supabasePublishableKey
  };
}

function normalizeNetworkFailure(cause) {
  const message = cause && cause.errMsg ? String(cause.errMsg) : '';
  const isTimeout = /timeout/i.test(message);
  return new AuthClientError({
    kind: isTimeout ? 'timeout' : 'network',
    message: isTimeout ? 'Authentication request timed out.' : 'Authentication network request failed.',
    cause
  });
}

function wxRequest(options, requestImpl) {
  const invoke = requestImpl || (typeof wx !== 'undefined' ? wx.request : null);
  if (typeof invoke !== 'function') {
    return Promise.reject(configurationError('wx.request is unavailable.'));
  }

  return new Promise((resolve, reject) => {
    try {
      invoke({
        ...options,
        success: resolve,
        fail: (cause) => reject(normalizeNetworkFailure(cause))
      });
    } catch (cause) {
      reject(normalizeNetworkFailure(cause));
    }
  });
}

function readHeader(headers, name) {
  if (!headers || typeof headers !== 'object') return '';
  const expected = name.toLowerCase();
  const key = Object.keys(headers).find((item) => item.toLowerCase() === expected);
  return key ? String(headers[key]) : '';
}

function normalizeBackendAuthError(response) {
  const statusCode = Number(response && response.statusCode) || 0;
  const payload = response && response.data && response.data.error;
  const retryAfterValue = Number(readHeader(response && response.header, 'retry-after'));

  if (
    payload
    && AUTH_ERROR_CODES.has(payload.code)
    && typeof payload.message === 'string'
    && typeof payload.requestId === 'string'
  ) {
    return new AuthClientError({
      kind: 'backend',
      code: payload.code,
      message: payload.message,
      requestId: payload.requestId,
      statusCode,
      retryAfterSeconds: Number.isFinite(retryAfterValue) && retryAfterValue > 0
        ? retryAfterValue
        : 0
    });
  }

  return new AuthClientError({
    kind: 'invalid_response',
    message: 'Authentication service returned an invalid error response.',
    statusCode
  });
}

function validateWechatAuthResponse(payload) {
  const session = payload && payload.session;
  const user = payload && payload.user;
  const validSession = session
    && typeof session.accessToken === 'string'
    && session.accessToken.length > 0
    && Number.isInteger(session.expiresAt)
    && session.expiresAt > 0
    && session.tokenType === 'bearer';
  const validUser = user
    && typeof user.id === 'string'
    && user.id.length > 0
    && (user.nickname === null || typeof user.nickname === 'string')
    && (user.avatarUrl === null || typeof user.avatarUrl === 'string');

  if (!validSession || !validUser) {
    throw new AuthClientError({
      kind: 'invalid_response',
      message: 'Authentication service returned an invalid response.'
    });
  }

  return {
    session: {
      accessToken: session.accessToken,
      expiresAt: session.expiresAt,
      tokenType: 'bearer'
    },
    user: {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl
    }
  };
}

async function callWechatAuth(code, options = {}) {
  if (typeof code !== 'string' || !code.trim()) {
    throw new AuthClientError({
      kind: 'wechat',
      message: 'wx.login did not return a temporary code.'
    });
  }

  const config = validateClientConfig(options.config || getClientConfig());
  const response = await wxRequest({
    url: `${config.supabaseUrl}/functions/v1/wechat-auth`,
    method: 'POST',
    timeout: options.timeout || 10000,
    header: {
      'Content-Type': 'application/json',
      apikey: config.supabasePublishableKey
    },
    data: { code }
  }, options.requestImpl);

  if (response.statusCode >= 200 && response.statusCode < 300) {
    return validateWechatAuthResponse(response.data);
  }
  throw normalizeBackendAuthError(response);
}

function resolveSession(authResult) {
  const session = authResult && authResult.session ? authResult.session : authResult;
  if (!session || typeof session.accessToken !== 'string' || !session.accessToken) {
    throw new AuthClientError({
      kind: 'invalid_response',
      message: 'Authenticated request is missing a valid session.'
    });
  }
  return session;
}

async function performAuthenticatedRequest(options, session, config, requestImpl) {
  return wxRequest({
    ...options,
    timeout: options.timeout || 10000,
    header: {
      ...(options.header || {}),
      apikey: config.supabasePublishableKey,
      Authorization: `Bearer ${session.accessToken}`
    }
  }, requestImpl);
}

function normalizeAuthenticatedHttpError(response) {
  const statusCode = Number(response && response.statusCode) || 0;
  return new AuthClientError({
    kind: statusCode === 401 ? 'unauthorized' : 'backend',
    message: statusCode === 401
      ? 'Authenticated session was rejected.'
      : 'Authenticated request failed.',
    statusCode
  });
}

async function requestAuthenticated(options, dependencies = {}) {
  const ensureSession = dependencies.ensureSession;
  const reauthenticate = dependencies.reauthenticate;
  if (typeof ensureSession !== 'function' || typeof reauthenticate !== 'function') {
    throw configurationError('Authenticated request dependencies are unavailable.');
  }

  const config = validateClientConfig(dependencies.config || getClientConfig());
  let session = resolveSession(await ensureSession());
  let response = await performAuthenticatedRequest(
    options,
    session,
    config,
    dependencies.requestImpl
  );

  if (response.statusCode === 401) {
    session = resolveSession(await reauthenticate());
    response = await performAuthenticatedRequest(
      options,
      session,
      config,
      dependencies.requestImpl
    );
  }

  if (response.statusCode >= 200 && response.statusCode < 300) return response.data;
  throw normalizeAuthenticatedHttpError(response);
}

module.exports = {
  AUTH_ERROR_CODES,
  AuthClientError,
  callWechatAuth,
  normalizeBackendAuthError,
  requestAuthenticated,
  validateClientConfig,
  validateWechatAuthResponse
};
