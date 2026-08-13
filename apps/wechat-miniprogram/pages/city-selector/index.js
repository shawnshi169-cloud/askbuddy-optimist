const { getNavigationLayout } = require('../../utils/navigation');

const CITY_STORAGE_KEY = 'ab_selected_city_v1';

Page({
  data: {
    navLayout: getNavigationLayout(),
    currentCity: '全国',
    activeRegion: 'mainland',
    keyword: '',
    mainland: ['全国', '深圳', '北京', '上海', '广州', '杭州', '成都', '南京', '武汉'],
    overseas: ['伦敦', '纽约', '新加坡', '东京', '悉尼', '多伦多'],
    filteredMainland: [],
    filteredOverseas: []
  },

  onLoad() {
    this.setData({
      currentCity: wx.getStorageSync(CITY_STORAGE_KEY) || '全国',
      filteredMainland: this.data.mainland,
      filteredOverseas: this.data.overseas
    });
  },

  goBack() {
    const pages = getCurrentPages();
    if (pages.length > 1) wx.navigateBack();
    else wx.switchTab({ url: '/pages/home/index' });
  },

  switchRegion(event) {
    this.setData({ activeRegion: event.currentTarget.dataset.region || 'mainland' });
  },

  onSearchInput(event) {
    const keyword = event.detail.value.trim();
    const filter = (items) => items.filter((city) => !keyword || city.includes(keyword));
    this.setData({
      keyword,
      filteredMainland: filter(this.data.mainland),
      filteredOverseas: filter(this.data.overseas)
    });
  },

  chooseCity(event) {
    const currentCity = event.currentTarget.dataset.city;
    if (!currentCity) return;
    wx.setStorageSync(CITY_STORAGE_KEY, currentCity);
    this.setData({ currentCity });
    wx.showToast({ title: `已切换到${currentCity}`, icon: 'none' });
    setTimeout(() => {
      const pages = getCurrentPages();
      if (pages.length > 1) wx.navigateBack();
      else wx.switchTab({ url: '/pages/home/index' });
    }, 300);
  }
});
