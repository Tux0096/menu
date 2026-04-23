<template>
  <transition name="modal-fade">
    <div
      v-if="visible"
      class="promo-modal"
      @click.self="handleClose"
    >
      <div
        class="promo-modal__overlay"
        @click="handleClose"
      />
      <AdventCalendarToolbar
        v-if="false"
        @back="$emit('back')"
      />
      <div class="promo-modal__footer-text">
        Только на доставку и самовывоз {{ formattedDate }}
        Сумма заказа указана без учёта
        доставки и сервисного сбора
      </div>

      <div class="promo-modal__card">
        <div class="promo-modal__image">
          <nuxt-img
            v-if="promo.image"
            :alt="promo.title"
            :src="promo.image"
            class="fb-promos-modal__image"
            format="webp"
            height="500"
            loading="lazy"
            quality="80"
            width="500"
          />
        </div>

        <div class="promo-modal__content">
          <div class="promo-modal__text-block">
            <div class="promo-modal__main-text">
              <h3 class="promo-modal__title">
                {{ promo.title || 'Ваш подарок' }}
              </h3>
              <p
                v-if="promo.description"
                class="promo-modal__description"
              >
                {{ promo.description }}
              </p>
            </div>

            <div
              class="promo-modal__promo"
              @click="copyPromocodeToClipboard(promo.code)"
            >
              <span class="promo-modal__promo-text">
                Промокод: <span class="promo-modal__promo-code">{{ promo.code }}</span>
              </span>

              <svg
                class="promo-modal__copy-icon"
                fill="none"
                height="16"
                viewBox="0 0 16 16"
                width="16"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M9.35 3.83398H7.7275C6.9925 3.83398 6.41 3.83398 5.95458 3.89565C5.48542 3.95898 5.10583 4.09232 4.80667 4.39273C4.50708 4.69315 4.37417 5.0744 4.31125 5.54523C4.25 6.00273 4.25 6.58732 4.25 7.32523V9.75773C4.25 10.3861 4.63333 10.9244 5.17792 11.1502C5.15 10.7711 5.15 10.2398 5.15 9.79732V7.70982C5.15 7.17607 5.15 6.71565 5.19917 6.34732C5.25208 5.95232 5.37125 5.57398 5.67708 5.2669C5.98292 4.95982 6.36 4.84023 6.75333 4.7869C7.12 4.73773 7.57833 4.73773 8.11042 4.73773H9.38958C9.92125 4.73773 10.3787 4.73773 10.7458 4.7869C10.6359 4.50619 10.4439 4.26513 10.1949 4.09514C9.94591 3.92516 9.65148 3.83415 9.35 3.83398Z"
                  fill="white"
                />
                <path
                  d="M5.75 7.74943C5.75 6.61359 5.75 6.04568 6.10167 5.69276C6.45292 5.33984 7.01833 5.33984 8.15 5.33984H9.35C10.4812 5.33984 11.0471 5.33984 11.3987 5.69276C11.7504 6.04568 11.75 6.61359 11.75 7.74943V9.75776C11.75 10.8936 11.75 11.4615 11.3987 11.8144C11.0471 12.1673 10.4812 12.1673 9.35 12.1673H8.15C7.01875 12.1673 6.45292 12.1673 6.10167 11.8144C5.75 11.4615 5.75 10.8936 5.75 9.75776V7.74943Z"
                  fill="white"
                />
              </svg>
            </div>
          </div>

          <button
            class="promo-modal__btn"
            @click="applyToCart"
          >
            В корзину
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
import { copyTextToClipboard } from '~/lib/common';
import AdventCalendarToolbar from '~/components/Actions/Advent2025/AdventCalendarToolbar.vue';

