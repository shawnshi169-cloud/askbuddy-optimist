const { getNavigationLayout } = require('../../utils/navigation');

const DRAFT_KEY = 'ab_skill_publish_draft_v1';

Page({
  data: {
    navLayout: getNavigationLayout(),
    title: '',
    description: '',
    category: 'education',
    categories: [
      { id: 'education', name: '教育学习' },
      { id: 'career', name: '职业发展' },
      { id: 'lifestyle', name: '生活服务' },
      { id: 'hobbies', name: '兴趣技能' }
    ]
  },

  onLoad() {
    const draft = wx.getStorageSync(DRAFT_KEY);
    if (draft && typeof draft === 'object') this.setData(draft);
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/profile/index' });
  },

  onTitleInput(event) {
    this.setData({ title: event.detail.value });
  },

  onDescriptionInput(event) {
    this.setData({ description: event.detail.value });
  },

  chooseCategory(event) {
    this.setData({ category: event.currentTarget.dataset.id || 'education' });
  },

  saveDraft(showToast = true) {
    wx.setStorageSync(DRAFT_KEY, {
      title: this.data.title,
      description: this.data.description,
      category: this.data.category
    });
    if (showToast) wx.showToast({ title: '草稿已保存在本机', icon: 'none' });
  },

  submitSkill() {
    if (!this.data.title.trim() || !this.data.description.trim()) {
      wx.showToast({ title: '请补全技能标题和介绍', icon: 'none' });
      return;
    }
    this.saveDraft(false);
    wx.showModal({
      title: '发布功能准备中',
      content: '技能发布尚未接入正式写入契约。内容已保存在本机，不会显示为已发布。',
      showCancel: false
    });
  }
});
