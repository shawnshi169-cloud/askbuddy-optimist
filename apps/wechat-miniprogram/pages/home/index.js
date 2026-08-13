const { callRpc } = require('../../utils/request');
const { getNavigationLayout } = require('../../utils/navigation');

Page({
  data: {
    navLayout: getNavigationLayout(),
    loading: true,
    list: [],
    error: ''
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 0 });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return {
      title: 'AskBuddy 首页',
      path: '/pages/home/index'
    };
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const list = await callRpc('fetchHomeFeed');
      this.setData({ list, loading: false });
    } catch (error) {
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },

  goAsk() {
    wx.navigateTo({ url: '/pages/ask/index' });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  goDetail(event) {
    const { id } = event.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/question-detail/index?id=${id}` });
  }
});
