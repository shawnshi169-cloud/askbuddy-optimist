const transport = require('./auth-transport');

const STORAGE_KEYS = Object.freeze({
  session: 'ab_auth_session_v1',
  user: 'ab_auth_user_v1',
  legacyToken: 'ab_auth_token'
});

const CLOCK_SKEW_SECONDS = 30;
const AUTH_STATES = Object.freeze({
  unknown: 'unknown',
  anonymous: 'anonymous',
  authenticating: 'authenticating',
  authenticated: 'authenticated',
  reauthenticating: 'reauthenticating'
});

let currentSession = null;
let currentUser = null;
let authState = AUTH_STATES.unknown;
let inFlightAuthPromise = null;

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function isSessionShapeValid(session) {
  return Boolean(
    session
    && typeof session.accessToken === 'string'
    && session.accessToken.length > 0
    && Number.isInteger(session.expiresAt)
    && session.expiresAt > 0
    && session.tokenType === 'bearer'
  );
}

function isSessionValid(session, atSeconds = nowSeconds()) {
  return isSessionShapeValid(session)
    && session.expiresAt > atSeconds + CLOCK_SKEW_SECONDS;
}

function isUserValid(user) {
  return Boolean(
    user
    && typeof user.id === 'string'
    && user.id.length > 0
    && (user.nickname === null || typeof user.nickname === 'string')
    && (user.avatarUrl === null || typeof user.avatarUrl === 'string')
  );
}

function updateGlobalState() {
  if (typeof getApp !== 'function') return;
  const app = getApp();
  if (!app || !app.globalData) return;

  app.globalData.authState = authState;
  app.globalData.authSession = currentSession;
  app.globalData.authToken = currentSession ? currentSession.accessToken : '';
  app.globalData.currentUser = currentUser;
}

function setAuthState(nextState, session = currentSession, user = currentUser) {
  authState = nextState;
  currentSession = session;
  currentUser = user;
  updateGlobalState();
}

function removeStorage(key) {
  try {
    wx.removeStorageSync(key);
  } catch (error) {
    // Storage cleanup is best effort; auth state still fails closed in memory.
  }
}

function clearStoredAuth() {
  removeStorage(STORAGE_KEYS.session);
  removeStorage(STORAGE_KEYS.user);
  removeStorage(STORAGE_KEYS.legacyToken);
}

function persistAuth(session, user) {
  wx.setStorageSync(STORAGE_KEYS.session, session);
  wx.setStorageSync(STORAGE_KEYS.user, user);
}

function clearSession() {
  clearStoredAuth();
  setAuthState(AUTH_STATES.anonymous, null, null);
}

function getAuthSnapshot() {
  if (
    authState === AUTH_STATES.authenticated
    && (!isSessionValid(currentSession) || !isUserValid(currentUser))
  ) {
    clearSession();
  }
  return {
    authState,
    session: currentSession,
    user: currentUser
  };
}

function restoreSession(atSeconds = nowSeconds()) {
  removeStorage(STORAGE_KEYS.legacyToken);

  let storedSession = null;
  let storedUser = null;
  try {
    storedSession = wx.getStorageSync(STORAGE_KEYS.session);
    storedUser = wx.getStorageSync(STORAGE_KEYS.user);
  } catch (error) {
    clearSession();
    return getAuthSnapshot();
  }

  if (isSessionValid(storedSession, atSeconds) && isUserValid(storedUser)) {
    setAuthState(AUTH_STATES.authenticated, storedSession, storedUser);
    return getAuthSnapshot();
  }

  clearSession();
  return getAuthSnapshot();
}

function requestWxLogin() {
  return new Promise((resolve, reject) => {
    try {
      wx.login({
        success: resolve,
        fail: (cause) => reject(new transport.AuthClientError({
          kind: 'wechat',
          message: 'Unable to obtain a WeChat login code.',
          cause
        }))
      });
    } catch (cause) {
      reject(new transport.AuthClientError({
        kind: 'wechat',
        message: 'Unable to obtain a WeChat login code.',
        cause
      }));
    }
  });
}

async function performLogin(nextState) {
  setAuthState(nextState, null, null);

  try {
    const loginResult = await requestWxLogin();
    if (!loginResult || typeof loginResult.code !== 'string' || !loginResult.code) {
      throw new transport.AuthClientError({
        kind: 'wechat',
        message: 'wx.login did not return a temporary code.'
      });
    }

    const result = transport.validateWechatAuthResponse(
      await transport.callWechatAuth(loginResult.code)
    );
    if (!isSessionValid(result.session)) {
      throw new transport.AuthClientError({
        kind: 'invalid_response',
        message: 'Authentication service returned an expired session.'
      });
    }
    persistAuth(result.session, result.user);
    setAuthState(AUTH_STATES.authenticated, result.session, result.user);
    return getAuthSnapshot();
  } catch (error) {
    clearSession();
    throw error;
  }
}

function startLogin(nextState) {
  if (inFlightAuthPromise) return inFlightAuthPromise;
  inFlightAuthPromise = performLogin(nextState).finally(() => {
    inFlightAuthPromise = null;
  });
  return inFlightAuthPromise;
}

function loginWithWechat() {
  return startLogin(AUTH_STATES.authenticating);
}

function reauthenticate() {
  if (inFlightAuthPromise) return inFlightAuthPromise;
  clearSession();
  return startLogin(AUTH_STATES.reauthenticating);
}

function ensureValidSession() {
  if (authState === AUTH_STATES.unknown) restoreSession();
  if (isSessionValid(currentSession) && isUserValid(currentUser)) {
    return Promise.resolve(getAuthSnapshot());
  }
  return reauthenticate();
}

function getSession() {
  return currentSession;
}

function getAccessToken() {
  return isSessionValid(currentSession) ? currentSession.accessToken : '';
}

function logout() {
  clearSession();
  return getAuthSnapshot();
}

module.exports = {
  AUTH_STATES,
  CLOCK_SKEW_SECONDS,
  STORAGE_KEYS,
  clearSession,
  ensureValidSession,
  getAccessToken,
  getAuthSnapshot,
  getSession,
  isSessionValid,
  loginWithWechat,
  logout,
  reauthenticate,
  restoreSession
};
