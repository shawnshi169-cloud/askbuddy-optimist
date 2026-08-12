function asNumber(value, fallback) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : fallback;
}

function getNavigationLayout() {
  const windowInfo = typeof wx.getWindowInfo === 'function' ? wx.getWindowInfo() : {};
  const windowWidth = asNumber(windowInfo.windowWidth, 375);
  const statusBarHeight = asNumber(windowInfo.statusBarHeight, 20);
  let capsule = null;

  if (typeof wx.getMenuButtonBoundingClientRect === 'function') {
    try {
      capsule = wx.getMenuButtonBoundingClientRect();
    } catch (error) {
      capsule = null;
    }
  }

  const capsuleLeftValue = Number(capsule && capsule.left);
  const capsuleRightValue = Number(capsule && capsule.right);
  const capsuleHeightValue = Number(capsule && capsule.height);
  const hasValidCapsule = Number.isFinite(capsuleLeftValue)
    && Number.isFinite(capsuleRightValue)
    && Number.isFinite(capsuleHeightValue)
    && capsuleLeftValue >= windowWidth * 0.45
    && capsuleLeftValue < windowWidth
    && capsuleRightValue > capsuleLeftValue
    && capsuleRightValue <= windowWidth + 2
    && capsuleHeightValue >= 20
    && capsuleHeightValue <= 60;
  const capsuleHeight = hasValidCapsule ? capsuleHeightValue : 32;
  const capsuleLeft = hasValidCapsule ? capsuleLeftValue : windowWidth - 97;
  const capsuleTop = hasValidCapsule
    ? asNumber(capsule && capsule.top, statusBarHeight + 6)
    : statusBarHeight + 6;
  const verticalGap = Math.max(4, capsuleTop - statusBarHeight);
  const barHeight = Math.max(44, capsuleHeight + verticalGap * 2);
  const rightInset = Math.max(104, windowWidth - capsuleLeft + 10);

  return {
    windowWidth,
    statusBarHeight,
    capsuleHeight,
    barHeight,
    rightInset,
    compact: windowWidth <= 360,
    headerStyle: `height:${barHeight}px;min-height:${barHeight}px;padding-right:${rightInset}px;`,
    actionStyle: `height:${capsuleHeight}px;`
  };
}

module.exports = {
  getNavigationLayout
};
