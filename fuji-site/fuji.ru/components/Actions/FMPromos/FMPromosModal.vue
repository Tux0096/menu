<template>
  <div
    v-if="isVisible"
    :aria-labelledby="`modal-title-${gift.promocode}`"

    aria-modal="true"
    class="fb-promos-modal-wrapper"
    role="dialog"
    @click.self="closeModal"
  >
    <div
      ref="modal"

      class="fb-promos-page__modal fb-promos-modal"
      tabindex="-1"
    >
      <button
        :style="{
          color: gift.cardColor
        }"
        aria-label="Закрыть модальное окно"
        class="fb-promos-modal__close"
        @click="closeModal"
      >
        <svg
          aria-hidden="true"
          class="fb-promos-modal__close-icon"
        >
          <use xlink:href="~/assets/images/icons/svg/fm-promos.svg#fb-promos-modal-close-icon" />
        </svg>
      </button>
      <div
        :style="{
          backgroundColor: gift.cardColor
        }"
        class="fb-promos-modal__inner"
      >
        <div class="fb-promos-modal__bg">
          <svg class="fb-promos-modal__bg-icon">
            <use xlink:href="~/assets/images/icons/svg/fm-promos.svg#heart" />
          </svg>
        </div>

        <div class="fb-promos-modal__image-wrapper">
          <nuxt-img
            v-if="image"
            :src="image"
            alt="Изображение подарка"
            class="fb-promos-modal__image"
            format="webp"
            height="500"
            loading="lazy"
            quality="80"
            width="500"
          />
        </div>
        <h2
          :id="`modal-title-${gift.promocode}`"
          class="fb-promos-modal__title"
        >
          {{ title }}
        </h2>
        <p class="fb-promos-modal__subtitle">
          {{ gift.subtitle }}
        </p>
        <div class="fb-promos-modal__promo-wrapper">
          Промокод:
          <button
            aria-label="Скопировать промокод"
            class="fb-promos-modal__promo"
            @click="copyPromocodeToClipboard(gift.promocode)"
          >
            {{ gift.promocode }}
            <svg
              aria-hidden="true"
              class="fb-promos-modal__copy-btn"
            >
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#copy-btn" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { copyTextToClipboard } from '~/lib/common';

export default {
  props: {
    gift: {
      type: Object,
      default: null,
    },
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    product() {
      return this.$store.getters['catalog/productByCode'](this.gift.productCode) || null;
    },
    image() {
      return this.product?.image || null;
    },
    title() {
      return this.product?.name || '';
    },
  },
  watch: {
    isVisible(value) {
      if (value) {
        document.addEventListener('keydown', this.handleKeydown);
      } else {
        document.removeEventListener('keydown', this.handleKeydown);
      }
    },
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown);
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },
    async copyPromocodeToClipboard(promocode) {
      try {
        await copyTextToClipboard(promocode);
        this.$notify({
          group: 'messages',
          type: 'success',
          text: `Промокод "${promocode}" скопирован`,
        });
      } catch (e) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Не удалось скопировать промокод. Попробуйте еще раз или используйте для копирования средства операционной системы!',
        });
      }
    },
    handleKeydown(event) {
      if (event.key === 'Escape') {
        this.closeModal();
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}

.fb-promos-modal-wrapper {
  position: fixed;
  z-index: 100;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;

  &::before {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    display: block;
    width: 100%;
    height: 100%;
    content: "";
    background: rgba(0, 0, 0, 0.50);

    backdrop-filter: blur(32px);
  }
}

.fb-promos-modal {
  position: relative;
  min-width: extClamp(288);

  @media screen and (min-width: 768px) {
    min-width: 672px;
    min-height: 600px;
  }

  @media screen and (min-width: 1280px) {
    min-width: 862px;
    min-height: 731px;
  }

  // .fb-promos-modal__close
  &__close {
    position: absolute;
    top: extClampNegative(48);
    right: 0;
    display: flex;
    align-items: center;
    flex-direction: row;
    justify-content: center;
    width: extClamp(36);
    height: extClamp(36);
    padding: extClamp(4);
    cursor: pointer;
    border: 1px solid #fff;
    border-radius: 50%;
    background: #fff;

    @media screen and (min-width: 768px) {
      z-index: 1;
      top: 24px;
      right: 24px;
      width: 36px;
      height: 36px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .fb-promos-modal__close-icon
  &__close-icon {
    width: extClamp(20);
    height: extClamp(20);

    @media screen and (min-width: 768px) {
      width: 20px;
      height: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .fb-promos-modal__inner
  &__inner {
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    padding: extClamp(24);
    border: 2px solid #fff;
    border-radius: extClamp(24);
    background-repeat: no-repeat;
    background-size: contain;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      border-radius: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .fb-promos-modal__bg
  &__bg {
    position: absolute;
    top: 0;
    left: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    opacity: 0.1;
  }

  // .fb-promos-modal__bg-icon
  &__bg-icon {
    width: extClamp(256);
    height: extClamp(256);

    @media screen and (min-width: 768px) {
      width: 624px;
      height: 491px;
    }

    @media screen and (min-width: 1280px) {
      width: 804px;
      height: 633px;
    }
  }

  // .fb-promos-modal__image-wrapper
  &__image-wrapper {
    position: relative;
  }

  // .fb-promos-modal__image
  &__image {
    width: extClamp(168);
    height: extClamp(168);

    @media screen and (min-width: 768px) {
      width: 380px;
      height: 380px;
    }

    @media screen and (min-width: 1280px) {
      width: 492px;
      height: 492px;
    }
  }

  // .fb-promos-modal__title
  &__title {
    font-size: extClamp(16);
    font-weight: 700;
    line-height: 1;
    position: relative;
    margin-top: extClamp(10);
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 36px;
      margin-top: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 48px;
    }
  }

  // .fb-promos-modal__subtitle
  &__subtitle {
    font-size: extClamp(14);
    font-weight: 500;
    position: relative;
    margin-top: extClamp(4);
    margin-bottom: 0;
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 20px;
      margin-top: 4px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
    }
  }

  // .fb-promos-modal__promo-wrapper
  &__promo-wrapper {
    font-size: extClamp(16);
    font-weight: 600;
    position: relative;
    margin-top: extClamp(8);
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 36px;
      margin-top: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .fb-promos-modal__promo
  &__promo {
    font-weight: 700;
    display: inline-flex;
    align-items: flex-start;
    cursor: pointer;
    gap: extClamp(4);

    @media screen and (min-width: 768px) {
      gap: 12px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .fb-promos-modal__copy-btn
  &__copy-btn {
    width: extClamp(12);
    height: extClamp(12);
    color: #fff;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
