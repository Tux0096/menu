<template>
  <div class="cart-empty">
    <div class="cart-empty__icon-wrapper">
      <lord-icon
        :src="`/assets/libs/icon-json/cart.json`"
        class="cart-empty__icon"
        trigger="loop"
      />
    </div>
    <div class="cart-empty__title">
      Корзина пустая
    </div>
    <div class="cart-empty__line" />
    <div
      v-if="hasLastOrder"
      class="cart-empty__date"
    >
      <svg class="cart-empty__date-icon">
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#calendar" />
      </svg>
      Последний заказ в {{ formatTime }} от {{ formatDate }}
    </div>

    <BaseGradientButton
      v-if="hasLastOrder"
      class="cart-empty__btn"
      type="outline"
      @click="repeatOrder"
    >
      Повторить последний заказ
    </BaseGradientButton>
    <BaseGradientButton
      v-else
      class="cart-empty__btn"
      type="outline"
      @click="showMenu"
    >
      Посмотреть меню
    </BaseGradientButton>
  </div>
</template>

<script>

import { sliceDate } from '@/lib/common';
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  components: { BaseGradientButton },
  computed: {
    lastOrder() {
      return this.$store.getters['user/lastOrder'];
    },
    hasLastOrder() {
      return this.$store.getters['user/hasLastOrder'];
    },
    formatTime() {
      const { hour, minute } = sliceDate(this.lastOrder.createdAt);
      return `${hour}:${minute}`;
    },
    formatDate() {
      const { day, month, year } = sliceDate(this.lastOrder.createdAt);
      return `${day}.${month}.${year}`;
    },
  },
  methods: {
    repeatOrder() {
      this.$store.dispatch('cart/repeatOrder');
    },
    showMenu() {
      this.$router.push('/');
      this.$store.commit('modal/hideModal');
      window.scrollTo({
        top: 0,
        behavior: 'smooth',
      });
    },
  },
};
</script>

<style lang="scss"
       scoped
>

.cart-empty {
  display: flex;
  align-items: center;
  flex-direction: column;
  text-align: center;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    gap: 12px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .cart-empty__icon-wrapper
  &__icon-wrapper {
  }

  // .cart-empty__icon
  &__icon {
    width: extClamp(50);
    height: extClamp(50);
    color: #993ca6;
  }

  // .cart-empty__title
  &__title {
    font-size: 16px;
    font-weight: 500;
    line-height: 120%;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 24px;
      line-height: 100%;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .cart-empty__line
  &__line {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: extClamp(1);
    background-color: #f0f0f0;
  }

  // .cart-empty__date
  &__date {
    font-size: extClamp(12);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    display: flex;
    align-items: center;
    text-align: center;
    color: var(---Primary-Gray, #969696);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .cart-empty__date-icon
  &__date-icon {
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .cart-empty__repeat-icon
  &__repeat-icon {
  }

  // .cart-empty__btn
  &__btn {
    width: 100%;
  }
}
</style>
