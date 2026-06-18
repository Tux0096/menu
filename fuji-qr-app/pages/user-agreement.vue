<template>
  <div class="page-content">
    <div class="page-user-agreement">
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
  name: 'PageUserAgreement',
  data() {
    return {
      content: null,
    };
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    this.content = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/user-agreement/${cityId}`);
  },
};
</script>

<style scoped>

</style>
