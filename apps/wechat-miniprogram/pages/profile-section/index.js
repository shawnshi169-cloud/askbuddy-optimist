const auth = require('../../utils/auth');
const { getNavigationLayout } = require('../../utils/navigation');

const SECTIONS = {
  orders: { title: '我的订单', subtitle: '查看进行中与已完成的咨询', icon: '单', emptyTitle: '还没有订单', emptyDesc: '正式订单读取契约接入后会展示在这里。' },
  answers: { title: '我的回答', subtitle: '整理你分享过的经验', icon: '答', emptyTitle: '还没有回答', emptyDesc: '正式回答读取契约接入后会展示在这里。' },
  favorites: { title: '我的收藏', subtitle: '稍后继续阅读的问题与专题', icon: '藏', emptyTitle: '还没有收藏', emptyDesc: '正式收藏读取契约接入后会展示在这里。' },
  following: { title: '我的关注', subtitle: '持续关注达人和专题更新', icon: '关', emptyTitle: '还没有关注', emptyDesc: '正式关注读取契约接入后会展示在这里。' },
  earnings: { title: '我的收益', subtitle: '查看经验服务收入和结算状态', icon: '益', emptyTitle: '暂无收益记录', emptyDesc: '正式收益读取契约接入后会展示在这里。' },
  community: { title: '我的社群', subtitle: '和相似目标的人持续交流', icon: '群', emptyTitle: '还没有加入社群', emptyDesc: '正式社群契约接入后会展示在这里。' },
  drafts: { title: '草稿箱', subtitle: '继续编辑尚未发布的本机内容', icon: '稿', emptyTitle: '草稿箱为空', emptyDesc: '本机保存的问题、技能或动态草稿会显示在这里。' },
  verify: { title: '达人认证', subtitle: '完善经验资料并申请成为达人', icon: '认', emptyTitle: '认证功能准备中', emptyDesc: '认证契约接入后可在这里提交资料。' },
  help: { title: '帮助中心', subtitle: '常见问题和使用说明', icon: '?', items: ['如何发布一个高质量问题？', '如何联系达人？', '如何查看消息？', '隐私和账号安全'] },
  rules: { title: '问问规范', subtitle: '共同维护真实、友善的经验社区', icon: '规', items: ['尊重事实与个人经验边界', '不发布隐私和敏感联系方式', '不冒充专业资质或承诺结果', '发现不当内容及时举报'] },
  feedback: { title: '产品反馈', subtitle: '告诉我们哪里还可以做得更好', icon: '信', items: ['界面与交互建议', '功能问题反馈', '内容与社区建议'] },
  about: { title: '关于问问', subtitle: '连接真实经验，让每个问题更快得到回应', icon: '问', items: ['产品介绍', '服务协议', '隐私政策', '当前版本 1.0.0'] },
  settings: { title: '设置', subtitle: '管理账号、通知、隐私和偏好', icon: '设', items: ['账号与安全', '通知设置', '隐私设置', '内容偏好', '存储空间', '关于问问'] }
};

const ITEM_DETAILS = {
  '如何发布一个高质量问题？': '先用一句话说明目标，再补充背景、限制条件和已经尝试过的方法。',
  '如何联系达人？': '可从频道进入达人主页。提问、私信和通话入口会按正式服务开放状态工作。',
  '如何查看消息？': '进入底部“消息”查看已有会话；通知契约尚未接入。',
  '隐私和账号安全': '不要公开身份证、住址、手机号、支付凭证或完整登录令牌。',
  '尊重事实与个人经验边界': '请区分亲身经历、个人判断和专业建议，不夸大效果。',
  '不发布隐私和敏感联系方式': '请勿在公开内容中填写手机号、住址或证件号码。',
  '不冒充专业资质或承诺结果': '涉及专业领域时，应清楚说明经验与资质边界。',
  '发现不当内容及时举报': '举报契约接入前，请停止互动并保留必要信息。',
  '产品介绍': '问问希望连接真实经验，让用户更快形成可执行的下一步。',
  '服务协议': '正式服务协议将在相关业务能力开放前提供。',
  '隐私政策': '小程序遵循最小必要原则申请权限，认证不依赖头像或昵称授权。',
  '当前版本 1.0.0': '当前版本完成 UI/Auth 基线整合，部分业务能力仍在契约接入中。'
};

const AUTH_REQUIRED_KEYS = new Set([
  'orders', 'answers', 'favorites', 'following', 'earnings', 'community', 'drafts', 'verify', 'settings'
]);

