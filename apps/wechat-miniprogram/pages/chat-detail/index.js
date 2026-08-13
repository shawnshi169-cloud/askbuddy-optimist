const { getNavigationLayout } = require('../../utils/navigation');
const {
  getExpertPresentation,
  getChatPresentation
} = require('../../utils/presentation-fixtures');

function getFallbackContact(options) {
  const name = options.name ? decodeURIComponent(options.name) : '会话联系人';
  return {
    id: options.expertId || '',
    userId: options.partnerId || '',
    name,
    initial: name.slice(0, 1),
    presentationOnly: false
  };
}

Page({
  data: {
    navLayout: getNavigationLayout(),
    expert: { id: '', userId: '', name: '会话联系人', initial: '问' },
    inputValue: '',
    messages: [],
    presentationEnabled: false
  },

  onLoad(options) {
    const expert = getExpertPresentation(options.expertId || '') || getFallbackContact(options);
    const messages = getChatPresentation(expert);
    this.setData({ expert, messages, presentationEnabled: messages.length > 0 });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/messages/index' });
  },

  openExpert() {
    if (!this.data.expert.id || !this.data.expert.presentationOnly) {
      wx.showToast({ title: '达人资料契约准备中', icon: 'none' });
      return;
    }
    wx.navigateTo({ url: `/pages/expert-detail/index?id=${encodeURIComponent(this.data.expert.id)}` });
  },

  onInput(event) {
    this.setData({ inputValue: event.detail.value });
  },

  goCall() {
    wx.navigateTo({
      url: `/pages/call/index?calleeName=${encodeURIComponent(this.data.expert.name)}&mode=voice`
    });
  },

  sendMessage() {
    if (!this.data.inputValue.trim()) {
      wx.showToast({ title: '请先输入消息', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '发送功能准备中',
      content: '私信写入契约尚未接入，本次不会插入本地消息或显示为已发送。',
      showCancel: false
    });
  }
});
