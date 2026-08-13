const { getNavigationLayout } = require('../../utils/navigation');

const DRAFT_KEY = 'ab_post_draft_v1';

Page({
  data: {
    navLayout: getNavigationLayout(),
    content: '',
    count: 0,
    tags: [
      { name: '留学申请', active: false },
      { name: '简历优化', active: false },
      { name: '租房避坑', active: false }
    ],
    selectedTags: [],
    cityEnabled: false,
    mediaFiles: []
  },

  onLoad() {
    const draft = wx.getStorageSync(DRAFT_KEY);
    if (!draft || typeof draft !== 'object') return;
    const selectedTags = Array.isArray(draft.selectedTags) ? draft.selectedTags : [];
    this.setData({
      content: draft.content || '',
      count: (draft.content || '').length,
      selectedTags,
      cityEnabled: Boolean(draft.cityEnabled),
      tags: this.data.tags.map((item) => ({ ...item, active: selectedTags.includes(item.name) }))
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/discover/index' });
  },

  onInput(event) {
    const content = event.detail.value;
    this.setData({ content, count: content.length });
  },

  toggleCity() {
    this.setData({ cityEnabled: !this.data.cityEnabled });
  },

  toggleTag(event) {
    const tag = event.currentTarget.dataset.tag;
    const selectedTags = this.data.selectedTags.includes(tag)
      ? this.data.selectedTags.filter((item) => item !== tag)
      : this.data.selectedTags.concat(tag);
    this.setData({
      selectedTags,
      tags: this.data.tags.map((item) => ({ ...item, active: selectedTags.includes(item.name) }))
    });
  },

  chooseImage() {
    if (this.data.mediaFiles.length >= 9) {
      wx.showToast({ title: '最多选择 9 张图片', icon: 'none' });
      return;
    }
    wx.chooseMedia({
      count: 9 - this.data.mediaFiles.length,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (result) => {
        const selected = (result.tempFiles || []).map((item) => item.tempFilePath).filter(Boolean);
        this.setData({ mediaFiles: this.data.mediaFiles.concat(selected).slice(0, 9) });
      },
      fail: (error) => {
        if (!String(error.errMsg || '').includes('cancel')) {
          wx.showToast({ title: '暂时无法选择图片', icon: 'none' });
        }
      }
    });
  },

  removeImage(event) {
    const index = Number(event.currentTarget.dataset.index);
    this.setData({ mediaFiles: this.data.mediaFiles.filter((_, itemIndex) => itemIndex !== index) });
  },

  saveDraft() {
    wx.setStorageSync(DRAFT_KEY, {
      content: this.data.content,
      selectedTags: this.data.selectedTags,
      cityEnabled: this.data.cityEnabled
    });
  },

  publish() {
    if (!this.data.content.trim()) {
      wx.showToast({ title: '先写下想分享的经验', icon: 'none' });
      return;
    }
    this.saveDraft();
    wx.showModal({
      title: '发布功能准备中',
      content: '动态发布尚未接入正式写入契约。内容已保存在本机，不会显示为已发布。',
      showCancel: false
    });
  }
});
