<template>
  <div>
    <!-- Портал для передачи данных в хедер -->
    <portal
      v-if="shouldShow"
      to="order-status"
    >
      <div class="header-order-delivery">
        <div class="header-order-delivery__icon" />
        Заказ №{{ activeOrder.delivery.number }} {{ statusText }}
      </div>
    </portal>

    <div
      v-show="shouldShow"
      class="status-card"
    >
      <!-- Основной контент -->
      <template v-if="activeOrder">
        <div class="status-card__track">
          <!-- Этап 1: Принят -->
          <div :class="['status-card__step', { 'status-card__step--done': currentStep >= 1 }]">
            <svg class="status-card__icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#status-stepper-check" />
            </svg>
          </div>

          <!-- Этап 2: На кухне -->
          <div
            :class="['status-card__step', {
              'status-card__step--done': currentStep >= 3,
              'status-card__step--active': currentStep === 2
            }]"
          >
            <svg class="status-card__icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#status-stepper-chef" />
            </svg>
          </div>

          <!-- Этап 3: В пути -->
          <div
            :class="['status-card__step', {
              'status-card__step--done': currentStep >= 4,
              'status-card__step--active': currentStep === 3
            }]"
          >
            <svg class="status-card__icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#status-stepper-scooter" />
            </svg>
          </div>

          <!-- Этап 4: Доставлен -->
          <div
            :class="['status-card__step', {
              'status-card__step--done': currentStep >= 4,
              'status-card__step--active': currentStep === 4
            }]"
          >
            <svg class="status-card__icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#status-stepper-home" />
            </svg>
          </div>
        </div>

        <!-- Информация о заказе -->
        <div class="status-card__info">
          Заказ №{{ activeOrder.id }} {{ statusText }}
        </div>

        <!-- Кнопка телефона -->
        <div
          class="status-card__phone"
          @click="handlePhoneClick"
        >
          <svg class="status-card__phone-icon">
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#phone-2" />
          </svg>
        </div>
      </template>

      <!-- Состояние ошибки -->
      <div
        v-else-if="error"
        class="status-card__error"
      >
        <span>{{ error }}</span>
        <button
          class="retry-btn"
          @click="loadActiveOrder"
        >
          Повторить
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'StatusStepper',

  props: {
    checkInterval: {
      type: Number,
      default: 60,
    },
  },

  data() {
    return {
      error: null,
      checkTimer: null,
    };
  },

  computed: {
    activeOrder() {
      return this.$store.getters['order/activeOrder'];
    },

    isLoading() {
      return this.$store.getters['order/isLoadingActiveOrder'];
    },

    shouldShow() {
      return this.activeOrder && !this.isOrderCompleted && this.currentStep;
    },

    isOrderCompleted() {
      return this.$store.getters['order/isOrderCompleted'];
    },

    currentStatus() {
      return this.$store.getters['order/currentDeliveryStatus'] || 'Unconfirmed';
    },

    currentStep() {
      const statusSteps = {
        Unconfirmed: null,
        WaitCooking: null,
        ReadyForCooking: null,
        CookingStarted: 1,
        CookingCompleted: 2,
        Waiting: 2,
        OnWay: 3,
        OnWayCourier: 3,
        CourierNearby: 3,
        Delivered: 4,
        Closed: null,
        Cancelled: null,
      };

      return statusSteps[this.currentStatus];
    },

    statusText() {
      const statusTexts = {
        Unconfirmed: null,
        WaitCooking: 'Принят',
        ReadyForCooking: 'Готовим',
        CookingStarted: 'Готовим',
        CookingCompleted: 'Готовим',
        Waiting: 'Готовим',
        OnWay: 'Приготовлен',
        OnWayCourier: 'В пути',
        CourierNearby: 'В пути',
        Delivered: 'Доставлен',
        Closed: null,
        Cancelled: null,
      };
      return statusTexts[this.currentStatus] || 'принят';
    },

    courierPhone() {
      const courierInfo = this.$store.getters['order/courierInfo'];
      return courierInfo?.phone;
    },

    isUserAuth() {
      return this.$store.getters['user/isAuth'];
    },
  },
  watch: {
    isUserAuth(newVal) {
      if (newVal) {
        this.loadActiveOrder();
        this.startPeriodicCheck();
        this.subscribeToWebSocket();
      } else {
        this.stopPeriodicCheck();
        this.unsubscribeFromWebSocket();
      }
    },
  },

  async mounted() {
    if (this.isUserAuth) {
      await this.$store.dispatch('order/loadActiveOrder');
      this.startPeriodicCheck();
      this.subscribeToWebSocket();
    }
  },

  beforeDestroy() {
    this.stopPeriodicCheck();
    this.unsubscribeFromWebSocket();
  },
  methods: {
    async loadActiveOrder() {
      this.error = null;
      try {
        await this.$store.dispatch('order/loadActiveOrder');

        if (this.isOrderCompleted) {
          this.stopPeriodicCheck();
        }
      } catch (error) {
        console.error('Ошибка загрузки активного заказа:', error);
        this.error = 'Не удалось загрузить информацию о заказе';
      }
    },

    startPeriodicCheck() {
      if (this.checkTimer) return;

      this.checkTimer = setInterval(() => {
        if (!this.isOrderCompleted) {
          this.loadActiveOrder();
        }
      }, this.checkInterval * 1000);
    },

    stopPeriodicCheck() {
      if (this.checkTimer) {
        clearInterval(this.checkTimer);
        this.checkTimer = null;
      }
    },

    subscribeToWebSocket() {
      if (!this.$socket || !this.isUserAuth) return;

      const userId = this.$store.getters['user/id'];
      if (userId) {
        this.$socket.subscribeToUserOrders(userId);
      }
    },

    unsubscribeFromWebSocket() {
      if (!this.$socket || !this.isUserAuth) return;

      const userId = this.$store.getters['user/id'];
      if (userId) {
        this.$socket.unsubscribeFromUserOrders(userId);
      }
    },

    handleStatusUpdateEvent(event) {
      const { orderId, status } = event.detail;

      // Проверяем, что это наш активный заказ
      if (this.activeOrder && this.activeOrder.id === orderId) {
        console.log(`StatusStepper: получено обновление статуса заказа #${orderId} → ${status}`);

        // Перезагружаем данные заказа для получения актуальной информации
        this.loadActiveOrder();
      }
    },

    handlePhoneClick() {
      this.showCallingModal();
    },

    showCallingModal() {
      this.$store.commit('modal/showModal', {
        component: 'AppCalling',
        params: {
          title: 'Связаться с нами:',
          isNotMaxHeight: true,
        },
      });
    },

    hide() {
      this.$store.dispatch('order/clearOrder');
    },
  },
};
</script>

