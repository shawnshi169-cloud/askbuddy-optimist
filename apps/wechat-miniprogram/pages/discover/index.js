const { callRpc } = require('../../utils/request');
const { getRuntimePolicy } = require('../../config/client');
const { getNavigationLayout } = require('../../utils/navigation');

function normalizePost(item) {
  return {
    ...item,
    author_initial: item.author_initial || '问',
    author_name: item.author_name || '问问专题',
    created_at_text: item.created_at_text || item.created_at || 'Development preview',
    content: item.content || item.title || '',
    tags: Array.isArray(item.tags) ? item.tags : ['经验交流'],
    likes_count: item.likes_count || 0,
    comments_count: item.comments_count || 0,
    shares_count: item.shares_count || 0
  };
}

const runtimePolicy = getRuntimePolicy();

Page({
  data: {
    navLayout: getNavigationLayout(),
    activeChannel: 'recommended',
    activeSort: 'latest',
    topicTags: ['真实经历', '避坑指南', '学习成长', '职场经验'],
    previewMode: runtimePolicy.envVersion === 'develop' && runtimePolicy.legacyDataMode === 'mock',
    loading: true,
    list: [],
    displayList: [],
    selectedPost: null,
    postDetailVisible: false,
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
    const selected = this.data.selectedPost;
    return { title: selected ? selected.content : '问问发现', path: '/pages/discover/index' };
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callRpc('fetchDiscoverFeed');
      const list = Array.isArray(result) ? result.map(normalizePost) : [];
      this.setData({ list, loading: false }, () => this.applyFilters());
    } catch (error) {
      this.setData({ loading: false, list: [], displayList: [], error: error.message || '加载失败' });
    }
  },

  applyFilters() {
    let displayList = this.data.activeChannel === 'recommended' ? this.data.list.slice() : [];
    if (this.data.activeSort === 'popular') {
      displayList = displayList.sort((left, right) => Number(right.hot) - Number(left.hot));
    }
    this.setData({ displayList });
  },

  switchChannel(event) {
    this.setData({ activeChannel: event.currentTarget.dataset.channel || 'recommended' }, () => this.applyFilters());
  },

  switchSort(event) {
    this.setData({ activeSort: event.currentTarget.dataset.sort || 'latest' }, () => this.applyFilters());
  },

  goAsk() {
    wx.navigateTo({ url: '/pages/post-editor/index' });
  },

  goInteractions() {
    wx.navigateTo({ url: '/pages/discover-interactions/index' });
  },

  openPost(event) {
    const selectedPost = this.data.displayList.find((item) => item.id === event.currentTarget.dataset.id);
    if (selectedPost) this.setData({ selectedPost, postDetailVisible: true });
  },

  closePostDetail() {
    this.setData({ selectedPost: null, postDetailVisible: false });
  },

  keepPostDetail() {},

  interact() {
    wx.showToast({ title: '互动写入功能准备中', icon: 'none' });
  },

  prepareShare() {}
});
