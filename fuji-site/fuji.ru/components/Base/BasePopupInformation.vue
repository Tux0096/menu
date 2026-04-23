<template>
  <div
    ref="popupInfo"
    :class="`popup-info--${directionData}`"
    class="popup-info"
    @click.stop="showPopover"
  >
    <div
      :class="{'popup-info__icon-wrapper--active': isShow}"
      class="popup-info__icon-wrapper"
      @click="$emit('click')"
    >
      <svg
        :class="{'popup-info__icon--active': isShow}"
        class="popup-info__icon"
        @click.stop="onPopupInfoIconClick"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#detail-info" />
      </svg>
    </div>
    <div
      v-if="isShow"
      ref="popover"
      class="popup-info__content"
    >
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  name: 'BasePopupInformation',
  props: {
    direction: {
      type: String,
      default: 'bottom', // bottom, top
    },
    rootSelector: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      isShow: false,
      directionData: this.direction,

    };
  },
  mounted() {
    document.body.addEventListener('click', this.closeOnClickOutside);
    document.addEventListener('scroll', this.hidePopover);
  },
  beforeDestroy() {
    document.body.removeEventListener('click', this.closeOnClickOutside);
    document.removeEventListener('scroll', this.hidePopover);
  },
  methods: {
    showPopover() {
      if (this.isShow) {
        return;
      }
      this.$store.commit('view/setActivePopup', this);
      this.isShow = true;
      this.$emit('show');
      this.$nextTick(() => {
        this.adjustPopoverPosition();
      });
    },
    hidePopover() {
      if (!this.isShow) {
        return;
      }
      const { popupInfo: triggerEl } = this.$refs;

      if (triggerEl) {
        const triggerElStyles = getComputedStyle(triggerEl);

        triggerEl.style.zIndex = String(+triggerElStyles.zIndex - 1000);
      }

      this.isShow = false;
      this.$emit('hide');
    },
    onPopupInfoIconClick() {
      if (this.isShow) {
        this.hidePopover();
      } else {
        this.showPopover();
      }
    },
    adjustPopoverPosition() {
      function findParentWithOverflowNotVisible(element) {
        while (element) {
          const style = getComputedStyle(element);
          if (style.overflow !== 'visible') {
            return element;
          }
          element = element.parentElement;
        }
        return null;
      }

      const { popover: popoverEl, popupInfo: triggerEl } = this.$refs;

      const rootElement = document.querySelector(`${this.rootSelector}`);

      const triggerRect = triggerEl.getBoundingClientRect();
      const popoverRect = popoverEl.getBoundingClientRect();
      // const screenWidth = document.documentElement.clientWidth;
      const rootWidth = rootElement.clientWidth;

      const childElement = triggerEl;

      const parentRect = rootElement.getBoundingClientRect();
      const childRect = childElement.getBoundingClientRect();

      const relativePosX = childRect.left - parentRect.left;
      // const relativePosY = childRect.top - parentRect.top;

      /// /////////

      if (triggerEl) {
        const triggerElStyles = getComputedStyle(triggerEl);
        triggerEl.style.zIndex = String(+triggerElStyles.zIndex + 1000);
      }

      const triggerRectWidth = triggerRect.width;

      const popoverHalfWidth = popoverRect.width / 2;
      const triggerHalfWidth = triggerRectWidth / 2;

      const padding = 16;

      const leftFreeSpace = relativePosX;
      // const rightFreeSpace = relativePosX + triggerRectWidth - popoverHalfWidth;
      const rightFreeSpace = rootWidth - relativePosX - triggerRectWidth;

      let styles = {};

      if (popoverHalfWidth <= leftFreeSpace && popoverHalfWidth <= rightFreeSpace) {
        // center

        styles = {
          left: `${-popoverHalfWidth + triggerHalfWidth}px`,
          right: `${-popoverHalfWidth + triggerHalfWidth}px`,
        };
      } else if (rootWidth < popoverRect.width + padding * 2) {
        styles = {
          left: `${-leftFreeSpace + 0}px`,
          right: `${-rightFreeSpace + 20}px`,

        };
      } else if (popoverHalfWidth > rightFreeSpace) {
        styles = { right: `${-rightFreeSpace}px` };
      } else if (popoverHalfWidth > leftFreeSpace) {
        styles = { left: `${-leftFreeSpace}px` };
      }

      Object.assign(popoverEl.style, styles);

      const result = findParentWithOverflowNotVisible(triggerEl);
      if (result) {
        const resultRect = result.getBoundingClientRect();

        if (popoverRect.top < resultRect.top) {
          this.directionData = 'down';
        }
      }
    },

    closeOnClickOutside(event) {
      if (!this.$el.contains(event.target) && this.isShow) {
        this.hidePopover();
      }
    },

  },
};
</script>

