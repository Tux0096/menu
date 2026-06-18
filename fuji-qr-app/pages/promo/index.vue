<template>
  <div class="page-content">
    <div class="page-promo">
      <!-- Промо-баннеры для всех пользователей -->
      <div v-if="banners.length > 0" class="promo-banner">
        <div
          v-for="banner in banners"
          :key="banner.path"
          class="promo-item"
        >
          <component
            :is="banner.link ? 'nuxt-link' : 'div'"
            :to="banner.link ? banner.link : ''"
          >
            <nuxt-img
              :src="banner.path"
              format="webp"
              loading="lazy"
              quality="80"
              width="1320"
            />
          </component>
        </div>
      </div>

      <!-- Промокоды для сегментов пользователей -->
      <div v-if="personalPromocodes.length > 0" class="promo-personal">
        <h2 class="promo-personal-title">Ваши персональные промокоды</h2>
        <div class="promo-personal-items">
          <div
            v-for="promo in personalPromocodes"
            :key="promo.id"
            class="promo-personal-item"
          >
            <div v-if="promo.cardBanner" class="promo-personal-item-banner">
              <nuxt-img
                :src="promo.cardBanner.path"
                format="webp"
                loading="lazy"
                quality="80"
                width="640"
              />
            </div>
            <div class="promo-personal-item-content">
              <h3 class="promo-personal-item-title">{{ promo.title }}</h3>
              <p v-if="promo.description" class="promo-personal-item-desc">{{ promo.description }}</p>
              <div class="promo-personal-item-code">
                <span class="promo-personal-item-code-label">Ваш промокод:</span>
                <span class="promo-personal-item-code-value">{{ promo.coupon }}</span>
              </div>
              <div v-if="promo.dateFrom || promo.dateTo" class="promo-personal-item-dates">
                <span v-if="promo.dateFrom">С {{ formatDate(promo.dateFrom) }}</span>
                <span v-if="promo.dateTo">По {{ formatDate(promo.dateTo) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Если нет ни баннеров, ни промокодов -->
      <div v-if="banners.length === 0 && personalPromocodes.length === 0" class="promo-empty">
        <p>В настоящее время нет активных акций и промокодов</p>
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapActions } from 'vuex';

export default {
  name: 'PagePromo',
  data() {
    return {
      banners: [],
      title: 'Акции',
    };
  },
  computed: {
    ...mapGetters({
      personalPromocodes: 'promo/getPromocodes',
      isLoading: 'promo/isLoading',
    }),
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    const res = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/promo/${cityId}`);

    this.banners = res.banners;
    this.title = res.title;

    // Загружаем персональные промокоды
    await this.fetchPromocodes();
  },
  head() {
    return {
      title: `Акции доставки Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          // eslint-disable-next-line max-len,vue/max-len
          content: `Текущие скидки и акции доставки Фуджи Суши Friends в ${this.$store.getters['city/cityIn']}, условия получения скидок и акций.`,
        },
      ],
    };
  },
  methods: {
    ...mapActions({
      fetchPromocodes: 'promo/fetchPromocodes',
    }),
    formatDate(dateString) {
      const date = new Date(dateString);
      return date.toLocaleDateString('ru-RU');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.promo-item {
  margin-top: extClamp(12);

  @media screen and (min-width: 768px) {
    margin-top: 16px;

    &:first-child {
      margin-top: 0;
    }
  }

  @media screen and (min-width: 1280px) {

  }
}

.promo-item:last-child {
  margin-bottom: 0;
}

.promo-item img {
  display: block;
  width: 100%;
  border-radius: extClamp(10);

  @media screen and (min-width: 768px) {
    border-radius: 20px;
  }
}

.promo-personal {
  margin-top: extClamp(24);

  @media screen and (min-width: 768px) {
    margin-top: 32px;
  }
}

.promo-personal-title {
  font-size: extClamp(20);
  margin-bottom: extClamp(16);

  @media screen and (min-width: 768px) {
    font-size: 28px;
    margin-bottom: 24px;
  }
}

.promo-personal-items {
  display: grid;
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 24px;
  }
}

.promo-personal-item {
  border-radius: extClamp(10);
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  background-color: #fff;

  @media screen and (min-width: 768px) {
    border-radius: 16px;
  }
}

.promo-personal-item-content {
  padding: extClamp(16);

  @media screen and (min-width: 768px) {
    padding: 24px;
  }
}

.promo-personal-item-title {
  font-size: extClamp(18);
  margin-bottom: extClamp(8);

  @media screen and (min-width: 768px) {
    font-size: 22px;
    margin-bottom: 12px;
  }
}

.promo-personal-item-desc {
  margin-bottom: extClamp(16);
  font-size: extClamp(14);

  @media screen and (min-width: 768px) {
    font-size: 16px;
    margin-bottom: 20px;
  }
}

.promo-personal-item-code {
  display: flex;
  align-items: center;
  margin-bottom: extClamp(12);

  @media screen and (min-width: 768px) {
    margin-bottom: 16px;
  }
}

.promo-personal-item-code-label {
  font-size: extClamp(14);
  margin-right: extClamp(8);

  @media screen and (min-width: 768px) {
    font-size: 16px;
    margin-right: 12px;
  }
}

.promo-personal-item-code-value {
  font-weight: bold;
  font-size: extClamp(16);
  background-color: #f5f5f5;
  padding: extClamp(4) extClamp(10);
  border-radius: extClamp(4);

  @media screen and (min-width: 768px) {
    font-size: 18px;
    padding: 6px 12px;
    border-radius: 6px;
  }
}

.promo-personal-item-dates {
  display: flex;
  justify-content: space-between;
  font-size: extClamp(12);
  color: #777;

  @media screen and (min-width: 768px) {
    font-size: 14px;
  }
}

.promo-empty {
  text-align: center;
  padding: extClamp(40) 0;
  font-size: extClamp(16);
  color: #777;

  @media screen and (min-width: 768px) {
    padding: 60px 0;
    font-size: 18px;
  }
}
</style>
