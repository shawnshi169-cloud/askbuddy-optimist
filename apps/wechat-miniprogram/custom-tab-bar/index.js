function lightHaptic() {
  if (!wx.vibrateShort) return;
  try {
    const result = wx.vibrateShort({ type: 'light' });
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (error) {
    // Haptic feedback is optional and should never block navigation.
  }
}

Component({
  data: {
    selected: 0,
    unreadCount: 0,
    hidden: false,
    publishMenuVisible: false,
    list: [
      { pagePath: '/pages/home/index', text: '首页', icon: 'home' },
      { pagePath: '/pages/discover/index', text: '发现', icon: 'discover' },
      { pagePath: '/pages/ask/index', text: '发布', icon: 'publish' },
      { pagePath: '/pages/messages/index', text: '消息', icon: 'message' },
      { pagePath: '/pages/profile/index', text: '我的', icon: 'profile' }
    ]
  },

  methods: {
    switchTab(event) {
      const index = Number(event.currentTarget.dataset.index);
      const item = this.data.list[index];
      if (!item) return;
      if (item.icon === 'publish') {
        lightHaptic();
        this.setData({ publishMenuVisible: true });
        return;
      }
      if (index === this.data.selected) {
        wx.pageScrollTo({ scrollTop: 0, duration: 220 });
        return;
      }
      wx.switchTab({ url: item.pagePath });
    },

    closePublishMenu() {
      this.setData({ publishMenuVisible: false });
    },

    keepPublishMenu() {},

    choosePublish(event) {
      const type = event.currentTarget.dataset.type;
      this.setData({ publishMenuVisible: false });
      lightHaptic();
      if (type === 'skill') {
        wx.navigateTo({ url: '/pages/skill-publish/index' });
        return;
      }
      wx.navigateTo({ url: '/pages/ask/index' });
    }
  }
});
