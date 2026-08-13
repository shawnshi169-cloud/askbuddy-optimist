const { getNavigationLayout } = require('../../utils/navigation');
const { isDevelopmentPresentationEnabled } = require('../../utils/presentation-fixtures');

const STATUS_LABELS = {
  idle: '待发起',
  initiated: '正在发起',
  ringing: '等待接听',
  answered: '已接听',
  ended: '已结束'
};

Page({
  data: {
    navLayout: getNavigationLayout(),
    mode: 'voice',
    calleeId: '',
    calleeName: '',
    calleeInitial: '联',
    callSessionId: '',
    visualState: 'idle',
    visualStateLabel: STATUS_LABELS.idle,
    presentationEnabled: isDevelopmentPresentationEnabled(),
    previewStates: ['idle', 'initiated', 'ringing', 'answered', 'ended'],
    loadingAction: '',
    errorMessage: 'Call transport 尚未纳入当前统一基线',
    pollMessage: '',
    canInitiate: true,
    canAccept: false,
    canReject: false,
    canHangup: false
  },

  onLoad(options) {
    const calleeName = options.calleeName ? decodeURIComponent(options.calleeName) : '';
    this.setData({
      mode: options.mode === 'video' ? 'video' : 'voice',
      calleeName,
      calleeInitial: calleeName ? calleeName.slice(0, 1) : '联'
    });
  },

  onShareAppMessage() {
    return { title: '问问通话', path: '/pages/call/index' };
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/messages/index' });
  },

  openPermissionSettings() {
    wx.openSetting({
      fail: () => wx.showToast({ title: '请在小程序设置中管理麦克风或摄像头权限', icon: 'none' })
    });
  },

  setVoice() {
    this.setData({ mode: 'voice' });
  },

  setVideo() {
    this.setData({ mode: 'video' });
  },

  onCalleeInput(event) {
    this.setData({ calleeId: event.detail.value.trim() });
  },

  previewStatus(event) {
    if (!this.data.presentationEnabled) return;
    const status = event.currentTarget.dataset.status;
    if (!STATUS_LABELS[status]) return;
    this.setData({
      visualState: status,
      visualStateLabel: STATUS_LABELS[status],
      canInitiate: status === 'idle' || status === 'ended',
      canAccept: status === 'ringing',
      canReject: status === 'ringing',
      canHangup: status === 'answered'
    });
  },

  showContractBlocker() {
    wx.showModal({
      title: '通话能力准备中',
      content: '当前仅迁移通话视觉壳层。Call RPC/transport 需要 A 契约复核，本次不会创建或改变任何通话会话。',
      showCancel: false
    });
  },

  onInitiate() {
    this.showContractBlocker();
  },

  onAccept() {
    this.showContractBlocker();
  },

  onReject() {
    this.showContractBlocker();
  },

  onHangup() {
    this.showContractBlocker();
  }
});
