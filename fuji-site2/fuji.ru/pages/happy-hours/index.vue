<template>
  <div class="page-content">
    <div class="page-happy-hours">
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
  name: 'PageHappyHours',
  data() {
    return {
      content: null,
    };
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    this.content = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/happy-hours/${cityId}`);
  },
  head() {
    return {
      title: this.content?.title || 'Счастливые часы Фуджи Суши Friends',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Счастливые часы в Фуджи Суши Friends - специальные предложения и акции',
        },
      ],
    };
  },
};
</script>

<style lang="scss" scoped>
.page-happy-hours {
  padding: 20px 0;
}

*::v-deep {
  h2, h3, h4 {
    font-weight: bold;
  }
}
</style>
