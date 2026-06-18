<template>
  <div class="page-content">
    <div class="page-favorite">
      <div class="page-favorite__content">
        <div
          v-if="products.length"
          class="page-favorite__products"
        >
          <CatalogItem
            v-for="item in products"
            :key="item.id"
            :is-like-hidden="false"
            :is-liked="true"
            :item="item"
            @delete-like="reload"
          />
        </div>
        <PersonalEmptyPage
          v-else
          :bnt-callback="goToCatalog"
          class="page-favorite__empty"
        >
          <template #button-text>
            Перейти в каталог
          </template>
          <template #icon>
            <lord-icon
              :src="`/assets/libs/icon-json/review.json`"
              class="page-favorite__empty-icon"
              trigger="loop"
            />
          </template>
        </PersonalEmptyPage>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PageFavorite',
  data() {
    return {
      productIDs: [],
    };
  },
  async fetch() {
    const user = this.$store.getters['user/user'];
    if (!user.phone) {
      return;
    }
    const res = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/user/${user.id}/like`);
    if (res) {
      this.productIDs = res.map((el) => el.productId);
    }
  },
  computed: {
    products() {
      const result = [];
      this.productIDs.forEach((id) => {
        const product = this.$store.getters['catalog/productById'](id);
        result.push(product);
      });

      return result;
    },
  },
  methods: {
    reload() {
      this.$fetch();
    },
    goToCatalog() {
      this.$router.push('/');
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.page-favorite {
  display: flex;
  flex-direction: column;
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    gap: 40px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .page-favorite__empty
  &__empty {
    margin-top: extClamp(60);

    @media screen and (min-width: 768px) {
      margin-top: 60px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-favorite__empty-icon
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

  .page-favorite__products {
    display: flex;
    flex-direction: column;
    gap: extClamp(30);

    @media screen and (min-width: 768px) {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
