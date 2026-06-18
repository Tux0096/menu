<template>
  <div class="welcome-page">
    <div class="welcome-page__hero">
      <div
        class="welcome-page__orb welcome-page__orb--1"
      />
      <div
        class="welcome-page__orb welcome-page__orb--2"
      />
      <div class="welcome-page__content">
        <p class="welcome-page__greeting">
          Добро пожаловать!
        </p>
        <h1 class="welcome-page__title">
          Что хотите сегодня попробовать?
        </h1>
        <p class="welcome-page__subtitle">
          Опишите настроение или вкус — подберём блюда для вас
        </p>
      </div>
    </div>

    <div
      v-if="suggestions.length"
      class="welcome-page__suggestions"
    >
      <h2 class="welcome-page__suggestions-title">
        Рекомендуем
      </h2>
      <div class="welcome-page__suggestions-list">
        <button
          v-for="item in suggestions"
          :key="item.productId"
          type="button"
          class="welcome-page__suggestion-card"
          @click="addSuggestion(item)"
        >
          <div class="welcome-page__suggestion-name">
            {{ item.name }}
          </div>
          <div class="welcome-page__suggestion-reason">
            {{ item.reason }}
          </div>
          <div class="welcome-page__suggestion-price">
            {{ item.price }} ₽
          </div>
        </button>
      </div>
    </div>

    <div class="welcome-page__input-wrap">
      <form
        class="welcome-page__form"
        @submit.prevent="onSubmit"
      >
        <input
          v-model="query"
          type="text"
          class="welcome-page__input"
          placeholder="Например: что-то лёгкое с лососем..."
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
export default {
  layout: 'qr-table',

  data() {
    return {
      query: '',
    };
  },

  computed: {
    suggestions() {
      return this.$store.state.tableSession.aiSuggestions;
    },
    loading() {
      return this.$store.state.tableSession.aiLoading;
    },
  },

  mounted() {
    this.$store.commit('tableSession/setActiveTab', 'welcome');
    this.$store.commit('tableSession/setWelcomeShown', true);
  },

  methods: {
    async onSubmit() {
      await this.$store.dispatch('tableSession/fetchAiSuggestions', this.query);
    },
    async addSuggestion(item) {
      const product = this.$store.getters['catalog/productById'](item.productId);
      if (!product) return;
      await this.$store.dispatch('cart/addItem', { productId: product.id, quantity: 1 });
      this.$notify({
        group: 'messages',
        type: 'success',
        text: `${item.name} добавлено в заказ`,
      });
    },
  },
};
</script>

<style lang="scss" scoped>
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-12px) scale(1.05); }
}

@keyframes fadeUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}

.welcome-page {
  min-height: calc(100vh - 120px);
  padding: 24px 16px 120px;

  &__hero {
    position: relative;
    overflow: hidden;
    margin-bottom: 24px;
    padding: 32px 20px;
    border-radius: 24px;
    background: linear-gradient(145deg, #993ca6 0%, #6f81b4 50%, #2d1b3d 100%);
    animation: fadeUp 0.8s ease;
  }

  &__orb {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    animation: float 4s ease-in-out infinite;

    &--1 {
      top: -20px;
      right: -20px;
      width: 120px;
      height: 120px;
    }

    &--2 {
      bottom: -30px;
      left: -10px;
      width: 80px;
      height: 80px;
      animation-delay: 1.5s;
    }
  }

  &__content {
    position: relative;
    z-index: 1;
  }

  &__greeting {
    margin: 0 0 8px;
    font-size: 14px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    opacity: 0.9;
  }

  &__title {
    margin: 0 0 12px;
    font-size: 26px;
    font-weight: 700;
    line-height: 1.2;
  }

  &__subtitle {
    margin: 0;
    font-size: 15px;
    line-height: 1.45;
    opacity: 0.9;
  }

  &__suggestions {
    margin-bottom: 20px;
    animation: fadeUp 0.6s ease 0.2s both;
  }

  &__suggestions-title {
    margin: 0 0 12px;
    font-size: 16px;
    font-weight: 600;
  }

  &__suggestions-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__suggestion-card {
    padding: 14px 16px;
    border: 1px solid rgba(219, 157, 238, 0.25);
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
    text-align: left;
    cursor: pointer;
    transition: background 0.2s;

    &:active {
      background: rgba(153, 60, 166, 0.25);
    }
  }

  &__suggestion-name {
    font-size: 15px;
    font-weight: 600;
  }

  &__suggestion-reason {
    margin-top: 4px;
    font-size: 13px;
    opacity: 0.75;
  }

  &__suggestion-price {
    margin-top: 8px;
    font-size: 14px;
    font-weight: 600;
    color: #db9dee;
  }

  &__input-wrap {
    position: fixed;
    right: 16px;
    bottom: calc(88px + env(safe-area-inset-bottom));
    left: 16px;
    z-index: 10;
  }

  &__form {
    display: flex;
    gap: 8px;
    padding: 8px;
    border-radius: 16px;
    background: rgba(26, 31, 36, 0.95);
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4);
  }

  &__input {
    flex: 1;
    padding: 12px 14px;
    border: none;
    border-radius: 12px;
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
    font-size: 15px;

    &::placeholder {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  &__submit {
    padding: 12px 18px;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #993ca6, #db9dee);
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
</style>
