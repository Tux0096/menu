<template>
  <transition name="fade">
    <div
      v-if="isVisible"
      :aria-labelledby="`modal-title-${gift.id}`"
      aria-modal="true"
      class="new-year-modal-wrapper"
      role="dialog"
      @click.self="closeModal"
    >
      <div
        ref="modal"
        class="new-year-page__modal new-year-modal"
        tabindex="-1"
      >
        <button
          aria-label="Закрыть модальное окно"
          class="new-year-modal__close"
          @click="closeModal"
        >
          <svg
            aria-hidden="true"
            class="new-year-modal__close-icon"
          >
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#new-year-modal-close-icon" />
          </svg>
        </button>
        <div class="new-year-modal__inner">
          <div class="new-year-modal__image-wrapper">
            <nuxt-img
              v-if="gift.image"
              :src="gift.image"
              alt="Изображение подарка"
              class="new-year-modal__image"
              height="500"
              width="500"
            />
          </div>
          <h2
            :id="`modal-title-${gift.id}`"
            class="new-year-modal__title"
          >
            {{ gift.title }}
          </h2>
          <p class="new-year-modal__subtitle">
            {{ gift.subtitle }}
          </p>
          <div class="new-year-modal__promo-wrapper">
            Промокод:
            <button
              aria-label="Скопировать промокод"
              class="new-year-modal__promo"
              @click="copyPromocodeToClipboard(gift.promocode)"
            >
              {{ gift.promocode }}
              <svg
                aria-hidden="true"
                class="new-year-modal__copy-btn"
              >
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#copy-btn" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { copyTextToClipboard } from '~/lib/common';

export default {
  props: {
    gift: {
      type: Object,
      required: true,
    },
    isVisible: {
      type: Boolean,
      default: false,
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

.new-year-modal-wrapper {
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
  background: rgba(106, 203, 233, 0.8);
}

.new-year-modal {
  position: relative;
  min-width: extClamp(288);

  @media screen and (min-width: 768px) {
    min-width: 672px;
    min-height: 600px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .new-year-modal__close
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

  // .new-year-modal__close-icon
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

  // .new-year-modal__inner
  &__inner {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    padding: extClamp(28) extClamp(36);
    border: 1px solid #a5e9fb;
    border-radius: extClamp(32);
    background: url("@/assets/images/content/new-year/bg-modal-1.png"), linear-gradient(180deg, rgba(1, 153, 203, 0.90) 0%, rgba(165, 233, 251, 0.90) 100%);
    background-repeat: no-repeat;
    background-size: contain;
    gap: extClamp(10);
    backdrop-filter: blur(extClamp(21));

    @media screen and (min-width: 768px) {
      border-radius: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .new-year-modal__image-wrapper
  &__image-wrapper {
  }

  // .new-year-modal__image
  &__image {
    width: extClamp(168);
    height: extClamp(168);

    @media screen and (min-width: 768px) {
      width: 380px;
      height: 380px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .new-year-modal__title
  &__title {
    font-size: extClamp(20);
    font-weight: 700;
    line-height: 1;
    margin-top: extClamp(10);
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 36px;
      margin-top: 10px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .new-year-modal__subtitle
  &__subtitle {
    font-size: extClamp(14);
    font-weight: 500;
    margin-top: extClamp(2);
    margin-bottom: 0;
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 20px;
      margin-top: 4px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .new-year-modal__promo-wrapper
  &__promo-wrapper {
    font-size: extClamp(16);
    font-weight: 600;
    margin-top: extClamp(8);
    color: #006e92;

    @media screen and (min-width: 768px) {
      font-size: 36px;
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .new-year-modal__promo
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

  // .new-year-modal__copy-btn
  &__copy-btn {
    width: extClamp(12);
    height: extClamp(12);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
