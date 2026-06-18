<template>
  <div class="order-page page-content">
    <h1 class="order-page__title">
      Ваш заказ
    </h1>

    <div
      v-if="workflowLabel"
      class="order-page__workflow"
    >
      {{ workflowLabel }}
    </div>

    <button
      type="button"
      class="order-page__waiter"
      @click="onCallWaiter"
    >
      🔔 Позвать официанта
    </button>

    <button
      v-if="canGuestPay && !isPaid"
      type="button"
      class="order-page__pay"
      @click="openPay"
    >
      💳 Оплатить счёт — {{ totalPrice }} ₽
    </button>

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
      <div
        v-if="isInProduction"
        class="order-page__status order-page__status--open"
      >
        Заказ на кухне. Можно добавить позиции — официант подтвердит дозаказ.
      </div>
      <div
        v-else-if="isAwaitingWaiter"
        class="order-page__status order-page__status--wait"
      >
        Корзина передана официанту — ожидайте подхода для сверки заказа.
      </div>
      <div
        v-else-if="isPaid"
        class="order-page__status order-page__status--closed"
      >
        Счёт оплачен. Спасибо за визит!
      </div>

      <ul class="order-page__list">
        <li
          v-for="(item, idx) in cartItems"
          :key="idx"
          class="order-page__item"
          :class="{ 'order-page__item--locked': item.isLocked }"
        >
          <div class="order-page__item-name">
            {{ item.product.name }}
            <span
              v-if="item.isLocked"
              class="order-page__locked"
            >на кухне</span>
          </div>
          <div class="order-page__item-row">
            <div class="order-page__qty">
              <button
                type="button"
                :disabled="!canDecrease(item)"
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

      <div class="order-page__actions">
        <button
          v-if="!isPaid"
          type="button"
          class="order-page__btn order-page__btn--primary"
          :disabled="orderSubmitting"
          @click="submitToWaiter"
        >
          {{ submitLabel }}
        </button>
        <button
          type="button"
          class="order-page__btn order-page__btn--secondary"
          @click="addMore"
        >
          Дополнить из меню
        </button>
        <button
          v-if="canClear"
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

  computed: {
    cartItems() {
      return this.$store.getters['cart/cartItems'] || [];
    },
    totalPrice() {
      return Math.round(
        this.cartItems.reduce(
          (sum, i) => sum + (i.product?.price || 0) * i.quantity,
          0,
        ),
      );
    },
    isPaid() {
      return this.$store.getters['tableSession/isPaid'];
    },
    isInProduction() {
      return this.$store.getters['tableSession/isInProduction'];
    },
    isAwaitingWaiter() {
      return this.$store.getters['tableSession/isAwaitingWaiter'];
    },
    canGuestPay() {
      return this.$store.getters['tableSession/canGuestPay'];
    },
    canGuestRemoveItems() {
      return this.$store.getters['tableSession/canGuestRemoveItems'];
    },
    workflowLabel() {
      return this.$store.getters['tableSession/workflowLabel'];
    },
    orderSubmitting() {
      return this.$store.state.tableSession.orderSubmitting;
    },
    canClear() {
      if (this.isPaid) return false;
      if (this.canGuestRemoveItems) return this.cartItems.length > 0;
      return this.cartItems.some((i) => !i.isLocked);
    },
    submitLabel() {
      if (this.orderSubmitting) return 'Отправка...';
      if (this.isAwaitingWaiter) return 'Обновить для официанта';
      if (this.isInProduction) return 'Передать дозаказ';
      return 'Передать официанту';
    },
  },

  mounted() {
    this.$store.commit('tableSession/setActiveTab', 'order');
    this.$store.dispatch('tableSession/refreshSession');
    this.$store.dispatch('tableSession/trackActivity');
  },

  methods: {
    lineTotal(item) {
      return Math.round((item.product?.price || 0) * item.quantity);
    },
    goMenu() {
      this.$store.commit('tableSession/setActiveTab', 'menu');
      this.$router.push('/');
    },
    canDecrease(item) {
      if (this.canGuestRemoveItems) return true;
      return !item.isLocked;
    },
    async changeQty(item, delta) {
      if (delta < 0 && item.isLocked && !this.canGuestRemoveItems) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Нельзя убрать позицию из принятого заказа. Позовите официанта.',
        });
        return;
      }
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
      await this.$store.dispatch('tableSession/trackActivity');
    },
    async submitToWaiter() {
      try {
        await this.$store.dispatch('tableSession/submitToWaiter');
        this.$notify({
          group: 'messages',
          type: 'success',
          text: 'Корзина передана официанту',
        });
      } catch (e) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: e.response?.data?.error || 'Не удалось передать заказ',
        });
      }
    },
    addMore() {
      this.goMenu();
    },
    async clearOrder() {
      if (!this.canGuestRemoveItems) {
        const items = this.cartItems.filter((i) => i.isLocked);
        await this.$store.dispatch('cart/setItems', items);
      } else {
        await this.$store.dispatch('cart/setItems', []);
      }
    },
    onCallWaiter() {
      this.$nuxt.$emit('qr-call-waiter');
    },
    openPay() {
      this.$store.commit('tableSession/setShowPaymentModal', true);
    },
  },
};
</script>

