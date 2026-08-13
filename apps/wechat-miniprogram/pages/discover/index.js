const { callRpc } = require('../../utils/request');

Page({
  data: {
    loading: true,
    list: [],
    error: ''
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 1 });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return {
      title: 'AskBuddy 发现',
      path: '/pages/discover/index'
    };
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const list = await callRpc('fetchDiscoverFeed');
      this.setData({ list, loading: false });
    } catch (error) {
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  }
});
