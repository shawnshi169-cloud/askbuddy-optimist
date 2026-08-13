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
    if (tabBar) tabBar.setData({ selected: 3 });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return {
      title: 'AskBuddy 消息',
      path: '/pages/messages/index'
    };
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const list = await callRpc('fetchConversationList');
      this.setData({ list, loading: false });
    } catch (error) {
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  }
});
