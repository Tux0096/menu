<template>
  <div class="order-page">
    <h1 class="order-page__title">
      Ваш заказ
    </h1>

    <div
      v-if="!cartItems.length"
      class="order-page__empty"
    >
      <p>Заказ пока пуст</p>
      <button
        type="button"
        class="order-page__btn order-page__btn--secondary"
        @click="goMenu"
      >
        Перейти в меню
      </button>
    </div>

    <template v-else>
      <ul class="order-page__list">
        <li
          v-for="(item, idx) in cartItems"
          :key="idx"
          class="order-page__item"
        >
          <div class="order-page__item-name">
            {{ item.product.name }}
          </div>
          <div class="order-page__item-row">
            <div class="order-page__qty">
              <button
                type="button"
                @click="changeQty(item, -1)"
              >
                −
              </button>
              <span>{{ item.quantity }}</span>
              <button
                type="button"
                @click="changeQty(item, 1)"
              >
                +
              </button>
            </div>
            <div class="order-page__item-price">
              {{ lineTotal(item) }} ₽
            </div>
          </div>
        </li>
      </ul>

      <div class="order-page__total">
        <span>Итого</span>
        <span>{{ totalPrice }} ₽</span>
      </div>

      <div
        v-if="isPaid"
        class="order-page__paid"
      >
        ✓ Заказ оплачен
      </div>

      <div class="order-page__actions">
        <button
          v-if="!isPaid"
          type="button"
          class="order-page__btn order-page__btn--primary"
          :disabled="syncing"
          @click="pay"
        >
          {{ syncing ? 'Отправка...' : 'Оплатить заказ' }}
        </button>
        <button
          type="button"
          class="order-page__btn order-page__btn--secondary"
          @click="addMore"
        >
          Дополнить заказ
        </button>
        <button
          type="button"
          class="order-page__btn order-page__btn--ghost"
          @click="clearOrder"
        >
          Очистить
        </button>
      </div>
    </template>
  </div>
</template>

<script>
export default {
  layout(ctx) {
    return ctx.store.getters['tableSession/isActive'] ? 'qr-table' : 'default';
  },

  data() {
    return {
      syncing: false,
    };
  },

  computed: {
    cartItems() {
      return this.$store.getters['cart/cartItems'] || [];
    },
    totalPrice() {
      return this.cartItems.reduce(
        (sum, i) => sum + (i.product?.price || 0) * i.quantity,
        0,
      );
    },
    isPaid() {
      return this.$store.getters['tableSession/isPaid'];
    },
  },

  mounted() {
    this.$store.commit('tableSession/setActiveTab', 'order');
    this.$store.dispatch('tableSession/refreshSession');
  },

  methods: {
    lineTotal(item) {
      return Math.round((item.product?.price || 0) * item.quantity);
    },
    goMenu() {
      this.$store.commit('tableSession/setActiveTab', 'menu');
      this.$router.push('/');
    },
    async changeQty(item, delta) {
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        const items = this.cartItems.filter((i) => i !== item);
        await this.$store.dispatch('cart/setItems', items);
      } else {
        const items = this.cartItems.map((i) => (
          i === item ? { ...i, quantity: newQty } : i
        ));
        await this.$store.dispatch('cart/setItems', items);
      }
      if (this.$store.getters['tableSession/isActive']) {
        await this.$store.dispatch('tableSession/syncToIiko');
      }
    },
    async pay() {
      this.syncing = true;
      try {
        await this.$store.dispatch('tableSession/syncToIiko');
        await this.$store.dispatch('tableSession/payOrder');
        this.$notify({
          group: 'messages',
          type: 'success',
          text: 'Заказ отправлен на оплату',
        });
      } catch (e) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: e.response?.data?.error || 'Ошибка оплаты',
        });
      } finally {
        this.syncing = false;
      }
    },
    async addMore() {
      if (this.isPaid) {
        await this.$store.dispatch('tableSession/reopenForMore');
      }
      this.goMenu();
    },
    async clearOrder() {
      await this.$store.dispatch('cart/setItems', []);
      if (this.$store.getters['tableSession/isActive']) {
        await this.$store.dispatch('tableSession/syncToIiko');
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.order-page {
  padding: 20px 16px 120px;
  color: #fff;

  &__title {
    margin: 0 0 20px;
    font-size: 24px;
    font-weight: 700;
  }

  &__empty {
    padding: 40px 0;
    text-align: center;
    opacity: 0.7;
  }

  &__list {
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }

  &__item {
    padding: 14px 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  &__item-name {
    font-size: 15px;
    font-weight: 500;
  }

  &__item-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 8px;
  }

  &__qty {
    display: flex;
    align-items: center;
    gap: 12px;

    button {
      width: 32px;
      height: 32px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 8px;
      background: transparent;
      color: #fff;
      font-size: 18px;
      cursor: pointer;
    }
  }

  &__item-price {
    font-weight: 600;
    color: #db9dee;
  }

  &__total {
    display: flex;
    justify-content: space-between;
    padding: 16px 0;
    font-size: 18px;
    font-weight: 700;
  }

  &__paid {
    margin-bottom: 16px;
    padding: 12px;
    border-radius: 12px;
    background: rgba(76, 175, 80, 0.2);
    color: #81c784;
    text-align: center;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__btn {
    padding: 14px;
    border: none;
    border-radius: 14px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;

    &--primary {
      background: linear-gradient(135deg, #993ca6, #db9dee);
      color: #fff;
    }

    &--secondary {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    &--ghost {
      background: transparent;
      color: rgba(255, 255, 255, 0.5);
    }

    &:disabled {
      opacity: 0.5;
    }
  }
}
</style>
