<template>
  <nuxt-link
    :to="`/personal/promotions/${promocode.id}`"
    class="promo-card"
  >
    <div class="promo-card__image">
      <nuxt-img
        :src="promocode.listBanner ? promocode.listBanner.path : ''"
        fit="cover"
        format="webp"
        loading="lazy"
        quality="100"
        width="400"
      />
    </div>
  </nuxt-link>
</template>

<script>
export default {
  name: 'PromoCard',
  props: {
    promocode: {
      type: Object,
      required: true,
    },
  },
  computed: {
    badgeText() {
      if (this.promocode.dateFrom && this.promocode.dateTo) {
        const now = Date.now();
        if (now < this.promocode.dateFrom) {
          return 'СКОРО';
        }
        if (now > this.promocode.dateTo) {
          return '';
        }
        return 'ОСТРО!';
      }
      return 'ОСТРО!';
    },
  },
};
</script>

<style lang="scss" scoped>
.promo-card {

  @media screen and (min-width: 768px) {

  }

  &__image {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }
}
</style>
