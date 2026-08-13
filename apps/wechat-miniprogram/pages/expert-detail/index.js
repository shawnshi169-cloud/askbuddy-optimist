const { getNavigationLayout } = require('../../utils/navigation');
const { getExpertPresentation } = require('../../utils/presentation-fixtures');

Page({
  data: {
    navLayout: getNavigationLayout(),
    expert: null,
    presentationEnabled: false,
    followed: false
  },

  onLoad(options) {
    const expert = getExpertPresentation(options.id || '');
    this.setData({ expert, presentationEnabled: Boolean(expert) });
  },

  onShareAppMessage() {
    const expert = this.data.expert;
    return {
      title: expert ? `${expert.name}的问问主页` : '问问达人',
      path: expert ? `/pages/expert-detail/index?id=${encodeURIComponent(expert.id)}` : '/pages/home/index'
    };
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/home/index' });
  },

  toggleFollow() {
    wx.showModal({
      title: '关注功能准备中',
      content: '关注写入契约尚未接入，本次不会改变关注状态。',
      showCancel: false
    });
  },

  goCall() {
    if (!this.data.expert) return;
    wx.navigateTo({
      url: `/pages/call/index?calleeName=${encodeURIComponent(this.data.expert.name)}&mode=voice`
    });
  },

  goAsk() {
    if (!this.data.expert) return;
    wx.navigateTo({
      url: `/pages/ask/index?expertName=${encodeURIComponent(this.data.expert.name)}&category=${encodeURIComponent(this.data.expert.category || '')}`
    });
  }
});
