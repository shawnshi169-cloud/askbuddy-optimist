const { getNavigationLayout } = require('../../utils/navigation');
const { getInteractionPresentation } = require('../../utils/presentation-fixtures');

const interactions = getInteractionPresentation();

Page({
  data: {
    navLayout: getNavigationLayout(),
    interactions,
    presentationEnabled: interactions.length > 0
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/discover/index' });
  }
});
