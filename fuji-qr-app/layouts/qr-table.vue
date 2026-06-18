<template>
  <div class="layout-qr safe-top safe-left safe-right safe-bottom">
    <notifications
      group="messages"
      position="top center"
    />

    <QrTableHeader v-if="isTableMode" />

    <div
      class="layout-qr__page page"
      :class="{ 'layout-qr__page--table': isTableMode }"
    >
      <main class="layout-qr__main">
        <nuxt />
      </main>
    </div>

    <client-only>
      <TheModals />
      <QrBottomNav v-if="isTableMode" />
      <GuestPaymentModal
        :visible="showPaymentModal"
        :total="orderTotal"
        @close="closePayment"
      />
      <VisitFeedbackModal
        :visible="showFeedbackModal"
        @done="closeFeedback"
      />
      <CallWaiterSheet
        :visible="showCallWaiter"
        @close="showCallWaiter = false"
      />
    </client-only>
  </div>
</template>

<script>
import QrTableHeader from '~/components/QrTableHeader.vue';
import QrBottomNav from '~/components/QrBottomNav.vue';
import GuestPaymentModal from '~/components/GuestPaymentModal.vue';
import VisitFeedbackModal from '~/components/VisitFeedbackModal.vue';
import CallWaiterSheet from '~/components/CallWaiterSheet.vue';

export default {
  components: {
    QrTableHeader,
    QrBottomNav,
    GuestPaymentModal,
    VisitFeedbackModal,
    CallWaiterSheet,
  },

  data() {
    return { showCallWaiter: false };
  },

  computed: {
    isTableMode() {
      return this.$store.getters['tableSession/isActive'];
    },
    showPaymentModal() {
      return this.$store.state.tableSession.showPaymentModal;
    },
    showFeedbackModal() {
      return this.$store.state.tableSession.showFeedbackModal;
    },
    orderTotal() {
      return this.$store.state.tableSession.orderTotal
        || Math.round(
          (this.$store.getters['cart/cartItems'] || []).reduce(
            (s, i) => s + (i.product?.price || 0) * i.quantity,
            0,
          ),
        );
    },
  },

  watch: {
    '$store.state.cart.items': {
      handler() {
        if (this.isTableMode) {
          this.$store.dispatch('tableSession/scheduleCartSave');
        }
      },
      deep: true,
    },
  },

  mounted() {
    if (this.isTableMode) {
      this.$store.dispatch('tableSession/trackActivity');
      this.$store.dispatch('tableSession/startSessionPolling');
    }
    this.$nuxt.$on('qr-call-waiter', this.openCallWaiter);
  },

  beforeDestroy() {
    this.$nuxt.$off('qr-call-waiter', this.openCallWaiter);
    this.$store.dispatch('tableSession/stopSessionPolling');
  },

  methods: {
    openCallWaiter() {
      this.showCallWaiter = true;
    },
    closePayment() {
      this.$store.commit('tableSession/setShowPaymentModal', false);
    },
    closeFeedback() {
      this.$store.commit('tableSession/setShowFeedbackModal', false);
    },
  },
};
</script>

<style lang="scss" scoped>
.layout-qr {
  min-height: 100vh;
  background: var(---Main-Purple, #993ca6);

  &__page {
    &--table {
      padding-top: calc(extClamp(56) + var(--safe-area-inset-top, 0));

      @media screen and (min-width: 768px) {
        padding-top: calc(88px + var(--safe-area-inset-top, 0));
      }
    }
  }

  &__main {
    min-height: calc(100vh - 80px);
    padding-bottom: calc(72px + env(safe-area-inset-bottom, 0px));
    background: #fff;
    color: var(---Main-Black, #292929);
    overflow-x: hidden;
  }
}
</style>
