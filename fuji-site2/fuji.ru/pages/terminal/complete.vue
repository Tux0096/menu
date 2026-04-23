<template>
  <div class="terminal-complete-page">
    <div class="terminal-complete-page__inner">
      <div class="terminal-complete-page__icon-wrapper">
        <lord-icon
          :src="`/assets/libs/icon-json/tick.json`"
          class="terminal-complete-page__icon"
          trigger="loop"
        />
      </div>

      <h1 class="terminal-complete-page__title">
        Заказ принят!
      </h1>

      <p class="terminal-complete-page__subtitle">
        Ваш заказ передан на кухню. <br>
        Ожидайте, пожалуйста.
      </p>

      <div
        v-if="orderId"
        class="terminal-complete-page__order-id"
      >
        № заказа: <strong>{{ orderId }}</strong>
      </div>

      <div class="terminal-complete-page__countdown">
        <p class="terminal-complete-page__countdown-text">
          Возврат к меню через {{ countdown }} сек.
        </p>
      </div>

      <button
        class="terminal-complete-page__btn"
        @click="goToMenu"
      >
        Вернуться к меню
      </button>
    </div>
  </div>
</template>

<script>
export default {
  name: 'TerminalComplete',

  layout: 'terminal',

  data() {
    return {
      countdown: 15,
      countdownInterval: null,
    };
  },

  computed: {
    orderId() {
      return this.$route.query.orderId || '';
    },

    menuPath() {
      const citySlug = this.$store.getters['city/city']?.slug;
      return citySlug ? `/${citySlug}/terminal` : '/terminal';
    },
  },

  mounted() {
    this.countdownInterval = setInterval(() => {
      this.countdown -= 1;
      if (this.countdown <= 0) {
        this.goToMenu();
      }
    }, 1000);
  },

  beforeDestroy() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
  },

  methods: {
    goToMenu() {
      clearInterval(this.countdownInterval);
      this.$router.push(this.menuPath);
    },
  },
};
</script>

<style lang="scss" scoped>
.terminal-complete-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);

  &__inner {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    padding: 40px 24px;
    text-align: center;
    gap: 16px;
  }

  &__icon-wrapper {
    width: 120px;
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  }

  &__icon {
    width: 80px;
    height: 80px;
  }

  &__title {
    font-size: 48px;
    font-weight: 800;
    color: #27ae60;
  }

  &__subtitle {
    font-size: 22px;
    font-weight: 400;
    line-height: 1.5;
    color: #292929;
  }

  &__order-id {
    padding: 16px 32px;
    font-size: 20px;
    border-radius: 16px;
    background: #f5f5f5;
    color: #292929;

    strong {
      color: #993ca6;
      font-size: 28px;
    }
  }

  &__countdown {
    margin-top: 8px;
  }

  &__countdown-text {
    font-size: 16px;
    color: #969696;
  }

  &__btn {
    height: 56px;
    padding: 0 48px;
    font-size: 20px;
    font-weight: 700;
    cursor: pointer;
    color: #fff;
    border-radius: 100px;
    background: #993ca6;
    margin-top: 8px;
  }
}
</style>
