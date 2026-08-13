const { callRpc } = require('../../utils/request');
const { getNavigationLayout } = require('../../utils/navigation');
const {
  getChannelPresentation,
  getExpertsForChannel
} = require('../../utils/presentation-fixtures');

function normalizeQuestion(item, channel) {
  const authorName = item.asker_name || item.profile_nickname || item.authorName || '问问用户';
  return {
    ...item,
    asker_name: authorName,
    asker_initial: authorName.slice(0, 1),
    created_at_text: item.created_at_text || item.created_at || item.createdAt || '最近发布',
    view_count_text: String(item.view_count || item.viewCount || 0),
    reward_points_text: String(item.reward_points || item.rewardPoints || 0),
    category_label: channel.name
  };
}

Page({
  data: {
    navLayout: getNavigationLayout(),
    loading: true,
    error: '',
    channel: getChannelPresentation('education'),
    presentationEnabled: false,
    activeCategory: 'all',
    activeFeed: 'questions',
    allQuestions: [],
    questions: [],
    experts: []
  },

  onLoad(options) {
    const channel = getChannelPresentation(options.id || 'education');
    this.setData({
      channel,
      presentationEnabled: channel.presentationEnabled,
      experts: getExpertsForChannel(channel.id)
    });
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return {
      title: `${this.data.channel.name} - 问问`,
      path: `/pages/channel/index?id=${encodeURIComponent(this.data.channel.id)}`
    };
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callRpc('fetchHomeFeed');
      const channel = this.data.channel;
      const questions = (Array.isArray(result) ? result : [])
        .filter((item) => channel.aliases.includes(item.category || item.channel))
        .map((item) => normalizeQuestion(item, channel));
      this.setData({ allQuestions: questions, questions, loading: false });
    } catch (error) {
      this.setData({
        allQuestions: [],
        questions: [],
        loading: false,
        error: error.message || '加载失败'
      });
    }
  },

  applyFilter() {
    this.setData({ questions: this.data.allQuestions.slice() });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/home/index' });
  },

  goSearch() {
    wx.navigateTo({ url: `/pages/search/index?keyword=${encodeURIComponent(this.data.channel.name)}` });
  },

  goNotifications() {
    wx.switchTab({ url: '/pages/messages/index' });
  },

  openFeatured() {
    const featured = this.data.channel.featured;
    if (!featured) {
      wx.showToast({ title: '专题能力准备中', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/topic-detail/index?id=${encodeURIComponent(featured.topicId)}` });
  },

  selectCategory(event) {
    this.setData({ activeCategory: event.currentTarget.dataset.id || 'all' }, () => this.applyFilter());
  },

  switchFeed(event) {
    this.setData({ activeFeed: event.currentTarget.dataset.feed || 'questions' });
  },

  openQuestion(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/question-detail/index?id=${encodeURIComponent(id)}` });
  },

  openExpert(event) {
    const id = event.currentTarget.dataset.id;
    if (!id) return;
    wx.navigateTo({ url: `/pages/expert-detail/index?id=${encodeURIComponent(id)}` });
  },

  goAsk() {
    wx.navigateTo({
      url: `/pages/ask/index?category=${encodeURIComponent(this.data.channel.id)}&categoryLabel=${encodeURIComponent(this.data.channel.name)}`
    });
  }
});
