const { callRpc } = require('../../utils/request');
const { getNavigationLayout } = require('../../utils/navigation');

function normalizeQuestion(item) {
  const authorName = item.asker_name || item.profile_nickname || item.authorName || '问问用户';
  return {
    ...item,
    asker_name: authorName,
    asker_initial: authorName.slice(0, 1),
    created_at_text: item.created_at_text || item.created_at || item.createdAt || '最近发布',
    view_count_text: String(item.view_count || item.viewCount || 0),
    reward_points_text: String(item.reward_points || item.rewardPoints || 0)
  };
}

Page({
  data: {
    navLayout: getNavigationLayout(),
    questionId: '',
    loading: true,
    detail: null,
    answers: [],
    error: '',
    isExample: false,
    favorited: false,
    answerEditorVisible: false,
    answerDraft: ''
  },

  onLoad(options) {
    this.setData({ questionId: options.id || '' });
    this.loadDetail();
  },

  onPullDownRefresh() {
    this.loadDetail().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return {
      title: this.data.detail ? this.data.detail.title : '问题详情',
      path: `/pages/question-detail/index?id=${encodeURIComponent(this.data.questionId)}`
    };
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/home/index' });
  },

  async loadDetail() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callRpc('fetchQuestionDetail', { questionId: this.data.questionId });
      if (!result) throw new Error('问题不存在或已下线');
      this.setData({ detail: normalizeQuestion(result), answers: [], loading: false });
    } catch (error) {
      this.setData({ loading: false, detail: null, answers: [], error: error.message || '加载失败' });
    }
  },

  toggleFavorite() {
    wx.showToast({ title: '收藏写入功能准备中', icon: 'none' });
  },

  reportContent() {
    wx.showToast({ title: '举报能力准备中', icon: 'none' });
  },

  answerQuestion() {
    this.setData({ answerEditorVisible: true });
  },

  replyAnswer(event) {
    const author = event.currentTarget.dataset.author || '';
    this.setData({ answerEditorVisible: true, answerDraft: author ? `回复 ${author}：` : '' });
  },

  closeAnswerEditor() {
    this.setData({ answerEditorVisible: false });
  },

  keepAnswerEditor() {},

  onAnswerInput(event) {
    this.setData({ answerDraft: event.detail.value });
  },

  submitAnswer() {
    if (!this.data.answerDraft.trim()) {
      wx.showToast({ title: '请先填写回答', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '回答功能准备中',
      content: '回答发布尚未接入正式写入契约，当前内容不会上传。',
      showCancel: false
    });
  }
});
