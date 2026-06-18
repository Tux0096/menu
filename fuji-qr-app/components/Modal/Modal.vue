<template>
  <div class="modal-wrapper">
    <div
      v-if="isOpen"
      class="overlay"
      @click="onOverlayClick"
    />
    <div
      ref="modal"
      :class="{
        'modal--open': isOpen,
        [modalClass]: modalClass,
        'modal--with-icon': icon,
        'modal--center': isModalCenter
      }"
      class="modal"
    >
      <BaseCloseButton
        v-if="!isCloseButtonHideValue"
        class="modal__close-btn"
        @click="hideModal"
      />
      <div
        v-if="isModalHeaderShown"
        class="modal__header"
      >
        <div class="modal__header-inner">
          <div
            v-if="iconData"
            class="modal__icon-wrapper"
          >
            <!--            иконки LordIcon должны лежать в /static-->
            <lord-icon
              :colors="iconColors"
              :src="`/assets/libs/icon-json/${iconData}.json`"
              class="modal__icon"
              trigger="loop"
            />
          </div>

          <div
            v-if="modalTitle"
            class="modal__title"
          >
            {{ modalTitle }}
          </div>
        </div>
      </div>
      <div
        v-if="modalTitle && !iconData"
        class="modal__line"
      />
      <div
        ref="modal-content-wrapper"
        :class="{
          'modal__content-wrapper--has-scroll': isContentScrollable,
          'modal__content-wrapper--center': isModalCenter
        }"
        class="modal__content-wrapper"
      >
        <div
          ref="modal-content"
          :class="{
            'modal__content--not-max-height': isNotMaxHeight,
          }"
          class="modal__content"
          @scroll="onContentScroll"
        >
          <div
            v-if="content"
            class="modal__content-inner"
            v-html="content"
          />
          <component
            :is="currentComponent"
            v-else
            v-bind="innerComponentProps"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalIndex',
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    isCloseButtonHide: {
      type: Boolean,
      default: false,
    },
    isNotMaxHeight: {
      type: Boolean,
      default: false,
    },
    modalClass: {
      type: String,
      default: '',
    },
    title: {
      type: String,
      default: '',
    },
    icon: {
      type: String,
      default: '',
    },
    iconColors: {
      type: String,
      default: 'primary:#ffc1a7,secondary:#ff6523',
    },
    innerComponentProps: {
      type: Object,
      default: () => ({}),
    },
    content: {
      type: String,
      default: '',
    },
    //  выводить модальное окно по центру вертикально (по умолчанию модалка снизу)
    isModalCenter: {
      type: Boolean,
      default: false,
    },

  },
  data() {
    return {
      isContentScrollable: true,
      isContentScrolledToBottom: false,
      isContentScrolledToTop: true,

      // props
      isCloseButtonHideValue: this.isCloseButtonHide,
      iconData: this.icon,

      //
      internal: null,
    };
  },
  computed: {
    currentComponent() {
      return this.$store.state.modal.component;
    },
    isModalHeaderShown() {
      return this.title?.length > 0 || this.icon?.length > 0;
    },
    modalTitle() {
      return this.$store.state.modal.modalTitle || this.title;
    },

  },
  watch: {
    isOpen(val) {
      if (val) {
        this.$nextTick(() => {
          this.onContentScroll();
          this.iconData = this.icon;
        });
      }
    },

  },

  mounted() {
    this.onContentScroll();
    this.interval = setInterval(() => { this.modalTopPositionHandler(); }, 500);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.modalTopPositionHandler);
    clearInterval(this.interval);
  },
  methods: {
    modalTopPositionHandler() {
      // исключим окна по центра
      const excludedModals = [
        'modal-catalog-detail-item',
        'modal-address',
        'modal-auth',
      ];

      const modalEl = this.$refs.modal;

      if (!modalEl) { return; }
      if (excludedModals.some((className) => modalEl.classList.contains(className))) { return; }

      const modalContentWrapper = this.$refs['modal-content-wrapper'];

      if (modalContentWrapper && modalContentWrapper.scrollHeight <= modalContentWrapper.clientHeight) {
        modalEl.style.top = '';
      }

      if (!this.isOpen) {
        return;
      }

      const modalElRec = modalEl.getBoundingClientRect();

      if (modalElRec.top < 0) {
        modalEl.style.top = '0';
      }
    },
    hideModal() {
      if (this.currentComponent === 'AppRestaurantList') {
        const { selectedRestaurant } = this.$store.state.cart;
        if (!selectedRestaurant) {
          this.$notify({
            group: 'messages',
            type: 'error',
            text: 'Необходимо выбрать ресторан из списка',
          });
          return;
        }
      }
      this.$emit('close');
    },
    onOverlayClick() {
      if (!this.isCloseButtonHideValue) {
        this.hideModal();
      }
    },

    onContentScroll() {
      const content = this.$refs['modal-content'];

      this.isContentScrollable = content.scrollHeight > content.clientHeight;
      this.isContentScrolledToBottom = content.scrollHeight - content.scrollTop === content.clientHeight;
      this.isContentScrolledToTop = content.scrollTop === 0;
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.modal-wrapper {
  position: relative;
  z-index: 200;

}

.modal {
  position: fixed;
  right: extClamp(16);
  bottom: 0;
  left: extClamp(16);
  display: flex;
  flex-direction: column;
  width: auto;
  max-width: $modal-width;
  max-height: calc(100vh - extClamp(52) - var(--mobile-bottom-menu-bottom) - var(--safe-area-inset-bottom, 0) - var(--safe-area-inset-top, 0));
  margin-right: auto;
  margin-left: auto;
  padding: extClamp(28) extClamp(12) extClamp(0);
  transition: none;
  transform: translateY(100%);
  border-radius: extClamp(12) extClamp(12) 0 0;
  background: var(---Main-White, #fff);

  @media screen and (min-width: 768px) {
    right: 20px;
    left: 20px;
    max-width: 720px;
    padding: 48px 24px 36px;
    border-radius: 16px;
  }

  @media screen and (min-width: 1280px) {
    width: 100%;
    max-width: 640px;
    padding: 24px 16px;
    border-radius: 16px;
  }

  /**
   * Style for the open state of a mobile bottom menu.
   *
   * - The `bottom` property is dynamically adjusted to ensure the menu accounts for
   *   devices with safe area insets (like iPhone X).
   * - The `clamp()` function ensures the value stays between a minimum of 10px and a maximum of 14px.
   * - The menu slides into view using a smooth transform transition.
   */
  // .modal--open
  &--open {
    bottom: calc(extClamp(52) + max(var(--safe-area-inset-bottom), var(--mobile-bottom-menu-bottom)));
    transition: transform 0.3s ease-in-out;
    transform: translateY(0);

    @media screen and (min-width: 768px) {
      bottom: 50%;
      max-height: calc(100vh - var(--safe-area-inset-bottom, 0) - var(--safe-area-inset-top, 0) - extClamp(20));
      transform: translateY(50%);
    }

    @media screen and (min-width: 1280px) {
      bottom: 50%;
      transform: translateY(50%);

    }
  }

  // .modal--with-icon
  &--with-icon {
    padding-top: extClamp(20);

    @media screen and (min-width: 768px) {
      padding-top: 60px;
    }

    @media screen and (min-width: 1280px) {
      padding-top: 24px;
    }
  }

  // .modal--center
  &--center {
    bottom: 50%;
    max-height: calc(100vh - var(--safe-area-inset-bottom, 0) - var(--safe-area-inset-top, 0) - extClamp(20));
    transform: translateY(50%);
    border-radius: extClamp(12);
  }

  // .modal__header
  &__header {
    margin-bottom: extClamp(12);
    padding-right: extClamp(10);
    padding-left: extClamp(10);

    @media screen and (min-width: 768px) {
      margin-bottom: 16px;
      padding-right: 20px;
      padding-left: 20px;
    }

    @media screen and (min-width: 1280px) {
      margin-bottom: 0;
      padding-right: 16px;
      padding-bottom: 16px;
      padding-left: 16px;
    }

  }

  // .modal__header-inner
  &__header-inner {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

      gap: 16px;
    }

  }

  // .modal__line-close-btn
  &__line-close-btn {
    position: absolute;
    top: 0;
    right: 0;
    left: 0;

  }

  // .modal__close-btn
  &__close-btn {
    position: absolute;
    z-index: 1;
    top: extClamp(12);
    right: extClamp(12);
    cursor: pointer;

    @media screen and (min-width: 768px) {
      top: 16px;
      right: 16px;
    }

    @media screen and (min-width: 1280px) {
      top: 16px;
      right: 16px;
    }

  }

  // .modal__icon
  &__icon {
    width: extClamp(64);
    height: extClamp(64);

    @media screen and (min-width: 768px) {
      width: 80px;
      height: 80px;
    }

    @media screen and (min-width: 1280px) {
      width: 80px;
      height: 80px;
    }

  }

  // .modal__line
  &__line {
    align-self: stretch;
    width: 100%;
    height: 1px;
    margin-bottom: extClamp(12);
    background: var(---Secondary-FooterLightGray, #f6f6f6);

    @media screen and (min-width: 768px) {
      margin-bottom: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .modal__title
  &__title {
    font-size: extClamp(16);
    font-weight: 500;
    line-height: 120%;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 24px;
      line-height: 100%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 500;
      line-height: 120%;
    }

  }

  // .modal__content-wrapper
  &__content-wrapper {
    position: relative;
    overflow-y: auto;
    flex: 1;
    margin-right: extClampNegative(12);
    margin-left: extClampNegative(12);
    padding-right: extClamp(12);
    padding-bottom: extClamp(36);
    padding-left: extClamp(12);

    @media screen and (min-width: 768px) {
      margin-right: -24px;
      margin-left: -24px;
      padding-right: 24px;
      padding-bottom: 0;
      padding-left: 24px;
    }

    @media screen and (min-width: 1280px) {

    }

    &::-webkit-scrollbar {
      display: none;
    }

    // .modal__content-wrapper--has-scroll
    &--has-scroll {
      .modal__content {

      }

      .catalog-menu {

      }

    }

    // .modal__content-wrapper--center
    &--center {
      padding-bottom: extClamp(28);

      @media screen and (min-width: 768px) {
        padding-bottom: 0;
      }

      @media screen and (min-width: 1280px) {

      }
    }

  }

  // .modal__content
  &__content {
    position: relative;
    margin-right: extClampNegative(12);
    margin-bottom: 0;
    margin-left: extClampNegative(12);
    padding-right: extClamp(12);
    padding-left: extClamp(12);
    transition: max-height 0.2s ease-out;

    @media screen and (min-width: 768px) {
      margin-right: -24px;
      margin-left: -24px;
      padding-right: 24px;
      padding-left: 24px;
    }

    @media screen and (min-width: 1280px) {

    }

    // .modal__content--not-max-height
    &--not-max-height {

      &::after {
        display: none;
      }
    }

  }

  //
  &::v-deep .time-selection {
    padding-top: extClamp(8);

    @media screen and (min-width: 768px) {
      padding-top: 0;
    }

    @media screen and (min-width: 1280px) {
      padding-top: 24px;
    }

    &::-webkit-scrollbar {
      display: none;
    }
  }

}

.overlay {
  position: fixed;
  z-index: -1;
  top: 0;
  left: 0;
  display: block;
  width: 100%;
  height: 100%;

  background: rgba(64, 67, 83, 0.7);
  backdrop-filter: blur(10px);

}

.modal-address {

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {

  }

}

.modal-auth {
  bottom: 50%;
  max-height: calc(100vh - var(--safe-area-inset-bottom, 0) - var(--safe-area-inset-top, 0) - extClamp(40));
  padding-bottom: extClamp(15);
  transform: translateY(50%);

  @media screen and (min-width: 768px) {
    padding-bottom: 36px;
  }

  @media screen and (min-width: 1280px) {
    display: flex;
    padding: 24px 16px;
  }

  .modal__content {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  .modal__header {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.modal-catalog-detail-item {
  bottom: 50%;
  max-height: calc(100vh - var(--safe-area-inset-bottom, 0) - var(--safe-area-inset-top, 0) - extClamp(40));
  padding-top: extClamp(10);
  transform: translateY(50%);

  @media screen and (min-width: 768px) {
    width: 720px;
    max-width: 720px;
    padding: 16px 16px 0 16px;
  }

  @media screen and (min-width: 1280px) {
    width: auto;
    max-width: 1394px;
    padding: 64px 24px;
    border-radius: 24px;
  }

  .modal__content-wrapper {

    @media screen and (min-width: 768px) {
      padding-bottom: 0;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  .modal__content {
    overflow-x: hidden;
    overflow-y: auto;

    @media screen and (min-width: 768px) {
      margin-right: -16px;
      margin-left: -16px;
      padding-right: 16px;
      padding-left: 16px;
    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      padding-right: 0;
      padding-left: 0;
    }

  }

  .modal__header {
    position: relative;
    z-index: 2;
    height: 0;
    margin: 0;
    padding: 0;
    border: none;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  .close-button {
    top: extClamp(10);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: extClamp(3);
    color: #fff;
    border-radius: 50%;
    background-color: #993ca6;

    @media screen and (min-width: 768px) {
      top: 20px;
      width: 40px;
      height: 40px;
      padding: 0;
    }

    @media screen and (min-width: 1280px) {
      top: 16px;
      right: 16px;
      width: 30px;
      height: 30px;
    }

    &::v-deep .close-button__icon {
      width: extClamp(18);
      height: extClamp(18);

      @media screen and (min-width: 768px) {
        width: 28px;
        height: 28px;
      }

      @media screen and (min-width: 1280px) {
        width: 18px;
        height: 18px;
      }
    }
  }

}

.filter-modal {
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  padding-top: 0;
  border-radius: 0;
}

.modal-user-edit-form .modal__title {
  font-size: extClamp(14);

  @media screen and (min-width: 768px) {
    max-width: none;
  }

  @media screen and (min-width: 1280px) {

  }
}

.modal-auth {

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {

  }
}

.modal-catalog-menu {
  @media screen and (min-width: 768px) {
    padding-bottom: 91px;
  }

  @media screen and (min-width: 1280px) {
    max-width: max-content;
    padding-bottom: 24px;
  }

  &::v-deep {
    .catalog-menu {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        width: 680px;
      }
    }

  }
}

.modal-allergens {

  .modal__content-wrapper {

    &::-webkit-scrollbar {
      display: block;
    }
  }

  .modal__content {

  }
}

:is(.modal-checkout-select-restaurant, .modal-checkout-select-address) {
  .modal__content-wrapper {
    &::-webkit-scrollbar {
      display: block;
    }
  }
}

</style>