<style lang="scss" scoped>
.status-card {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(extClamp(16) + var(--safe-area-inset-top, 0)) extClamp(16) extClamp(20) extClamp(16);
  border-radius: 0 0 extClamp(8) extClamp(8);
  background-color: #b366b5;

  &__loading,
  &__error {
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: extClamp(24);
    color: white;
    gap: 12px;

  }

  &__error {
    flex-direction: column;
    gap: 8px;
  }

  // .status-card__track
  &__track {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: extClamp(220);
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      width: 320px;
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .status-card__step
  &__step {
    position: relative;
    color: #9b64b0;

    &::before {
      position: absolute;
      z-index: 0;
      top: 50%;
      right: 100%;
      width: extClamp(45);
      height: extClamp(2);
      margin-right: extClamp(-3);
      content: '';
      transform: translateY(-50%);
      background-color: #9b64b0;

      @media screen and (min-width: 768px) {
        right: 100%;
        width: 70px;
        height: 2px;
        margin-right: -10px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    &:first-child::before {
      display: none;
    }

    // .status-card__step--done
    &--done {
      .status-card__icon {
        color: #fff;
      }

      &::after {
        background-color: #fff;
      }
    }

    // .status-card__step--active
    &--active {
      color: #9b64b0;

      .status-card__icon {
        color: #fff;
      }

      &::after {
        background-color: #fff;
      }
    }
  }

  // .status-card__icon
  &__icon {
    position: relative;
    z-index: 1;
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .status-card__info
  &__info {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 1.3;
    display: none;
    flex: 1;
    margin-left: extClamp(16);
    color: white;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      display: block;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .status-card__phone
  &__phone {
    flex-shrink: 0;
    cursor: pointer;
    color: #fff;

    &:hover {

    }
  }

  // .status-card__phone-icon
  &__phone-icon {
    width: extClamp(20);
    height: extClamp(20);
    fill: white;

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.retry-btn {
  font-size: 12px;
  padding: 6px 12px;
  cursor: pointer;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.2);

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.05);
    opacity: 0.8;
  }
}

.header-order-delivery {
  font-weight: 600;
  display: none;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 10px 20px;
  cursor: pointer;
  color: var(---Main-Purple, #993ca6);
  border: 1px solid #993ca6;
  border-radius: 2000px;
  background: #fff;
  gap: 5px;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    display: flex;
  }

  // .header-order-delivery__icon
  &__icon {
    width: 24px;
    height: 24px;
  }
}
</style>