export default {
  name: 'PromoModal',
  components: { AdventCalendarToolbar },
  props: {
    visible: {
      type: Boolean,
      default: false,
    },
    day: {
      type: Object,
      required: true,
    },
    promo: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {};
  },
  computed: {
    formattedDate() {
      if (!this.day?.date) {
        return '';
      }

      const date = new Date(this.day.date);

      const day = String(date.getDate())
        .padStart(2, '0');
      const month = String(date.getMonth() + 1)
        .padStart(2, '0');
      return `${day}.${month}.`;
    },
  },
  methods: {
    handleClose() {
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

    applyToCart() {
      this.$emit('apply-promo', this.promo.code);
      this.handleClose();
      this.$store.dispatch('cart/setAppliedCoupon', this.promo.code);
      this.$router.push('/cart');
    },
  },
};
</script>

<style lang="scss" scoped>
.promo-modal {
  position: fixed;
  z-index: 1000;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: extClamp(20);

  @media screen and (min-width: 768px) {
    padding: 40px;
  }

  &__overlay {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: rgba(9, 25, 50, 0.75);
    backdrop-filter: blur(8px);
  }

  &__footer-text {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-size: extClamp(13);
    font-weight: 300;
    line-height: normal;
    position: absolute;
    z-index: 1;
    bottom: extClamp(30);
    left: 50%;
    width: extClamp(250);
    transform: translateX(-50%);
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      bottom: 37px;
      width: 306px;
    }
  }

  // .promo-modal__card
  &__card {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: extClamp(288);

    @media screen and (min-width: 768px) {
      max-width: 358px;
    }

    @media screen and (min-width: 1280px) {
      max-width: 512px;
    }
  }

  // .promo-modal__image
  &__image {
    position: absolute;
    z-index: 2;
    bottom: extClamp(185);
    left: 50%;
    width: extClamp(200);
    height: extClamp(200);
    transform: translateX(-50%);

    @media screen and (min-width: 768px) {
      top: -110px;
      width: 240px;
      height: 240px;
    }

    @media screen and (min-width: 1280px) {
      top: -176px;
      width: 352px;
      height: 352px;
    }

    img {
      width: 100%;
      height: auto;
      object-fit: contain;
    }
  }

  // .promo-modal__content
  &__content {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: flex-end;
    padding: extClamp(108) 0 extClamp(24);
    border-radius: extClamp(24);
    border-image: linear-gradient(224deg, rgba(255, 255, 255, 1) 3%, rgba(0, 109, 255, 1) 48%, rgba(255, 255, 255, 1) 98%) 1;
    background: linear-gradient(-39deg, rgba(6, 14, 37, 0) 0%, rgba(6, 14, 37, 1) 100%),
    #002a4d;
    box-shadow: 0 0 extClamp(17) rgba(255, 255, 255, 0.15),
    inset 0 0 extClamp(6) rgba(17, 138, 255, 1);
    gap: extClamp(16);
    backdrop-filter: blur(extClamp(52.7));

    @media screen and (min-width: 768px) {
      padding: 130px 0 24px;
      border-radius: 24px;
      box-shadow: 0 0 17px rgba(255, 255, 255, 0.15),
      inset 0 0 6px rgba(17, 138, 255, 1);
      gap: 12px;
      backdrop-filter: blur(52.7px);
    }

    @media screen and (min-width: 1280px) {
      padding: 178px 0 32px;
      gap: 32px;
    }
  }

  // .promo-modal__text-block
  &__text-block {
    display: flex;
    align-items: center;
    flex-direction: column;
    width: extClamp(338);
    max-width: 100%;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      width: 100%;
      padding: 0 20px;
      gap: 6px;
    }
    @media screen and (min-width: 1280px) {
      gap: 12px;
    }
  }

  // Заголовок и описание
  &__main-text {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: extClamp(4);

    @media screen and (min-width: 768px) {
      gap: 6px;
    }
  }

  // .promo-modal__title
  &__title {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-size: extClamp(20);
    font-weight: 700;
    line-height: 1.26;
    margin: 0;
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 24px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 32px;
    }
  }

  // .promo-modal__description
  &__description {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-size: extClamp(14);
    font-weight: 300;
    line-height: 1.225;
    margin: 0;
    text-align: center;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
    }
  }

  // Промокод
  &__promo {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    gap: extClamp(4);

    @media screen and (min-width: 768px) {
      gap: 5px;
    }

  }

  // .promo-modal__promo-text
  &__promo-text {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-size: extClamp(16);
    font-weight: 600;
    line-height: 1.26;
    user-select: all;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 18px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
    }
  }

  &__promo-code {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-weight: 700;
    text-decoration: underline;
    text-decoration-skip-ink: none;
    text-underline-position: from-font;
  }

  &__copy-icon {
    flex-shrink: 0;
    width: extClamp(16);
    height: extClamp(16);
    transition: opacity 0.2s;

  }

  // .promo-modal__btn
  &__btn {
    font-family: 'GG Kizhich', sans-serif;
    font-size: extClamp(18);
    font-weight: 700;
    line-height: normal;
    position: relative;
    width: extClamp(192);
    height: extClamp(46);
    cursor: pointer;
    transition: all 0.3s ease;
    color: #fff;
    border: extClamp(0.5) solid #fff;
    border-radius: extClamp(8);
    background: linear-gradient(180deg, #fe00a5 0%, #a7006c 100%);
    box-shadow: inset 0px 0px extClamp(8) #fff;
    backdrop-filter: blur(extClamp(2));

    @media screen and (min-width: 768px) {
      font-size: 18px;
      width: 192px;
      height: 46px;
      border-width: 0.5px;
      border-radius: 8px;
      box-shadow: inset 0px 0px 8px #fff;
      backdrop-filter: blur(2px);
    }

    @media screen and (min-width: 1280px) {
      font-size: 28px;
      width: 238px;
      height: 67px;
    }

    &:hover {
      transform: translateY(-2px);
      box-shadow: 0px 4px 12px rgba(254, 0, 165, 0.4),
      inset 0px 0px 12px #fff;
    }

    &:active {
      transform: translateY(0);
    }
  }

  // Уведомление о копировании
  &__copied-toast {
    font-family: 'Avenir Next Cyr', sans-serif;
    font-size: extClamp(14);
    font-weight: 400;
    position: absolute;
    z-index: 10;
    top: extClamp(20);
    left: 50%;
    padding: extClamp(12) extClamp(24);
    transform: translateX(-50%);
    color: #fff;
    border-radius: extClamp(8);
    background: rgba(0, 255, 148, 0.9);
    box-shadow: 0px 4px 12px rgba(0, 255, 148, 0.3);

    @media screen and (min-width: 768px) {
      font-size: 15px;
      top: 24px;
      padding: 14px 28px;
      border-radius: 8px;
    }
  }
}

// Transitions
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s;

  .promo-modal__content {
    transition: transform 0.3s;
  }
}

.modal-fade-enter,
.modal-fade-leave-to {
  opacity: 0;

  .promo-modal__content {
    transform: scale(0.9) translateY(20px);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter,
.fade-leave-to {
  opacity: 0;
}
</style>
