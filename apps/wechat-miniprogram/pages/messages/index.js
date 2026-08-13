const { callRpc } = require('../../utils/request');
const { getRuntimePolicy } = require('../../config/client');
const { getNavigationLayout } = require('../../utils/navigation');

function normalizeConversation(item) {
  const name = item.name || item.peerName || '问问用户';
  return {
    partnerId: item.partnerId || item.partner_id || item.id,
    expertId: item.expertId || item.expert_id || '',
    initial: name.slice(0, 1),
    name,
    message: item.message || item.lastMessage || '暂无消息',
    time: item.time || item.updatedAt || item.updated_at || '',
    unread: Number(item.unread || item.unread_count || 0)
  };
}

const runtimePolicy = getRuntimePolicy();

Page({
  data: {
    navLayout: getNavigationLayout(),
    activeSegment: 'private',
    searchOpen: false,
    searchKeyword: '',
    previewMode: runtimePolicy.envVersion === 'develop' && runtimePolicy.legacyDataMode === 'mock',
    loading: true,
    conversations: [],
    filteredConversations: [],
    list: [],
    filteredList: [],
    unreadCount: 0,
    error: ''
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    const tabBar = typeof this.getTabBar === 'function' ? this.getTabBar() : null;
    if (tabBar) tabBar.setData({ selected: 3 });
  },

  onPullDownRefresh() {
    this.loadData().finally(() => wx.stopPullDownRefresh());
  },

  onShareAppMessage() {
    return { title: '问问消息', path: '/pages/messages/index' };
  },

  async loadData() {
    this.setData({ loading: true, error: '' });
    try {
      const result = await callRpc('fetchConversationList');
      const conversations = Array.isArray(result) ? result.map(normalizeConversation) : [];
      this.setData({ conversations, loading: false }, () => this.applySearch());
    } catch (error) {
      this.setData({ loading: false, conversations: [], filteredConversations: [], error: error.message || '加载失败' });
    }
  },

  switchSegment(event) {
    this.setData({ activeSegment: event.currentTarget.dataset.segment || 'private', searchKeyword: '' }, () => this.applySearch());
  },

  showSearch() {
    this.setData({ searchOpen: !this.data.searchOpen, searchKeyword: '' }, () => this.applySearch());
  },

  onSearchInput(event) {
    this.setData({ searchKeyword: event.detail.value }, () => this.applySearch());
  },

  applySearch() {
    const keyword = this.data.searchKeyword.trim().toLowerCase();
    const filteredConversations = this.data.conversations.filter((item) => {
      return !keyword || `${item.name} ${item.message}`.toLowerCase().includes(keyword);
    });
    const filteredList = this.data.list.filter((item) => {
      return !keyword || `${item.title || ''} ${item.content || ''}`.toLowerCase().includes(keyword);
    });
    this.setData({ filteredConversations, filteredList });
  },

  openChat(event) {
    const partnerId = event.currentTarget.dataset.partnerId || '';
    const conversation = this.data.conversations.find((item) => item.partnerId === partnerId);
    const name = conversation ? conversation.name : '';
    wx.navigateTo({
      url: `/pages/chat-detail/index?partnerId=${encodeURIComponent(partnerId)}&name=${encodeURIComponent(name)}`
    });
  },

  goCallPage() {
    wx.navigateTo({ url: '/pages/call/index' });
  },

  openRelated() {
    wx.showToast({ title: '通知跳转契约准备中', icon: 'none' });
  }
});
