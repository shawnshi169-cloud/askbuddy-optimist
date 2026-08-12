const auth = require('./utils/auth');
const { getRuntimePolicy } = require('./config/client');

App({
  globalData: {
    designTokens: {
      colorBg: '#F7FAF8',
      colorCard: '#FFFFFF',
      colorPrimary: '#18A058',
      colorText: '#1F2937',
      colorTextMuted: '#6B7280',
      colorBorder: '#E5E7EB'
    },
    authMode: 'real',
    legacyDataMode: 'disabled',
    runtimeEnvVersion: 'unknown',
    authState: 'unknown',
    authSession: null,
    authToken: '',
    currentUser: null,
    safeAreaBottom: 0,
    conflictPolicy: 'A'
  },

  onLaunch() {
    const runtimePolicy = getRuntimePolicy();
    this.globalData.authMode = runtimePolicy.authMode;
    this.globalData.legacyDataMode = runtimePolicy.legacyDataMode;
    this.globalData.runtimeEnvVersion = runtimePolicy.envVersion;
    this.initSafeArea();
    auth.restoreSession();
  },

  initSafeArea() {
    const systemInfo = wx.getSystemInfoSync();
    const safeArea = systemInfo.safeArea || null;
    const safeAreaBottom = safeArea ? Math.max(0, systemInfo.screenHeight - safeArea.bottom) : 0;
    this.globalData.safeAreaBottom = safeAreaBottom;
  }
});
