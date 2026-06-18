<template>
  <div
    class="welcome-page page-content"
    :class="{ 'welcome-page--has-cart': cartCount > 0 && !isPaid }"
  >
    <div class="welcome-page__hero">
      <h1 class="welcome-page__brand">
        Фуджи <span class="welcome-page__brand-ai">AI</span>
      </h1>
      <p class="welcome-page__hint">
        Я помогу вам выбрать блюда под ваше настроение — что сегодня вы хотите попробовать?
      </p>
    </div>

    <div
      v-if="workflowLabel"
      class="welcome-page__workflow"
    >
      {{ workflowLabel }}
    </div>

    <button
      v-if="canGuestPay && !isPaid"
      type="button"
      class="welcome-page__pay"
      @click="openPay"
    >
      💳 Оплатить счёт
    </button>

    <div class="welcome-page__prompts">
      <button
        v-for="chip in quickPrompts"
        :key="chip"
        type="button"
        class="welcome-page__prompt"
        :disabled="loading"
        @click="runPrompt(chip)"
      >
        {{ chip }}
      </button>
    </div>

    <AiThinkingLoader v-if="loading" />

    <transition name="welcome-fade">
      <div
        v-if="!loading && suggestions.length"
        class="welcome-page__suggestions"
      >
        <h2 class="welcome-page__suggestions-title">
          Советую вам попробовать — вам точно понравится
        </h2>
      <div class="welcome-page__suggestions-list">
        <article
          v-for="item in suggestions"
          :key="item.productId"
          class="welcome-page__product"
        >
          <div class="welcome-page__product-image-wrap">
            <nuxt-img
              v-if="item.image"
              :src="item.image"
              :alt="item.name"
              class="welcome-page__product-image"
              format="webp"
              width="88"
              height="88"
            />
            <div
              v-else
              class="welcome-page__product-image welcome-page__product-image--empty"
            />
          </div>
          <div class="welcome-page__product-body">
            <div class="welcome-page__product-name">
              {{ item.name }}
            </div>
            <div class="welcome-page__product-reason">
              {{ item.reason }}
            </div>
            <div class="welcome-page__product-price">
              {{ item.price }} ₽
            </div>
          </div>
          <div class="welcome-page__product-actions">
            <button
              v-if="!qtyById(item.productId)"
              type="button"
              class="welcome-page__add-btn"
              @click="addSuggestion(item)"
            >
              +
            </button>
            <div
              v-else
              class="welcome-page__qty"
            >
              <button
                type="button"
                :disabled="!canDecrease(item.productId)"
                @click="changeSuggestionQty(item, -1)"
              >
                −
              </button>
              <span>{{ qtyById(item.productId) }}</span>
              <button
                type="button"
                @click="changeSuggestionQty(item, 1)"
              >
                +
              </button>
            </div>
          </div>
        </article>
      </div>
      </div>
    </transition>

    <div
      v-if="cartCount > 0 && !isPaid"
      class="welcome-page__order-bar"
    >
      <div class="welcome-page__order-summary">
        <span>{{ cartCount }} {{ cartCountLabel }}</span>
        <strong>{{ totalPrice }} ₽</strong>
      </div>
      <button
        type="button"
        class="welcome-page__order-btn"
        :disabled="orderSubmitting"
        @click="submitToWaiter"
      >
        {{ orderSubmitLabel }}
      </button>
    </div>

    <div
      v-if="isInProduction"
      class="welcome-page__status"
    >
      Заказ на кухне. Можно дополнять из меню — официант подтвердит дозаказ.
    </div>

    <div
      v-if="isAwaitingWaiter"
      class="welcome-page__status welcome-page__status--wait"
    >
      Корзина передана официанту — скоро подойдёт для уточнения заказа.
    </div>

    <div
      v-if="isPaid"
      class="welcome-page__status welcome-page__status--paid"
    >
      Счёт оплачен. Спасибо за визит!
    </div>

    <div
      class="welcome-page__input-wrap"
    >
      <form
        class="welcome-page__form"
        @submit.prevent="onSubmit"
      >
        <input
          v-model="query"
          type="text"
          class="welcome-page__input"
          placeholder="Например: хочу что-то вкусное..."
          autocomplete="off"
        >
        <button
          type="submit"
          class="welcome-page__submit"
          :disabled="loading || !query.trim()"
        >
          {{ loading ? '...' : 'Подобрать' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import AiThinkingLoader from '~/components/AiThinkingLoader.vue';

export default {
  components: { AiThinkingLoader },

  layout: 'qr-table',

  data() {
    return {
      query: '',
      quickPrompts: [
        'Хочу что-то вкусное',
        'Лёгкое блюдо',
        'Острое',
        'На компанию',
      ],
    };
  },

  computed: {
    suggestions() {
      return this.$store.state.tableSession.aiSuggestions;
    },
    loading() {
      return this.$store.state.tableSession.aiLoading;
    },
    cartCount() {
      return this.$store.getters['cart/cartItems']?.length || 0;
    },
    totalPrice() {
      return Math.round(
        (this.$store.getters['cart/cartItems'] || []).reduce(
          (sum, i) => sum + (i.product?.price || 0) * i.quantity,
          0,
        ),
      );
    },
    orderSubmitting() {
      return this.$store.state.tableSession.orderSubmitting;
    },
    isInProduction() {
      return this.$store.getters['tableSession/isInProduction'];
    },
    isAwaitingWaiter() {
      return this.$store.getters['tableSession/isAwaitingWaiter'];
    },
    isPaid() {
      return this.$store.getters['tableSession/isPaid'];
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
    cartCountLabel() {
      const n = this.cartCount;
      if (n % 10 === 1 && n % 100 !== 11) return 'позиция';
      if (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) return 'позиции';
      return 'позиций';
    },
    orderSubmitLabel() {
      if (this.orderSubmitting) return 'Отправка...';
      if (this.isAwaitingWaiter) return 'Обновить для официанта';
      if (this.isInProduction) return 'Передать дозаказ';
      return 'Передать официанту';
    },
  },

  mounted() {
    this.$store.commit('tableSession/setActiveTab', 'welcome');
    this.$store.commit('tableSession/setWelcomeShown', true);
    this.$store.dispatch('tableSession/trackActivity');
    this.$store.dispatch('tableSession/fetchWelcomeSuggestions');
  },

  methods: {
    async runPrompt(text) {
      this.query = text;
      await this.$store.dispatch('tableSession/fetchAiSuggestions', text);
      await this.$store.dispatch('tableSession/trackActivity');
    },
    qtyById(productId) {
      const item = (this.$store.getters['cart/cartItems'] || []).find(
        (i) => i.product?.id === productId,
      );
      return item?.quantity || 0;
    },

    canDecrease(productId) {
      if (this.canGuestRemoveItems) return true;
      const item = (this.$store.getters['cart/cartItems'] || []).find(
        (i) => i.product?.id === productId,
      );
      return !item?.isLocked;
    },

    async onSubmit() {
      await this.$store.dispatch('tableSession/fetchAiSuggestions', this.query);
      await this.$store.dispatch('tableSession/trackActivity');
    },

    async findProduct(item) {
      let product = this.$store.getters['catalog/productById'](item.productId);
      if (!product && item.iikoId) {
        product = this.$store.getters['catalog/products']?.find(
          (p) => p.id === item.iikoId || p.iikoId === item.iikoId,
        );
      }
      if (!product) {
        product = {
          id: item.productId,
          iikoId: item.iikoId || item.productId,
          name: item.name,
          price: item.price,
          image: item.image,
        };
      }
      return product;
    },

    async addSuggestion(item) {
      const product = await this.findProduct(item);
      await this.$store.dispatch('cart/addItem', { productId: product.id, quantity: 1 });
      await this.$store.dispatch('tableSession/logAiFeedback', { productId: product.id });
      await this.$store.dispatch('tableSession/trackActivity');
      this.$notify({
        group: 'messages',
        type: 'success',
        text: `${item.name} добавлено в заказ`,
      });
    },

    async changeSuggestionQty(item, delta) {
      const product = await this.findProduct(item);
      const cartItems = this.$store.getters['cart/cartItems'] || [];
      const existing = cartItems.find((i) => i.product?.id === product.id);
      const newQty = (existing?.quantity || 0) + delta;
      if (delta < 0 && existing?.isLocked && !this.canGuestRemoveItems) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Нельзя убрать позицию из принятого заказа. Позовите официанта.',
        });
        return;
      }
      if (newQty <= 0) {
        await this.$store.dispatch(
          'cart/setItems',
          cartItems.filter((i) => i.product?.id !== product.id),
        );
      } else if (existing) {
        await this.$store.dispatch(
          'cart/setItems',
          cartItems.map((i) => (
            i.product?.id === product.id ? { ...i, quantity: newQty } : i
          )),
        );
      } else if (delta > 0) {
        await this.addSuggestion(item);
        return;
      }
      if (delta > 0) {
        await this.$store.dispatch('tableSession/logAiFeedback', { productId: product.id });
      }
      await this.$store.dispatch('tableSession/trackActivity');
    },

    async submitToWaiter() {
      try {
        await this.$store.dispatch('tableSession/submitToWaiter');
        this.$notify({
          group: 'messages',
          type: 'success',
          text: 'Корзина передана официанту — скоро подойдёт',
        });
      } catch (e) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: e.response?.data?.error || 'Не удалось передать заказ',
        });
      }
    },

    openPay() {
      this.$store.commit('tableSession/setShowPaymentModal', true);
    },
  },
};
</script>

