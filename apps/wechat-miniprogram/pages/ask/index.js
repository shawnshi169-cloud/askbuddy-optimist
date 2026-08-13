const { getNavigationLayout } = require('../../utils/navigation');

const DRAFT_KEY = 'ab_question_draft_v1';

Page({
  data: {
    navLayout: getNavigationLayout(),
    title: '',
    content: '',
    titleCount: 0,
    contentCount: 0,
    selectedExpert: '',
    selectedCategory: '',
    selectedCategoryLabel: '',
    submitting: false
  },

  onLoad(options) {
    const draft = wx.getStorageSync(DRAFT_KEY);
    const title = draft && typeof draft.title === 'string' ? draft.title : '';
    const content = draft && typeof draft.content === 'string' ? draft.content : '';
    this.setData({
      title,
      content,
      titleCount: title.length,
      contentCount: content.length,
      selectedExpert: options && options.expertName ? decodeURIComponent(options.expertName) : '',
      selectedCategory: options && options.category ? decodeURIComponent(options.category) : '',
      selectedCategoryLabel: options && options.categoryLabel ? decodeURIComponent(options.categoryLabel) : ''
    });
  },

  onShareAppMessage() {
    return { title: '我在问问整理了一个问题', path: '/pages/ask/index' };
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/home/index' });
  },

  onTitleInput(event) {
    const title = event.detail.value;
    this.setData({ title, titleCount: title.length });
  },

  onContentInput(event) {
    const content = event.detail.value;
    this.setData({ content, contentCount: content.length });
  },

  fillExample() {
    const content = '我的目标是……，目前的情况是……，希望在……时间内获得一份可执行的建议。';
    this.setData({ content, contentCount: content.length });
  },

  saveDraft() {
    wx.setStorageSync(DRAFT_KEY, { title: this.data.title, content: this.data.content });
    wx.showToast({ title: '草稿已保存在本机', icon: 'none' });
  },

  submitQuestion() {
    const title = this.data.title.trim();
    const content = this.data.content.trim();
    if (!title || !content) {
      wx.showToast({ title: '请补全标题和内容', icon: 'none' });
      return;
    }
    wx.showModal({
      title: '发布功能准备中',
      content: '问题发布尚未接入正式写入契约。你可以先保存本机草稿。',
      showCancel: false
    });
  }
});
