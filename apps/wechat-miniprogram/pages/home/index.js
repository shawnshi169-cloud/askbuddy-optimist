const { callRpc } = require('../../utils/request');
const { getNavigationLayout } = require('../../utils/navigation');
const { getHomePresentation } = require('../../utils/presentation-fixtures');

const CATEGORIES = [
  { id: 'education', name: '教育学习', short: '学', tone: 'blue' },
  { id: 'career', name: '职业发展', short: '职', tone: 'green' },
  { id: 'lifestyle', name: '生活服务', short: '生', tone: 'orange' },
  { id: 'hobbies', name: '兴趣技能', short: '技', tone: 'pink' }
];

function normalizeQuestion(item) {
  const authorName = item.asker_name || item.profile_nickname || item.authorName || '问问用户';
  const category = item.category || item.channel || 'question';
  return {
    ...item,
    asker_name: authorName,
    asker_initial: authorName.slice(0, 1),
    created_at_text: item.created_at_text || item.created_at || item.createdAt || '最近发布',
    category_label: item.category_label || category,
    view_count_text: String(item.view_count || item.viewCount || 0),
    reward_points_text: String(item.reward_points || item.rewardPoints || 0)
  };
}

const presentation = getHomePresentation();

Page({
  data: {
    navLayout: getNavigationLayout(),
    currentCity: '全国',
    categories: CATEGORIES,
    hotTopics: presentation.hotTopics,
    experts: presentation.experts,
    presentationEnabled: presentation.enabled,
    activeFeed: 'questions',
    loading: true,
    list: [],
    error: ''
  },

  onLoad() {
    const currentCity = wx.getStorageSync('ab_selected_city_v1');
    if (typeof currentCity === 'string' && currentCity) this.setData({ currentCity });
    this.loadData();
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 0 });
    const currentCity = wx.getStorageSync('ab_selected_city_v1');
    if (typeof currentCity === 'string' && currentCity !== this.data.currentCity) {
      this.setData({ currentCity });
    }
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return { title: '问问首页', path: '/pages/home/index' };
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callRpc('fetchHomeFeed');
      const list = Array.isArray(result) ? result.map(normalizeQuestion) : [];
      this.setData({ list, loading: false });
    } catch (error) {
      this.setData({ loading: false, error: error.message || '加载失败' });
    }
  },

  switchFeed(event) {
    this.setData({ activeFeed: event.currentTarget.dataset.feed || 'questions' });
  },

  goAsk(event) {
    const expertName = event.currentTarget.dataset.expertName || '';
    const query = expertName ? `?expertName=${encodeURIComponent(expertName)}` : '';
    wx.navigateTo({ url: `/pages/ask/index${query}` });
  },

  goSearch() {
    wx.navigateTo({ url: '/pages/search/index' });
  },

  goNotifications() {
    wx.switchTab({ url: '/pages/messages/index' });
  },

  goCitySelector() {
    wx.navigateTo({ url: '/pages/city-selector/index' });
  },

  openCategory(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/channel/index?id=${encodeURIComponent(id)}` });
  },

  openTopic(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/topic-detail/index?id=${encodeURIComponent(id)}` });
  },

  openFirstTopic() {
    const first = this.data.hotTopics[0];
    if (first) {
      this.openTopic({ currentTarget: { dataset: { id: first.id } } });
      return;
    }
    wx.showToast({ title: '专题能力准备中', icon: 'none' });
  },

  openExpert(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/expert-detail/index?id=${encodeURIComponent(id)}` });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/question-detail/index?id=${encodeURIComponent(id)}` });
  }
});
