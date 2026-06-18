<template>
  <div class="page-content">
    <div class="page-catalog-section">
      <CatalogSection
        :id="`catalog-${currentSectionData.slug}`"
        :key="currentSectionData.id"
        :current-section-data="currentSectionData"
        :has-more="false"
        class="page-index__catalog-section"
        group-title-tag="h2"
        item-title-tag="h3"
      />
    </div>
  </div>
</template>

<script>

export default {
  name: 'PageCatalogSection',
  components: {},

  validate({ store, params }) {
    return typeof store.getters['catalog/currentSectionData'](params.section) !== 'undefined';
  },
  data() {
    return {};
  },
  head() {
    return {
      title: this.metaTitle,
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: this.metaDescription,
        },
      ],
    };
  },

  computed: {
    currentSectionData() {
      return this.$store.getters['catalog/currentSectionData'](this.$route.params.section);
    },

    metaTitle() {
      // eslint-disable-next-line max-len,vue/max-len
      return `Заказать ${this.currentSectionData.nameTo} в ${this.$store.getters['city/cityIn']} доставка Фуджи Суши Friends`;
    },
    metaDescription() {
      if (this.currentSectionData.id === this.$store.getters['setting/PIZZAS_GROUP_ID'][0]) {
        // eslint-disable-next-line max-len,vue/max-len
        return `Заказать пиццу в ${this.$store.getters['city/cityIn']}. Фуджи Суши Friends доставка пиццы на дом или в офис. 8 800 2222-000`;
      }
      // eslint-disable-next-line max-len,vue/max-len
      return `Заказать ${this.currentSectionData.nameTo} в ${this.$store.getters['city/cityIn']} с доставкой на дом и в офис. Вкусные ${this.currentSectionData.name}доставка Фуджи Суши Friends 8 800 2222-000`;
    },
  },
};
</script>

<style scoped>

</style>
