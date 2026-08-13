const { getNavigationLayout } = require('../../utils/navigation');
const { getTopicPresentation } = require('../../utils/presentation-fixtures');

Page({
  data: {
    navLayout: getNavigationLayout(),
    topic: null,
    presentationEnabled: false,
    comment: ''
  },

  onLoad(options) {
    const topic = getTopicPresentation(options.id || '');
    const comment = topic ? wx.getStorageSync(`ab_topic_comment_draft_v1:${topic.id}`) || '' : '';
    this.setData({ topic, presentationEnabled: Boolean(topic), comment });
  },

  onShareAppMessage() {
    const topic = this.data.topic;
    return {
      title: topic ? topic.title : '问问专题',
      path: topic ? `/pages/topic-detail/index?id=${encodeURIComponent(topic.id)}` : '/pages/home/index'
    };
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/home/index' });
  },

  onCommentInput(event) {
    this.setData({ comment: event.detail.value });
  },

  submitComment() {
    if (!this.data.topic) {
      wx.showToast({ title: '专题数据准备中', icon: 'none' });
      return;
    }
    const comment = this.data.comment.trim();
    if (!comment) {
      wx.showToast({ title: '先写下你的观点', icon: 'none' });
      return;
    }
    wx.setStorageSync(`ab_topic_comment_draft_v1:${this.data.topic.id}`, comment);
    wx.showModal({
      title: '观点已保存',
      content: '内容仅保存到本机，不会显示为已发布。正式讨论写入契约尚未接入。',
      showCancel: false
    });
  },

  likeDiscussion() {
    wx.showToast({ title: '点赞写入功能准备中', icon: 'none' });
  },

  replyDiscussion(event) {
    const author = event.currentTarget.dataset.author || '';
    this.setData({ comment: author ? `@${author} ` : this.data.comment });
  }
});