<style lang="scss"
       scoped
>

$bottom: 6px;
$top: 6px;

$width: 18px;
$height: 10px;

.popup-info {
  position: relative;
  z-index: 1;
  cursor: pointer;

  // .popup-info__icon-wrapper
  &__icon-wrapper {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: extClamp(5);
    border-radius: 50%;
    background: var(---Primary-LightGray, #f5f5f5);
    background-color: #f0f0f0;

    @media screen and (min-width: 768px) {
      padding: 8px;
    }

    @media screen and (min-width: 1280px) {
      padding: 5px;
    }

    &::after {
      position: absolute;

      top: calc(100% + extClamp($bottom));
      left: 50%;
      display: none;
      width: extClamp($width);
      height: extClamp($height);
      content: '';
      transform: translateX(-50%);
      background-image: url(~assets/images/icons/svg/dropdown-arrow-2.svg);
      background-repeat: no-repeat;
      background-position: center bottom -1px;

      @media screen and (min-width: 768px) {
        top: calc(100% + $bottom);
        width: $width;
        height: $height;

      }

      @media screen and (min-width: 1280px) {

      }
    }

    // .popup-info__icon-wrapper--active
    &--active {
      &::after {
        display: block;

      }
    }

  }

  // .popup-info__icon
  &__icon {
    width: extClamp(14);
    height: extClamp(14);
    color: #d9d9d9;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {
      width: 18px;
      height: 18px;
    }

    // .popup-info__icon--active
    &--active {

    }
  }

  // .popup-info__content
  &__content {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 120%;
    position: absolute;
    z-index: 1;
    top: calc(100% + extClamp($bottom) + extClamp($height));
    display: block;
    width: min-content;
    min-width: extClamp(264);
    padding: extClamp(16) extClamp(16);
    color: var(---Main-Black, #292929);
    border: 1px solid var(---Main-Purple, #993ca6);
    border-radius: extClamp(12);
    background: var(---Primary-LightGray, #f5f5f5);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 140%;
      top: calc(100% + $bottom);

      min-width: 420px;
      margin-top: $height - 1;
      padding: 20px;
      color: var(---Main-Black, #292929);
      border-radius: 12px;
      box-shadow: 0 6px 30px 0 rgba(84, 84, 84, 0.08);
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      border-radius: 8px;
    }
  }
}

.popup-info--top {

  // .popup-info__icon-wrapper
  .popup-info__icon-wrapper {

    &::after {
      top: initial;
      bottom: calc(100% + extClamp($bottom));
      left: 50%;
      transform: rotate(180deg) translateX(50%);

      @media screen and (min-width: 768px) {
        bottom: calc(100% + $bottom);
      }

      @media screen and (min-width: 1280px) {

      }

    }

    // .popup-info__icon-wrapper--active
    &--active {
      &::after {

      }
    }

  }

  // .popup-info__icon
  .popup-info__icon {

    // .popup-info__icon--active
    &--active {

    }
  }

  // .popup-info__content
  .popup-info__content {
    top: initial;
    bottom: calc(100% + extClamp($bottom) + extClamp($height));

    @media screen and (min-width: 768px) {
      bottom: calc(100% + $bottom + $height);
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

</style>
