<template>
  <div class="history-order-items">
    <div class="history-order-items__inner">
      <HistoryOrderItem
        v-for="historyOrderItem in userHistory"
        :key="historyOrderItem.orderId"
        :history-order-item="historyOrderItem"
        class="history-order-items__item"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'HistoryOrderItems',
  props: {
    userHistory: {
      type: Array,
      default: () => [],
    },
  },

  data() {
    return {
      fetchUserHistoryInterval: null,
    };
  },
  computed: {
    isAuth() {
      return this.$store.getters['user/isAuth'];
    },

  },

};
</script>

<style lang="scss"
       scoped
>
.history-order-items {

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {

  }

  // .history-order-items__title
  &__title {

  }

  // .history-order-items__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .history-order-items__item
  &__item {

    @media screen and (min-width: 768px) {
      width: calc(50% - 20px);
    }

    @media screen and (min-width: 1280px) {

    }

  }
}
</style>
