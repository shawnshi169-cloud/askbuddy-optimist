const auth = require('../../utils/auth');
const { getNavigationLayout } = require('../../utils/navigation');

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
    navLayout: getNavigationLayout(),
    user: null,
    authState: 'unknown',
    tokenReady: false,
    loginLoading: false,
    authError: '',
    stats: [
      { key: 'orders', label: '订单', value: 0 },
      { key: 'answers', label: '回答', value: 0 },
      { key: 'favorites', label: '收藏', value: 0 },
      { key: 'following', label: '关注', value: 0 }
    ],
    commonActions: [
      { key: 'earnings', label: '我的收益', short: '益', tone: 'gold' },
      { key: 'community', label: '我的社群', short: '群', tone: 'blue' },
      { key: 'drafts', label: '草稿箱', short: '稿', tone: 'mint' },
      { key: 'verify', label: '达人认证', short: '认', tone: 'orange' }
    ],
    helpItems: [
      { key: 'help', title: '帮助中心', desc: '常见问题和使用说明', short: '?' },
      { key: 'rules', title: '问问规范', desc: '查看发帖和互动规则', short: '规' },
      { key: 'feedback', title: '产品反馈', desc: '告诉我们你的建议', short: '信' },
      { key: 'about', title: '关于问问', desc: '版本信息与服务说明', short: '问' }
    ]
  },

  onLoad() {
    this.syncUser();
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 4 });
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
      tokenReady: Boolean(auth.getAccessToken()),
      loginLoading: snapshot.authState === 'authenticating'
        || snapshot.authState === 'reauthenticating'
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
  },

  openEntry(event) {
    const { key, label } = event.currentTarget.dataset;
    if (this.data.authState !== 'authenticated') {
      wx.showToast({ title: '请先完成微信登录', icon: 'none' });
      return;
    }
    wx.navigateTo({
      url: `/pages/profile-section/index?key=${encodeURIComponent(key || '')}&title=${encodeURIComponent(label || '')}`
    });
  },

  openPublicEntry(event) {
    const { key, label } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/profile-section/index?key=${encodeURIComponent(key || '')}&title=${encodeURIComponent(label || '')}`
    });
  }
});
