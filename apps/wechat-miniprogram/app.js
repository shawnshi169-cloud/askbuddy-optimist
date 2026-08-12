const auth = require('./utils/auth');
const { getRuntimePolicy } = require('./config/client');

App({
  globalData: {
    designTokens: {
      colorBg: '#F8FDFB',
      colorCard: '#FFFFFF',
      colorPrimary: '#79D5C7',
      colorPrimaryStrong: '#49AA9B',
      colorPrimarySoft: '#ECFBF7',
      colorText: '#1E293B',
      colorTextMuted: '#64748B',
      colorBorder: '#CDEFE7'
    },
    authMode: 'real',
    legacyDataMode: 'disabled',
    runtimeEnvVersion: 'unknown',
    authState: 'unknown',
    authSession: null,
    authToken: '',
    currentUser: null,
    safeAreaBottom: 0,
    statusBarHeight: 0,
    platform: '',
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
    const windowInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : {};
    const deviceInfo = typeof wx.getDeviceInfo === 'function' ? wx.getDeviceInfo() : {};
    const safeArea = windowInfo.safeArea || null;
    const screenHeight = windowInfo.screenHeight || windowInfo.windowHeight || 0;
    const safeAreaBottom = safeArea ? Math.max(0, screenHeight - safeArea.bottom) : 0;
    this.globalData.safeAreaBottom = safeAreaBottom;
    this.globalData.statusBarHeight = windowInfo.statusBarHeight || 0;
    this.globalData.platform = deviceInfo.platform || '';
  }
});
