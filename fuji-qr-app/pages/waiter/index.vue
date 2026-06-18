<template>
  <div class="waiter-app">
    <header class="waiter-app__header">
      <h1>Терминал официанта</h1>
      <span class="waiter-app__sub">Фуджи Ново-Садовая</span>
      <button
        type="button"
        class="waiter-app__read-all"
        @click="markAllRead"
      >
        Прочитать всё
      </button>
    </header>

    <section class="waiter-app__notifications">
      <h2>Уведомления</h2>
      <div
        v-if="!notifications.length"
        class="waiter-app__empty"
      >
        Нет новых уведомлений
      </div>
      <article
        v-for="n in notifications"
        :key="n.id"
        class="waiter-notify"
        :class="{ 'waiter-notify--unread': !n.is_read }"
        @click="openNotification(n)"
      >
        <div class="waiter-notify__title">
          {{ n.title }}
        </div>
        <div class="waiter-notify__body">
          {{ n.body }}
        </div>
        <div class="waiter-notify__time">
          {{ formatTime(n.created_at) }}
        </div>
      </article>
    </section>

    <section
      v-if="activeSession"
      class="waiter-app__session"
    >
      <h2>Стол №{{ activeSession.tableNumber }}</h2>
      <p class="waiter-app__status">
        {{ statusLabel(activeSession.workflowStatus) }}
      </p>

      <label class="waiter-app__guests">
        Гостей за столом
        <input
          v-model.number="guestCount"
          type="number"
          min="1"
          max="20"
        >
      </label>

      <ul class="waiter-app__items">
        <li
          v-for="(item, idx) in editItems"
          :key="idx"
          class="waiter-item"
        >
          <input
            v-model="item.name"
            class="waiter-item__name"
          >
          <input
            v-model.number="item.quantity"
            type="number"
            min="0"
            class="waiter-item__qty"
          >
          <select
            v-model.number="item.seatNumber"
            class="waiter-item__seat"
          >
            <option :value="null">
              —
            </option>
            <option
              v-for="g in guestCount"
              :key="g"
              :value="g"
            >
              Гость {{ g }}
            </option>
          </select>
          <span class="waiter-item__price">{{ item.price }} ₽</span>
          <button
            type="button"
            @click="removeItem(idx)"
          >
            ✕
          </button>
        </li>
      </ul>

      <div class="waiter-app__total">
        Итого: {{ sessionTotal }} ₽
      </div>

      <div class="waiter-app__actions">
        <button
          type="button"
          class="waiter-app__btn waiter-app__btn--secondary"
          @click="saveCart"
        >
          Сохранить корзину
        </button>
        <button
          type="button"
          class="waiter-app__btn waiter-app__btn--primary"
          :disabled="sending"
          @click="sendToProduction"
        >
          {{ sending ? 'Отправка...' : 'В работу' }}
        </button>
      </div>
    </section>

    <section class="waiter-app__tables">
      <h2>Активные столы</h2>
      <button
        v-for="s in sessions"
        :key="s.sessionId"
        type="button"
        class="waiter-table-btn"
        :class="{ 'waiter-table-btn--active': activeSession?.sessionId === s.sessionId }"
        @click="selectSession(s)"
      >
        <strong>Стол {{ s.tableNumber }}</strong>
        <span>{{ statusLabel(s.workflowStatus) }}</span>
        <span>{{ s.total }} ₽</span>
      </button>
    </section>
  </div>
</template>

