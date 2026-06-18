<template>
  <div>
    <div class="page-content">
      <div class="page-catalog-detail">
        <CatalogDetailItem
          v-if="currentProductData"
          :product="currentProductData"
        />
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'PageCatalogDetail',
  components: {},

  head() {
    return {
      // eslint-disable-next-line max-len,vue/max-len
      title: `Заказать ${this.currentProductData.nameTo} в ${this.$store.getters['city/cityIn']} доставка Фуджи Суши Friends`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          // eslint-disable-next-line max-len,vue/max-len
          content: `${this.currentProductData.name} - ${this.currentProductData.description} ${this.price} руб. - доставка Фуджи Суши Friends ${this.$store.getters['city/cityName']}`,
        },

      ],
    };
  },
  computed: {
    currentProductData() {
      return this.$store.getters['catalog/currentProductData'](this.$route.params.product_id);
    },
  },
  created() {

  },

};
</script>

<style lang="scss"
       scoped
>
.page-catalog-detail {
  height: 100%;
  padding-top: extClamp(72);
}

.page-catalog-detail::v-deep(.catalog-detail-item__footer ) {
  position: static;
}
</style>
