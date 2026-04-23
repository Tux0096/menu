<template>
  <div
    :class="{'promo-code--applied': isPromoApplied}"
    class="promo-code"
  >
    <BaseInput
      v-model="coupon"
      placeholder="Введите промокод"
      @submit="submit"
    >
      <template #icon>
        <button
          :class="{'promo-code__btn--applied': isPromoApplied}"
          class="promo-code__btn"
        >
          <template v-if="isPromoApplied">
            Удалить
          </template>
          <template v-else>
            Применить
          </template>
        </button>
      </template>
    </BaseInput>
    <div
      v-if="promoError"
      class="promo-code__message"
      v-html="promoError"
    />
  </div>
</template>
<script>
export default {
  name: 'AppPromoCode',
  data() {
    return {
      coupon: '',
    };
  },
  computed: {
    isPromoApplied() {
      return !!this.$store.state.cart.appliedCoupon;
    },
    promoError() {
      return this.$store.getters['cart/loyaltyProgramErrors'].join('<br>')
        .trim();
    },
    isAuth() {
      return this.$store.getters['user/isAuth'];
    },
  },
  async created() {
    this.coupon = this.$store.getters['cart/appliedCoupon'];
  },
  methods: {
    submit() {
      if (this.isPromoApplied) {
        this.deleteCoupon();
      } else {
        this.applyCoupon();
      }
    },
    async applyCoupon() {
      const coupon = this.coupon.trim();

      if (!coupon.length) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Вы не указали промокод.',
        });
        return;
      }

      await this.$store.dispatch('cart/setAppliedCoupon', coupon);
    },
    async deleteCoupon() {
      await this.$store.dispatch('cart/setAppliedCoupon', '');
    },
  },

};
</script>
<style lang="scss"
       scoped
>
.promo-code {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  > * {
    width: 100%;
  }

  // .promo-code__btn
  &__btn {

    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    display: flex;
    padding: extClamp(8) extClamp(12);
    text-align: center;
    color: var(---Main-White, #fff);
    border-radius: extClamp(6);
    background: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {

      font-size: 14px;
      padding: 10px 15px;
      border-radius: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      font-weight: 500;
      line-height: 100%;
      padding: 10px 15px;
      border-radius: 8px;
    }

    // .promo-code__btn--applied
    &--applied {
      background: var(---Extra-SpicyRed, #ff003d);

    }
  }

  // .promo-code__message
  &__message {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  &::v-deep .base-input__input {
    min-height: extClamp(42);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      height: 62px;
      min-height: 62px;
      padding: 10px;
    }

    @media screen and (min-width: 1280px) {
      height: 52px;
      min-height: 52px;
      padding: 16px;
    }
  }

  // ..base-input__icon-wrapper
  &::v-deep .base-input__icon-wrapper {
    top: 12px;
    right: 12px;
    padding: 0;
    gap: 0;

    @media screen and (min-width: 768px) {
      top: 10px;
      border-radius: 0;
      background: none;
    }

    @media screen and (min-width: 1280px) {
      top: 9px;
      right: 16px;
      height: 34px;
    }
  }

  // .promo-code--applied
  &--applied {
    &::v-deep .base-input__icon-wrapper {
      background-color: #ff003d;
    }
  }

}
</style>
