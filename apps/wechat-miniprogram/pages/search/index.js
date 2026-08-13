const { callRpc } = require('../../utils/request');
const { getNavigationLayout } = require('../../utils/navigation');

function emptyResultBag() {
  return { question: [], expert: [], skill: [], post: [] };
}

function normalizeQuestion(item) {
  return {
    ...item,
    category_label: item.category_label || item.category || item.channel || 'question',
    view_count_text: String(item.view_count || item.viewCount || 0)
  };
}

Page({
  data: {
    navLayout: getNavigationLayout(),
    keyword: '',
    hotKeywords: ['留学申请', '转行前端', '租房避坑', '摄影入门'],
    hasSearched: false,
    activeType: 'all',
    loading: false,
    resultBag: emptyResultBag(),
    error: ''
  },

  onLoad(options) {
    const keyword = options && options.keyword ? decodeURIComponent(options.keyword) : '';
    if (keyword) {
      this.setData({ keyword });
      this.runSearch();
    }
  },

  onPullDownRefresh() {
    if (!this.data.hasSearched) {
      wx.stopPullDownRefresh();
      return;
    }
    this.runSearch().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return { title: '问问搜索', path: '/pages/search/index' };
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/home/index' });
  },

  goNotifications() {
    wx.switchTab({ url: '/pages/messages/index' });
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  chooseHotKeyword(event) {
    this.setData({ keyword: event.currentTarget.dataset.keyword || '' });
    this.runSearch();
  },

  onConfirmSearch() {
    this.runSearch();
  },

  switchType(event) {
    this.setData({ activeType: event.currentTarget.dataset.type || 'all' });
  },

  showResultGroup(event) {
    this.setData({ activeType: event.currentTarget.dataset.type || 'all' });
  },

  async runSearch() {
    const keyword = this.data.keyword.trim();
    this.setData({ hasSearched: true, loading: true, error: '', resultBag: emptyResultBag() });
    try {
      const result = await callRpc('fetchSearchResult', { keyword });
      const questions = Array.isArray(result) ? result.map(normalizeQuestion) : [];
      this.setData({ resultBag: { question: questions, expert: [], skill: [], post: [] }, loading: false });
    } catch (error) {
      this.setData({ loading: false, error: error.message || '搜索失败' });
    }
  },

  goQuestionDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/question-detail/index?id=${encodeURIComponent(id)}` });
  },

  goExpertDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/expert-detail/index?id=${encodeURIComponent(id)}` });
  },

  goPost() {
    wx.showToast({ title: '动态详情能力准备中', icon: 'none' });
  }
});
