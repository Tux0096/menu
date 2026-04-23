<template>
  <div class="restaurant-select">
    <div class="restaurant-select__header">
      <img
        src="/assets/images/logo/logo.svg"
        alt="Фуджи Суши Friends"
        class="restaurant-select__logo"
      >
      <h1 class="restaurant-select__title">
        Выберите ресторан
      </h1>
      <p class="restaurant-select__subtitle">
        Нажмите на адрес ресторана, чтобы просмотреть меню
      </p>
    </div>

    <div
      v-if="loading"
      class="restaurant-select__loading"
    >
      <div class="restaurant-select__spinner" />
    </div>

    <div
      v-else-if="groupedRestaurants.length"
      class="restaurant-select__groups"
    >
      <div
        v-for="group in groupedRestaurants"
        :key="group.city"
        class="restaurant-select__city-group"
      >
        <h2 class="restaurant-select__city-name">
          {{ group.city }}
        </h2>
        <div class="restaurant-select__grid">
          <nuxt-link
            v-for="restaurant in group.restaurants"
            :key="restaurant.slug"
            :to="`/menu/${restaurant.slug}`"
            class="restaurant-card"
          >
            <div class="restaurant-card__icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="#993ca6" />
              </svg>
            </div>
            <div class="restaurant-card__info">
              <span class="restaurant-card__name">{{ restaurant.name || restaurant.address }}</span>
              <span class="restaurant-card__address">{{ restaurant.address }}</span>
              <span
                v-if="restaurant.phone"
                class="restaurant-card__phone"
              >{{ restaurant.phone }}</span>
            </div>
            <div class="restaurant-card__arrow">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke="#993ca6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </div>
          </nuxt-link>
        </div>
      </div>
    </div>

    <div
      v-else
      class="restaurant-select__empty"
    >
      Рестораны не найдены
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuIndex',

  layout: 'menu-select',

  data() {
    return {
      restaurants: [],
      loading: true,
    };
  },

  computed: {
    groupedRestaurants() {
      const groups = {};
      this.restaurants.forEach((r) => {
        const city = r.city_name || 'Прочие';
        if (!groups[city]) groups[city] = [];
        groups[city].push(r);
      });
      return Object.entries(groups).map(([city, restaurants]) => ({ city, restaurants }));
    },
  },

  async mounted() {
    try {
      const data = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/restaurants`);
      this.restaurants = data;
    } catch (e) {
      console.error('Failed to load restaurants', e);
    } finally {
      this.loading = false;
    }
  },
};
</script>

<style lang="scss" scoped>
.restaurant-select {
  min-height: 100vh;
  padding: 40px 24px 60px;
  background: #f9f9f9;

  &__header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40px;
    text-align: center;
  }

  &__logo {
    height: 48px;
    margin-bottom: 24px;
  }

  &__title {
    font-size: 32px;
    font-weight: 800;
    color: #292929;
    margin-bottom: 8px;
  }

  &__subtitle {
    font-size: 16px;
    color: #969696;
  }

  &__loading {
    display: flex;
    justify-content: center;
    padding: 80px 0;
  }

  &__spinner {
    width: 48px;
    height: 48px;
    border: 4px solid #f0f0f0;
    border-top-color: #993ca6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__groups {
    max-width: 960px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }

  &__city-name {
    font-size: 20px;
    font-weight: 700;
    color: #993ca6;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 2px solid #f0e6f7;
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
  }

  &__empty {
    text-align: center;
    padding: 80px 0;
    font-size: 20px;
    color: #969696;
  }
}

.restaurant-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
  text-decoration: none;
  transition: box-shadow 0.2s, transform 0.15s;
  cursor: pointer;

  &:hover {
    box-shadow: 0 6px 24px rgba(153, 60, 166, 0.15);
    transform: translateY(-2px);
  }

  &__icon {
    flex-shrink: 0;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: #f0e6f7;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  &__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  &__name {
    font-size: 15px;
    font-weight: 700;
    color: #292929;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__address {
    font-size: 13px;
    color: #969696;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__phone {
    font-size: 12px;
    color: #993ca6;
    font-weight: 500;
  }

  &__arrow {
    flex-shrink: 0;
    opacity: 0.5;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