<style lang="scss" scoped>
.order-page {
  padding: extClamp(16) extClamp(16) 120px;
  color: var(---Main-Black, #292929);

  &__title {
    margin: 0 0 12px;
    font-size: extClamp(20);
    font-weight: 700;
    color: var(---Main-Purple, #993ca6);
  }

  &__workflow {
    margin-bottom: 12px;
    padding: 8px 12px;
    border-radius: extClamp(8);
    background: var(---Primary-LightPurple, #f5ecf6);
    color: var(---Main-Purple, #993ca6);
    font-size: extClamp(11);
  }

  &__waiter, &__pay {
    display: block;
    width: 100%;
    margin-bottom: 12px;
    padding: extClamp(12) extClamp(16);
    border: 1px solid var(---Primary-Gray, #969696);
    border-radius: extClamp(12);
    background: #fff;
    color: var(---Main-Black, #292929);
    font-size: extClamp(12);
    font-weight: 600;
    cursor: pointer;
  }

  &__pay {
    border-color: var(---Main-Purple, #993ca6);
    background: var(---Primary-LightPurple, #f5ecf6);
    color: var(---Main-Purple, #993ca6);
  }

  &__empty {
    padding: 40px 0;
    text-align: center;
    opacity: 0.65;
  }

  &__status {
    margin-bottom: 16px;
    padding: extClamp(12);
    border-radius: extClamp(10);
    font-size: extClamp(11);
    line-height: 1.4;

    &--open {
      background: var(---Primary-LightPurple, #f5ecf6);
      color: var(---Main-Purple, #993ca6);
    }

    &--wait {
      background: #fff;
      border: 1px solid var(---Primary-Gray, #969696);
      color: var(---Main-Black, #292929);
    }

    &--closed {
      background: var(---Primary-LightGray, #f5f5f5);
      color: var(---Main-Black, #292929);
    }
  }

  &__list {
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
  }

  &__item {
    padding: extClamp(14) 0;
    border-bottom: 1px solid var(---Primary-LightGray, #f0f0f0);

    &--locked { opacity: 0.85; }
  }

  &__item-name {
    font-size: extClamp(13);
    font-weight: 500;
  }

  &__locked {
    margin-left: 8px;
    padding: 2px 6px;
    border-radius: 6px;
    background: var(---Primary-LightPurple, #f5ecf6);
    color: var(---Main-Purple, #993ca6);
    font-size: 10px;
    font-weight: 600;
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
      border: 1px solid var(---Primary-Gray, #969696);
      border-radius: 8px;
      background: #fff;
      color: var(---Main-Black, #292929);
      font-size: 18px;
      cursor: pointer;

      &:disabled { opacity: 0.35; cursor: not-allowed; }
    }
  }

  &__item-price {
    font-weight: 600;
    color: var(---Main-Purple, #993ca6);
  }

  &__total {
    display: flex;
    justify-content: space-between;
    padding: 16px 0;
    font-size: extClamp(16);
    font-weight: 700;
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__btn {
    padding: extClamp(14);
    border: none;
    border-radius: extClamp(12);
    font-size: extClamp(13);
    font-weight: 600;
    cursor: pointer;

    &--primary {
      background: var(---Main-Purple, #993ca6);
      color: #fff;
    }

    &--secondary {
      background: var(---Primary-LightPurple, #f5ecf6);
      color: var(---Main-Purple, #993ca6);
    }

    &--ghost {
      background: transparent;
      color: rgba(41, 41, 41, 0.5);
    }

    &:disabled {
      opacity: 0.5;
    }
  }
}
</style>
