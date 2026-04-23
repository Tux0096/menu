export const state = () => ({
  isShowModal: false,
  component: null,
  callback: null,
  params: null,
  modalTitle: '',
  modalInstance: null,
});
export const mutations = {
  setModalInstance(state, instance) {
    state.modalInstance = instance;
  },
  showModal(state, payload) {
    this.commit('modal/hideModal');

    if (payload.callback) {
      this.commit('modal/setCallback', payload.callback);
    }
    if (payload.component) {
      this.commit('modal/setComponent', payload.component);
    }
    if (payload.params) {
      this.commit('modal/setParams', payload.params);
    }
    state.isShowModal = true;
  },
  hideModal(state) {
    state.isShowModal = false;
    state.callback = null;
    state.component = null;
    state.params = null;
    state.modalTitle = '';
    if (state.modalInstance?.isCloseButtonHideValue) {
      state.modalInstance.isCloseButtonHideValue = false;
    }
  },

  setCallback(state, callback) {
    state.callback = callback;
  },
  setComponent(state, component) {
    state.component = component;
  },
  setParams(state, params) {
    state.params = params;
  },
  setModalTitle(state, title) {
    state.modalTitle = title;
  },

  showCityModal() {
    this.commit(
      'modal/showModal',
      {
        component: 'CitySelection',
        params: {
          title: 'Выберите свой город',
          isNotMaxHeight: true,
          isCloseButtonHide: true,
        },
      },
    );
  },
  showAllergensSelector() {
    this.commit(
      'modal/showModal',
      {
        component: 'AllergensSelector',
        params: {
          title: 'Исключить аллергены',
          modalClass: 'modal-allergens',
        },
      },
    );
  },
  showUserEditForm() {
    this.commit(
      'modal/showModal',
      {
        component: 'UserEditForm',
        params: {
          title: 'Редактирование информации',
          isNotMaxHeight: true,
          isCloseButtonHide: false,
          modalClass: 'modal-user-edit-form',
        },
      },
    );
  },
  showConfirm(state, payload) {
    this.commit(
      'modal/showModal',
      {
        component: 'ModalConfirm',
        params: {
          title: payload.title,
          isNotMaxHeight: true,
          isCloseButtonHide: false,
          modalClass: 'modal-user-edit-form',
          innerComponentProps: {
            confirmCallback: payload.confirmCallback,
            confirmBtnTitle: payload.confirmBtnTitle,
            cancelCallback: payload.cancelCallback,
            cancelBtnTitle: payload.cancelBtnTitle,
            content: payload.content,
          },
        },
      },
    );
  },
  showCatalogModal() {
    this.commit(
      'modal/showModal',
      {
        component: 'CatalogMenu',
        params: {
          title: 'Меню:',
          modalClass: 'modal-catalog-menu',
        },
      },
    );
  },
  showCatalogDetailItem(state, payload) {
    this.commit(
      'modal/showModal',
      {
        component: 'CatalogDetailItem',
        params: {
          isModalCenter: true,
          modalClass: 'modal-catalog-detail-item',
          isCloseButtonHide: false,
          innerComponentProps: {
            product: payload.product,
          },

        },
      },
    );
  },
  showDeliveryModal() {
    const cityIikoId = this.getters['city/cityIikoId'];
    const userId = this.getters['user/id'];
    if (!cityIikoId || !userId) return;

    this.commit(
      'modal/showModal',
      {
        component: 'AppDeliverySelected',

        params: {
          title: 'Способ доставки',
          isNotMaxHeight: true,
          isCloseButtonHide: false,
          modalClass: 'modal-checkout-select-address',
          innerComponentProps: {
            onSetDeliverySelf: () => {
              this.dispatch('cart/setDeliveryMethod', 'self');
            },
            onSetDeliveryDelivery: () => {
              this.dispatch('cart/setDeliveryMethod', 'delivery');
            },
          },

        },
      },
    );
  },
  showAuthModal() {
    this.commit(
      'modal/showModal',
      {
        component: 'AppAuth',
        params: {
          isModalCenter: true,
          isNotMaxHeight: true,
          isCloseButtonHide: true,
          icon: 'auth',
          modalClass: 'modal-auth',
        },
      },
    );
  },
  showTimeModal(state, payload) {
    this.commit(
      'modal/showModal',
      {
        component: 'BaseTimeSelection',
        callback: payload.callback,
        params: {
          isNotMaxHeight: true,
          isCloseButtonHide: false,
          innerComponentProps: {
            propSelectedTime: payload.selectedTime,
          },
        },
      },
    );
  },
  showRestaurantModal() {
    this.commit(
      'modal/showModal',
      {
        component: 'AppRestaurantList',
        params: {
          modalClass: 'modal-checkout-select-restaurant',
          isNotMaxHeight: false,
          isCloseButtonHide: false,
          title: 'Выберите ресторан',
        },
      },
    );
  },
  showAddressModal(_state, componentName = 'Address') {
    this.commit(
      'modal/showModal',
      {
        component: componentName,
        params: {
          isModalCenter: true,
          isNotMaxHeight: true,
          modalClass: 'modal-address',
        },
      },
    );
  },
  showEmptyCartModal() {
    this.commit(
      'modal/showModal',
      {
        component: 'CartEmpty',
        params: {
          isNotMaxHeight: false,
          isCloseButtonHide: false,
        },
      },
    );
  },
  showModsModal(state, payload) {
    this.commit(
      'modal/showModal',
      {
        component: 'CatalogItemMods',
        callback: payload.callback,
        params: {
          title: 'Выберите ролл',
          isNotMaxHeight: false,
          isCloseButtonHide: false,
        },
      },
    );
  },

  showSnackGiftModal() {
    this.commit(
      'modal/showModal',
      {
        component: 'AppSnackGift',
        params: {
          title: 'При заказе 3х любых закусок - картофель фри в подарок',
          isModalCenter: true,
          isNotMaxHeight: true,
          isCloseButtonHide: false,
        },
      },
    );
  },

  showNotWorkModal(state, payload) {
    let text = 'По техническим причинам прием заказов временно невозможен приносим свои извинения';
    const { TEXT_SITE_NOT_WORKING } = payload;
    if (TEXT_SITE_NOT_WORKING) {
      text = TEXT_SITE_NOT_WORKING;
    }
    this.commit(
      'modal/showModal',
      {
        component: 'AppContent',
        params: {
          title: '',
          isModalCenter: true,
          content: `<div class="not-work-text">${text}</div>`,
          isNotMaxHeight: true,
          isCloseButtonHide: false,
          icon: 'clock',
        },
      },
    );
  },

  showInformationModal(state, payload) {
    let text = '';
    const { TEXT_SITE_INFORMATION } = payload;
    if (TEXT_SITE_INFORMATION) {
      text = TEXT_SITE_INFORMATION;
    }
    this.commit(
      'modal/showModal',
      {
        component: 'AppContent',
        params: {
          title: '',
          isModalCenter: true,
          content: `<div class="not-work-text">${text}</div>`,
          isNotMaxHeight: true,
          isCloseButtonHide: false,
          icon: 'clock',
        },
      },
    );
  },

  showWorkTimeModal(_state, payload) {
    const { workTime } = payload;
    const content = '<div class="not-work-text"><div class="not-work-text__bottom"> приносим свои извинения</div></div>';
    this.commit(
      'modal/showModal',
      {
        component: 'AppContent',
        params: {
          title: `К сожалению оформление заказа возможно только с ${workTime.open} до ${workTime.close}`,
          isModalCenter: true,
          content,
          isNotMaxHeight: true,
          isCloseButtonHide: false,
          icon: 'clock',
        },
      },
    );
  },

};
export const actions = {};
export const getters = {
  isShowModal(state) {
    return state.isShowModal;
  },
  isMenuActive(state) {
    return state.component === 'CatalogMenu';
  },
  isFilterActive(state) {
    return state.component === 'FilterComponent';
  },
};