<script>
export default {
  layout: 'default',

  data() {
    return {
      notifications: [],
      sessions: [],
      activeSession: null,
      editItems: [],
      guestCount: 1,
      sending: false,
      pollId: null,
    };
  },

  computed: {
    sessionTotal() {
      return Math.round(this.editItems.reduce(
        (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
        0,
      ));
    },
    apiBase() {
      return this.$config.FRONT_API_URL;
    },
  },

  mounted() {
    this.refresh();
    this.pollId = setInterval(this.refresh, 10000);
  },

  beforeDestroy() {
    if (this.pollId) clearInterval(this.pollId);
  },

  methods: {
    statusLabel(wf) {
      const map = {
        browsing: 'Изучает меню',
        building_cart: 'Выбирает',
        cart_ready: 'Ждёт официанта',
        waiter_review: 'На проверке',
        in_production: 'На кухне',
        reorder_pending: 'Дозаказ',
        paid: 'Оплачено',
      };
      return map[wf] || wf;
    },
    formatTime(iso) {
      if (!iso) return '';
      return new Date(iso).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    },
    async refresh() {
      try {
        const [notif, sessions] = await Promise.all([
          this.$axios.$get(`${this.apiBase}/api/v1/waiter/notifications?unread=0`),
          this.$axios.$get(`${this.apiBase}/api/v1/waiter/sessions`),
        ]);
        this.notifications = notif;
        this.sessions = sessions;
      } catch (e) {
        console.warn(e);
      }
    },
    async markAllRead() {
      await this.$axios.post(`${this.apiBase}/api/v1/waiter/notifications/read-all`);
      await this.refresh();
    },
    async openNotification(n) {
      await this.$axios.post(`${this.apiBase}/api/v1/waiter/notifications/${n.id}/read`);
      if (n.payload?.sessionId) {
        const session = await this.$axios.$get(
          `${this.apiBase}/api/v1/waiter/session/${n.payload.sessionId}`,
        );
        this.selectSession(session);
      }
      await this.refresh();
    },
    selectSession(s) {
      this.activeSession = s;
      this.guestCount = s.guestCount || 1;
      this.editItems = (s.items || []).map((i) => ({
        productId: i.productId,
        iikoProductId: i.iikoProductId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        seatNumber: i.seatNumber,
        isLocked: i.isLocked,
      }));
    },
    removeItem(idx) {
      this.editItems.splice(idx, 1);
    },
    async saveCart() {
      if (!this.activeSession) return;
      const data = await this.$axios.$post(
        `${this.apiBase}/api/v1/waiter/session/${this.activeSession.sessionId}/cart`,
        { items: this.editItems, guestCount: this.guestCount },
      );
      this.selectSession(data);
      await this.refresh();
    },
    async sendToProduction() {
      if (!this.activeSession) return;
      this.sending = true;
      try {
        await this.saveCart();
        const data = await this.$axios.$post(
          `${this.apiBase}/api/v1/waiter/session/${this.activeSession.sessionId}/send-to-production`,
        );
        this.selectSession(data);
        await this.refresh();
        alert('Заказ отправлен на кухню');
      } catch (e) {
        alert(e.response?.data?.error || 'Ошибка отправки');
      } finally {
        this.sending = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.waiter-app {
  max-width: 720px;
  margin: 0 auto;
  padding: 16px 16px 48px;
  background: #f5f5f5;
  min-height: 100vh;
  color: #292929;

  &__header {
    margin-bottom: 20px;

    h1 { margin: 0; font-size: 22px; }
  }

  &__sub { font-size: 13px; color: #666; }
  &__read-all {
    margin-top: 8px;
    padding: 8px 12px;
    border: 1px solid #993ca6;
    border-radius: 8px;
    background: #fff;
    color: #993ca6;
    font-size: 13px;
    cursor: pointer;
  }

  section {
    margin-bottom: 24px;
    padding: 16px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 2px 8px rgba(0,0,0,0.06);

    h2 { margin: 0 0 12px; font-size: 16px; }
  }

  &__empty { color: #999; font-size: 14px; }
  &__status { margin: 0 0 12px; color: #993ca6; font-weight: 600; }
  &__guests {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    font-size: 14px;

    input { width: 64px; padding: 6px; border-radius: 8px; border: 1px solid #ddd; }
  }

  &__items { margin: 0 0 12px; padding: 0; list-style: none; }
  &__total { margin-bottom: 12px; font-size: 18px; font-weight: 700; }
  &__actions { display: flex; flex-direction: column; gap: 8px; }

  &__btn {
    padding: 14px;
    border: none;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;

    &--primary { background: #993ca6; color: #fff; }
    &--secondary { background: #f0e6f7; color: #993ca6; }
    &:disabled { opacity: 0.5; }
  }

  &__tables {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
}

.waiter-notify {
  padding: 12px;
  margin-bottom: 8px;
  border-radius: 12px;
  background: #fafafa;
  cursor: pointer;

  &--unread { background: #f0e6f7; border-left: 3px solid #993ca6; }

  &__title { font-weight: 700; font-size: 14px; }
  &__body { margin-top: 4px; font-size: 13px; color: #555; }
  &__time { margin-top: 4px; font-size: 11px; color: #999; }
}

.waiter-item {
  display: grid;
  grid-template-columns: 1fr 48px 80px 56px 32px;
  gap: 6px;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
  font-size: 13px;

  input, select {
    padding: 4px 6px;
    border: 1px solid #ddd;
    border-radius: 6px;
    font-size: 12px;
  }

  button {
    border: none;
    background: none;
    color: #c00;
    cursor: pointer;
  }
}

.waiter-table-btn {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border: 1px solid #eee;
  border-radius: 12px;
  background: #fafafa;
  text-align: left;
  cursor: pointer;

  &--active { border-color: #993ca6; background: #f0e6f7; }

  strong { font-size: 15px; }
  span { font-size: 12px; color: #666; }
}
</style>
