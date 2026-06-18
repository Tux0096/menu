<template>
  <div
    v-if="visible"
    class="payment-modal"
    @click.self="$emit('close')"
  >
    <div class="payment-modal__box">
      <h2 class="payment-modal__title">
        Оплата счёта
      </h2>
      <p class="payment-modal__sum">
        {{ total }} ₽
      </p>

      <div class="payment-modal__methods">
        <button
          v-for="m in methods"
          :key="m.id"
          type="button"
          class="payment-modal__method"
          :class="{ 'payment-modal__method--active': method === m.id }"
          @click="method = m.id"
        >
          {{ m.label }}
        </button>
      </div>

      <label class="payment-modal__tip">
        <span>Чаевые официанту</span>
        <div class="payment-modal__tip-row">
          <button
            v-for="p in tipPresets"
            :key="p"
            type="button"
            :class="{ active: tipPercent === p }"
            @click="setTipPercent(p)"
          >
            {{ p }}%
          </button>
          <input
            v-model.number="tipCustom"
            type="number"
            min="0"
            placeholder="₽"
            @focus="tipPercent = null"
          >
        </div>
      </label>

      <button
        type="button"
        class="payment-modal__pay"
        :disabled="paying"
        @click="pay"
      >
        {{ paying ? 'Оплата...' : 'Оплатить' }}
      </button>
      <button
        type="button"
        class="payment-modal__cancel"
        @click="$emit('close')"
      >
        Отмена
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    visible: { type: Boolean, default: false },
    total: { type: Number, default: 0 },
  },

  data() {
    return {
      method: 'apple_pay',
      tipPercent: 10,
      tipCustom: null,
      paying: false,
      methods: [
        { id: 'apple_pay', label: ' Apple Pay' },
        { id: 'google_pay', label: 'Google Pay' },
        { id: 'sbp', label: 'СБП' },
        { id: 'card', label: 'Карта' },
      ],
      tipPresets: [0, 10, 15, 20],
    };
  },

  methods: {
    setTipPercent(p) {
      this.tipPercent = p;
      this.tipCustom = null;
    },
    tipAmount() {
      if (this.tipCustom != null && this.tipCustom !== '') return Number(this.tipCustom) || 0;
      if (this.tipPercent) return Math.round(this.total * this.tipPercent / 100);
      return 0;
    },
    async pay() {
      this.paying = true;
      try {
        await this.$store.dispatch('tableSession/guestPay', {
          method: this.method,
          tipAmount: this.tipAmount(),
        });
        this.$notify({ group: 'messages', type: 'success', text: 'Оплата прошла успешно' });
        this.$emit('paid');
      } catch (e) {
        this.$notify({
          group: 'messages', type: 'error',
          text: e.response?.data?.error || 'Ошибка оплаты',
        });
      } finally {
        this.paying = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.payment-modal {
  position: fixed;
  z-index: 300;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);

  &__box {
    width: 100%;
    max-width: 480px;
    padding: 24px 20px 32px;
    border-radius: 24px 24px 0 0;
    background: #fff;
    color: var(---Main-Black, #292929);
  }

  &__title { margin: 0 0 8px; font-size: 20px; }
  &__sum { margin: 0 0 20px; font-size: 32px; font-weight: 800; color: var(---Main-Purple, #993ca6); }

  &__methods {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 20px;
  }

  &__method {
    padding: 12px;
    border: 1px solid var(---Primary-Gray, #969696);
    border-radius: 12px;
    background: #fff;
    color: var(---Main-Black, #292929);
    font-size: 14px;
    cursor: pointer;

    &--active {
      border-color: var(---Main-Purple, #993ca6);
      background: var(---Primary-LightPurple, #f5ecf6);
    }
  }

  &__tip {
    display: block;
    margin-bottom: 20px;
    font-size: 14px;

    span { display: block; margin-bottom: 8px; opacity: 0.7; }
  }

  &__tip-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;

    button, input {
      padding: 8px 12px;
      border: 1px solid var(---Primary-Gray, #969696);
      border-radius: 8px;
      background: #fff;
      color: var(---Main-Black, #292929);
      font-size: 13px;
    }

    button.active { border-color: var(---Main-Purple, #993ca6); background: var(---Primary-LightPurple, #f5ecf6); }
    input { width: 72px; }
  }

  &__pay {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 14px;
    background: var(---Main-Purple, #993ca6);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
  }

  &__cancel {
    width: 100%;
    margin-top: 10px;
    padding: 12px;
    border: none;
    background: transparent;
    color: rgba(41, 41, 41, 0.5);
    cursor: pointer;
  }
}
</style>
