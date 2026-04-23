export const state = () => ({
  isHideMobile: {
    mobileBottomMenu: false,
  },
  isHideDesktop: {
    mobileBottomMenu: false,
  },

  isCatalogCategoriesIntersecting: false,
  scrollDirection: null,
  activePopup: null,
  needShowDeliveryAfterReload: true,
  isPageScroll: false,
  isPageScrollHidden: false,
  isHeaderOnSlider: true,
  hasLayoutShadowBottom: false,
  isStoriesShow: false,
});

export const mutations = {

  hideBlockMobile(state, type) {
    state.isHideMobile[type] = true;
  },
  showBlockMobile(state, type) {
    state.isHideMobile[type] = false;
  },

  hideBlockDesktop(state, type) {
    state.isHideDesktop[type] = true;
  },
  showBlockDesktop(state, type) {
    state.isHideDesktop[type] = false;
  },

  resetAllHiddenBlocks(state) {
    Object.keys(state.isHideMobile)
      .forEach((type) => { state.isHideMobile[type] = false; });
    Object.keys(state.isHideDesktop)
      .forEach((type) => { state.isHideDesktop[type] = false; });
  },

  setIsCatalogCategoriesIntersecting(state, payload) {
    state.isCatalogCategoriesIntersecting = payload;
  },
  setScrollDirection(state, payload) {
    state.scrollDirection = payload;
  },
  setActivePopup(state, popup) {
    if (state.activePopup && state.activePopup !== popup) {
      state.activePopup.hidePopover();
    }
    state.activePopup = popup;
  },

  setNeedShowDeliveryAfterReload(state, needShowDeliveryAfterReload) {
    state.needShowDeliveryAfterReload = needShowDeliveryAfterReload;
  },
  setIsPageScroll(state, payload) {
    state.isPageScroll = payload;
  },

  setIsPageScrollHidden(state, payload) {
    state.isPageScrollHidden = payload;
  },
  setIsHeaderOnSlider(state, payload) {
    state.isHeaderOnSlider = payload;
  },
  setHasLayoutShadowBottom(state, payload) {
    state.hasLayoutShadowBottom = payload;
  },
  setIsStoriesShow(state, payload) {
    state.isStoriesShow = payload;
  },
};

export const actions = {};
export const getters = {

  isMobileBottomMenuHideMobile({ isHideMobile }) { return isHideMobile.mobileBottomMenu; },
  isMobileBottomMenuDesktop({ isHideDesktop }) { return isHideDesktop.mobileBottomMenu; },
  isScrollPageHidden({ isPageScrollHidden }) { return isPageScrollHidden; },
  isHeaderOnSlider({ isHeaderOnSlider }) { return isHeaderOnSlider; },

};
