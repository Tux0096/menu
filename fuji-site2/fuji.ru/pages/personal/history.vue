<template>
  <div class="page-content">
    <div class="page-history">
      <client-only>
        <HistoryOrderItems
          v-if="userHistory.length"
          :user-history="userHistory"
        />
        <PersonalEmptyPage
          v-else
          :bnt-callback="goToCatalog"
          class="page-history__empty"
        >
          <template #button-text>
            Совершить первый заказ
          </template>
          <template #icon>
            <lord-icon
              :src="`/assets/libs/icon-json/order-history.json`"
              class="page-history__empty-icon"
              trigger="loop"
            />
          </template>
        </PersonalEmptyPage>
      </client-only>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageHistory',
  data() {
    return {};
  },
  head() {
    return {
      title: `История заказов Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: `История заказов Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}`,
        },
      ],
    };
  },
  computed: {
    userHistory() {
      return this.$store.getters['user/userHistory'];
    },
  },

  mounted() {
    this.fetchUserHistoryInterval = setInterval(() => this.fetchUserHistory(), 1000 * 60);
    this.fetchUserHistory();
  },
  beforeDestroy() {
    clearInterval(this.fetchUserHistoryInterval);
  },

  methods: {
    goToCatalog() {
      this.$router.push('/');
    },
    fetchUserHistory() {
      this.$store.dispatch('user/fetchUserHistory');
    },
  },

};
</script>

<style lang="scss"
       scoped
>

.page-history {
  display: flex;
  flex-direction: column;
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    gap: 40px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .page-history__empty
  &__empty {
    margin-top: extClamp(60);

    @media screen and (min-width: 768px) {
      margin-top: 60px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-history__empty-icon
  &__empty-icon {
    width: extClamp(50);
    height: extClamp(50);

    @media screen and (min-width: 768px) {
      width: 100px;
      height: 100px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}

</style>
