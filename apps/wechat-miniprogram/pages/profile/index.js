const auth = require('../../utils/auth');

const AUTH_ERROR_MESSAGES = {
  INVALID_REQUEST: '登录请求无效，请重试',
  INVALID_WECHAT_CODE: '微信登录凭证已失效，请重试',
  WECHAT_UPSTREAM_ERROR: '微信登录服务暂时不可用',
  AUTH_IDENTITY_ERROR: '暂时无法确认登录身份',
  AUTH_SESSION_ERROR: '暂时无法创建登录会话',
  RATE_LIMITED: '操作过于频繁，请稍后重试'
};

function getErrorMessage(error) {
  if (error && error.code && AUTH_ERROR_MESSAGES[error.code]) {
    return AUTH_ERROR_MESSAGES[error.code];
  }
  if (error && error.kind === 'configuration') return '登录环境尚未配置';
  if (error && error.kind === 'timeout') return '登录请求超时，请重试';
  if (error && error.kind === 'network') return '网络连接失败，请检查网络后重试';
  return '微信登录失败，请重试';
}

Page({
  data: {
    user: null,
    authState: 'unknown',
    tokenReady: false,
    loginLoading: false,
    authError: ''
  },

  onLoad() {
    this.syncUser();
  },

  onShow() {
    this.syncUser();
  },

  onPullDownRefresh() {
    this.syncUser();
    wx.stopPullDownRefresh();
  },

  onShareAppMessage() {
    return {
      title: 'AskBuddy 我的',
      path: '/pages/profile/index'
    };
  },

  syncUser() {
    const snapshot = auth.getAuthSnapshot();
    this.setData({
      user: snapshot.user,
      authState: snapshot.authState,
      tokenReady: Boolean(auth.getAccessToken())
    });
  },

  async login() {
    if (this.data.loginLoading) return;
    this.setData({ loginLoading: true, authError: '' });
    try {
      await auth.loginWithWechat();
      this.syncUser();
      wx.showToast({ title: '登录成功', icon: 'success' });
    } catch (error) {
      const message = getErrorMessage(error);
      this.setData({ authError: message });
      wx.showToast({ title: message, icon: 'none' });
    } finally {
      this.setData({ loginLoading: false });
      this.syncUser();
    }
  },

  logout() {
    auth.logout();
    this.setData({ authError: '' });
    this.syncUser();
    wx.showToast({ title: '已退出登录', icon: 'none' });
  }
});
