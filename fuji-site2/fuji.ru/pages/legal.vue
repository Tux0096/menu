<template>
  <div class="page-content">
    <div class="page-legal">
      <h1
        v-if="content?.title"
        class="page-content__title"
      >
        {{ content.title }}
      </h1>
      <div
        v-if="content?.text"
        v-html="content.text"
      />
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageLegal',
  data() {
    return {
      content: null,
    };
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    this.content = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/legal/${cityId}`);
  },
};
</script>

<style scoped>
*::v-deep {
  h2 {
    font-weight: bold;
  }
}

</style>