<style lang="scss" scoped>
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.welcome-page {
  --qr-nav-h: calc(64px + env(safe-area-inset-bottom, 0px));
  --qr-input-h: 76px;
  --qr-cart-h: 68px;
  min-height: calc(100vh - 140px);
  max-width: 100%;
  padding: 12px 12px calc(var(--qr-nav-h) + var(--qr-input-h) + 20px);
  color: var(---Main-Black, #292929);
  overflow-x: hidden;

  &--has-cart {
    padding-bottom: calc(var(--qr-nav-h) + var(--qr-input-h) + var(--qr-cart-h) + 20px);
  }

  @media screen and (min-width: 768px) {
    padding: 16px 16px calc(var(--qr-nav-h) + var(--qr-input-h) + 24px);
  }

  &__hero {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 20px;
    padding: 8px 8px 0;
    animation: fadeUp 0.8s ease;
  }

  &__brand {
    margin: 0 0 12px;
    font-size: extClamp(28);
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    text-align: center;
    color: var(---Main-Black, #292929);
  }

  &__brand-ai {
    background: linear-gradient(135deg, #993ca6 0%, #db9dee 50%, #6f81b4 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  &__hint {
    margin: 0;
    max-width: 320px;
    font-size: extClamp(12);
    line-height: 1.5;
    text-align: center;
    color: rgba(41, 41, 41, 0.72);
  }

  &__workflow {
    margin-bottom: 12px;
    padding: 8px 12px;
    border-radius: extClamp(8);
    background: var(---Primary-LightPurple, #f5ecf6);
    color: var(---Main-Purple, #993ca6);
    font-size: extClamp(11);
    font-weight: 500;
    text-align: center;
  }

  &__pay {
    display: block;
    width: 100%;
    margin-bottom: 10px;
    padding: 12px 16px;
    border: 1px solid var(---Main-Purple, #993ca6);
    border-radius: 12px;
    background: var(---Primary-LightPurple, #f5ecf6);
    color: var(---Main-Purple, #993ca6);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
  }

  &__prompts {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: center;
    margin-bottom: 16px;
  }

  &__prompt {
    padding: 8px 12px;
    border: 1px solid var(---Primary-Gray, #969696);
    border-radius: 999px;
    background: #fff;
    color: var(---Main-Black, #292929);
    font-size: 12px;
    line-height: 1.2;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
    }
  }

  &__suggestions {
    margin-bottom: 16px;
    animation: fadeUp 0.6s ease 0.2s both;
  }

  &__suggestions-title {
    margin: 0 0 12px;
    font-size: extClamp(14);
    font-weight: 600;
    color: var(---Main-Purple, #993ca6);
  }

  &__suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__product {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(---Primary-Gray, #969696);
    border-radius: 12px;
    background: #fff;
  }

  &__product-image-wrap {
    flex-shrink: 0;
    width: 64px;
    height: 64px;
    overflow: hidden;
    border-radius: extClamp(8);
    background: var(---Primary-LightGray, #f5f5f5);
  }

  &__product-image {
    width: 100%;
    height: 100%;
    object-fit: cover;

    &--empty {
      background: var(---Primary-LightGray, #f5f5f5);
    }
  }

  &__product-body {
    flex: 1;
    min-width: 0;
  }

  &__product-name {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 1.25;
  }

  &__product-reason {
    margin-top: 4px;
    font-size: extClamp(10);
    line-height: 1.35;
    opacity: 0.65;
  }

  &__product-price {
    margin-top: 6px;
    font-size: extClamp(12);
    font-weight: 700;
    color: var(---Main-Purple, #993ca6);
  }

  &__product-actions {
    flex-shrink: 0;
  }

  &__add-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: extClamp(10);
    background: var(---Main-Purple, #993ca6);
    color: #fff;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
  }

  &__qty {
    display: flex;
    align-items: center;
    gap: 8px;

    button {
      width: 32px;
      height: 32px;
      border: 1px solid var(---Primary-Gray, #969696);
      border-radius: 8px;
      background: #fff;
      color: var(---Main-Black, #292929);
      font-size: 16px;
      cursor: pointer;

      &:disabled { opacity: 0.35; cursor: not-allowed; }
    }

    span {
      min-width: 18px;
      text-align: center;
      font-weight: 700;
    }
  }

  &__order-bar {
    position: fixed;
    right: 12px;
    bottom: calc(var(--qr-nav-h) + var(--qr-input-h) + 8px);
    left: 12px;
    z-index: 11;
    display: flex;
    align-items: center;
    gap: 10px;
    max-width: $page-content-width;
    margin: 0 auto;
    padding: 10px 12px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 4px 24px rgba(41, 41, 41, 0.12);
  }

  &__order-summary {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: extClamp(11);
    opacity: 0.85;

    strong {
      font-size: extClamp(16);
      color: var(---Main-Purple, #993ca6);
    }
  }

  &__order-btn {
    padding: extClamp(12) extClamp(16);
    border: none;
    border-radius: extClamp(10);
    background: var(---Main-Purple, #993ca6);
    color: #fff;
    font-size: extClamp(12);
    font-weight: 700;
    white-space: nowrap;
    cursor: pointer;

    &:disabled {
      opacity: 0.6;
    }
  }

  &__status {
    margin-bottom: 12px;
    padding: extClamp(12) extClamp(14);
    border-radius: extClamp(10);
    background: var(---Primary-LightPurple, #f5ecf6);
    color: var(---Main-Purple, #993ca6);
    font-size: extClamp(11);
    line-height: 1.4;

    &--wait {
      background: #fff;
      border: 1px solid var(---Primary-Gray, #969696);
      color: var(---Main-Black, #292929);
    }

    &--paid {
      background: var(---Primary-LightGray, #f5f5f5);
      color: var(---Main-Black, #292929);
    }
  }

  &__input-wrap {
    position: fixed;
    right: 12px;
    bottom: var(--qr-nav-h);
    left: 12px;
    z-index: 10;
    max-width: $page-content-width;
    margin: 0 auto;
  }

  &__form {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-radius: 12px;
    background: #fff;
    box-shadow: 0 4px 24px rgba(41, 41, 41, 0.12);
    border: 1px solid var(---Primary-Gray, #969696);

    @media screen and (max-width: 360px) {
      flex-direction: column;
    }
  }

  &__input {
    flex: 1;
    min-width: 0;
    padding: 12px 14px;
    border: none;
    border-radius: 10px;
    background: var(---Primary-LightGray, #f5f5f5);
    color: var(---Main-Black, #292929);
    font-size: 16px;

    &::placeholder {
      color: rgba(41, 41, 41, 0.4);
    }
  }

  &__submit {
    flex-shrink: 0;
    padding: 12px 16px;
    border: none;
    border-radius: 10px;
    background: var(---Main-Purple, #993ca6);
    color: #fff;
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
    cursor: pointer;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}

.welcome-fade-enter-active,
.welcome-fade-leave-active {
  transition: opacity 0.35s ease, transform 0.35s ease;
}

.welcome-fade-enter,
.welcome-fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
</style>
