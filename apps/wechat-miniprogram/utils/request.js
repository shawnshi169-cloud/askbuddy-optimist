const mock = require('./mock');
const authTransport = require('./auth-transport');

async function callRpc(name, payload = {}) {
  const app = getApp();

  if (app.globalData.legacyDataMode === 'mock') {
    if (typeof mock[name] === 'function') {
      return mock[name](payload.keyword || payload.questionId ? payload.keyword || payload.questionId : payload);
    }
    throw new Error(`mock rpc not found: ${name}`);
  }

  throw new Error('Legacy business API is not enabled for this request.');
}

async function authenticatedRequest(options) {
  const auth = require('./auth');
  return authTransport.requestAuthenticated(options, {
    ensureSession: auth.ensureValidSession,
    reauthenticate: auth.reauthenticate
  });
}

module.exports = {
  authenticatedRequest,
  callRpc
};
