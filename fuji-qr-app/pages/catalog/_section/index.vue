<template>
  <div class="page-content">
    <button
      v-if="isTableMode"
      type="button"
      class="page-catalog-section__back"
      @click="goToMenu"
    >
      ← Меню
    </button>
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

  layout(ctx) {
    return ctx.store.getters['tableSession/isActive'] ? 'qr-table' : 'default';
  },

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

    isTableMode() {
      return this.$store.getters['tableSession/isActive'];
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

  mounted() {
    if (this.isTableMode) {
      this.$store.commit('tableSession/setActiveTab', 'menu');
    }
  },

  methods: {
    goToMenu() {
      this.$router.push('/');
    },
  },
};
</script>

<style scoped>
.page-catalog-section__back {
  display: block;
  margin: 12px 16px 0;
  padding: 0;
  border: none;
  background: none;
  color: var(---Main-Purple, #993ca6);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}
</style>
