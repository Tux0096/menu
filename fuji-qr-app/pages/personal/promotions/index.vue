<template>
  <div class="page-content page-promotions">
    <div
      v-if="isLoading"
      class="page-promotions__loading"
    >
      Загрузка...
    </div>

    <div
      v-else-if="error"
      class="page-promotions__error"
    >
      {{ error }}
    </div>

    <template v-else>
      <div
        v-if="activePromocodes.length === 0"
        class="page-promotions__empty"
      >
        <PersonalEmptyPage
          description="Здесь будут отображаться доступные вам промокоды и акции"
          title="У вас пока нет доступных акций"
        />
      </div>

      <div
        v-else
        class="page-promotions__list"
      >
        <PersonalPromoCard
          v-for="promocode in activePromocodes"
          :key="promocode.id"
          :promocode="promocode"
        />
      </div>
    </template>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'PersonalPromotions',
  layout: 'default',

  async fetch() {
    await this.$store.dispatch('promo/fetchPromocodes');
  },

  computed: {
    ...mapGetters({
      promocodes: 'promo/getPromocodes',
      isLoading: 'promo/isLoading',
      error: 'promo/getError',
    }),

    activePromocodes() {
      if (!this.promocodes) return [];

      return this.promocodes.filter((promocode) => promocode.active && promocode.listBanner);
    },
  },

};
</script>

<style lang="scss" scoped>
.page-promotions {
  padding: extClamp(16);

  @media screen and (min-width: 768px) {
    padding: 20px;
  }

  &__list {
    display: grid;
    grid-template-columns: 1fr;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  &__loading,
  &__error {
    font-size: extClamp(16);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 200px;
    color: #666;
  }
}
</style>