Page({
  data: {
    navLayout: getNavigationLayout(),
    section: SECTIONS.settings,
    sectionKey: 'settings',
    drafts: [],
    showAccountTip: true,
    authRequired: false,
    feedbackCategory: '界面与交互建议',
    feedbackContent: ''
  },

  onLoad(options) {
    const key = options.key || 'settings';
    const requestedSection = SECTIONS[key] || {
      title: options.title ? decodeURIComponent(options.title) : '个人中心',
      subtitle: '相关能力正在逐步接入',
      icon: '问',
      emptyTitle: '暂无内容',
      emptyDesc: '当前没有可展示的数据。'
    };
    const authenticated = auth.getAuthSnapshot().authState === 'authenticated';
    const authRequired = AUTH_REQUIRED_KEYS.has(key) && !authenticated;
    const section = authRequired ? {
      title: requestedSection.title,
      subtitle: '此入口需要完成微信登录',
      icon: requestedSection.icon,
      emptyTitle: '请先登录',
      emptyDesc: '返回个人中心完成微信登录后，再进入此页面。'
    } : requestedSection;
    const feedbackDraft = key === 'feedback' ? wx.getStorageSync('ab_product_feedback_draft_v1') || {} : {};
    this.setData({
      section,
      sectionKey: key,
      drafts: key === 'drafts' && !authRequired ? this.collectDrafts() : [],
      showAccountTip: AUTH_REQUIRED_KEYS.has(key),
      authRequired,
      feedbackCategory: feedbackDraft.category || '界面与交互建议',
      feedbackContent: feedbackDraft.content || ''
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/profile/index' });
  },

  collectDrafts() {
    const definitions = [
      { key: 'ab_question_draft_v1', type: '问题草稿', titleKey: 'title', descKey: 'content', route: '/pages/ask/index' },
      { key: 'ab_skill_publish_draft_v1', type: '技能草稿', titleKey: 'title', descKey: 'description', route: '/pages/skill-publish/index' },
      { key: 'ab_post_draft_v1', type: '动态草稿', title: '未发布的经验动态', descKey: 'content', route: '/pages/post-editor/index' }
    ];
    return definitions.reduce((drafts, definition) => {
      const value = wx.getStorageSync(definition.key);
      if (!value || typeof value !== 'object') return drafts;
      drafts.push({
        key: definition.key,
        type: definition.type,
        title: definition.title || value[definition.titleKey] || '未命名草稿',
        desc: value[definition.descKey] || '暂无内容',
        route: definition.route
      });
      return drafts;
    }, []);
  },

  openItem(event) {
    const label = event.currentTarget.dataset.label;
    if (this.data.sectionKey === 'feedback') {
      this.setData({ feedbackCategory: label });
      return;
    }
    if (this.data.sectionKey === 'settings' && label === '通知设置') {
      wx.openSetting({ fail: () => wx.showToast({ title: '暂时无法打开小程序设置', icon: 'none' }) });
      return;
    }
    if (this.data.sectionKey === 'settings' && label === '存储空间') {
      const storage = wx.getStorageInfoSync();
      wx.showModal({
        title: '本机存储空间',
        content: `当前小程序数据约 ${storage.currentSize || 0} KB，最多可使用 ${storage.limitSize || 0} KB。`,
        showCancel: false
      });
      return;
    }
    if (this.data.sectionKey === 'settings' && label === '关于问问') {
      this.setData({ section: SECTIONS.about, sectionKey: 'about', showAccountTip: false });
      return;
    }
    const detail = ITEM_DETAILS[label];
    if (detail) {
      wx.showModal({ title: label, content: detail, showCancel: false });
      return;
    }
    wx.showToast({ title: `${label}功能准备中`, icon: 'none' });
  },

  onFeedbackInput(event) {
    this.setData({ feedbackContent: event.detail.value });
  },

  saveFeedbackDraft() {
    const content = this.data.feedbackContent.trim();
    if (!content) {
      wx.showToast({ title: '请先填写反馈内容', icon: 'none' });
      return;
    }
    wx.setStorageSync('ab_product_feedback_draft_v1', {
      category: this.data.feedbackCategory,
      content,
      updatedAt: Date.now()
    });
    wx.showModal({
      title: '反馈草稿已保存',
      content: '内容仅保存在当前设备，不会显示为已提交。',
      showCancel: false
    });
  },

  openDraft(event) {
    const draft = this.data.drafts.find((item) => item.key === event.currentTarget.dataset.key);
    if (draft) wx.navigateTo({ url: draft.route });
  },

  clearDraft(event) {
    const key = event.currentTarget.dataset.key;
    if (!key) return;
    wx.removeStorageSync(key);
    this.setData({ drafts: this.data.drafts.filter((item) => item.key !== key) });
    wx.showToast({ title: '本机草稿已删除', icon: 'none' });
  }
});
