<template>
  <div class="page-content promo-detail">
    <div
      v-if="isLoading"
      class="promo-detail__loading"
    >
      Загрузка...
    </div>

    <div
      v-else-if="error"
      class="promo-detail__error"
    >
      {{ error }}
    </div>

    <template v-else-if="promocode">
      <div class="promo-detail__banner">
        <nuxt-img
          :src="promocode.cardBanner ? promocode.cardBanner.path : (promocode.listBanner ? promocode.listBanner.path : '')"
          fit="contain"
          format="webp"
          loading="lazy"
          quality="100"
          width="800"
        />
      </div>

      <div class="promo-detail__content">
        <h1 class="promo-detail__title">
          {{ promocode.title || 'Промокод' }}
        </h1>

        <div class="promo-detail__info">
          <div class="promo-detail__code">
            ПРОМОКОД: {{ promocode.coupon }}
          </div>

          <div
            v-if="promocode.description"
            class="promo-detail__description"
            v-html="promocode.description"
          />
        </div>

        <div class="promo-detail__actions">
          <BaseGradientButton
            :disabled="!promocode.active"
            class="promo-detail__apply-btn"
            type="outline"
            @click="applyPromocode"
          >
            Применить промокод
          </BaseGradientButton>
        </div>
      </div>
    </template>

    <div
      v-else
      class="promo-detail__not-found"
    >
      <Personal-EmptyPage
        description="К сожалению, запрашиваемый промокод не найден или недоступен"
        title="Промокод не найден"
      />
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';

export default {
  name: 'PromoDetail',
  layout: 'default',

  async fetch() {
    const { id } = this.$route.params;
    await this.$store.dispatch('promo/fetchPromocode', id);
  },

  computed: {
    ...mapGetters({
      promocode: 'promo/getCurrentPromocode',
      isLoading: 'promo/isLoading',
      error: 'promo/getError',
    }),

  },

  methods: {
    formatDate(timestamp) {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleDateString('ru-RU');
    },

    async applyPromocode() {
      if (!this.promocode || !this.promocode.active) return;

      const success = await this.$store.dispatch('promo/applyPromocode', this.promocode.coupon);

      if (success) {
        this.$notify({
          group: 'messages',
          type: 'success',
          text: 'Промокод успешно применен. Перейдите в корзину, чтобы оформить заказ.',
        });

        this.$router.push('/cart');
      } else {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Ошибка при применении промокода. Попробуйте позже.',
        });
      }
    },
  },

};
</script>

<style lang="scss" scoped>
.promo-detail {
  max-width: 512px;
  padding: extClamp(16);

  @media screen and (min-width: 768px) {
    padding: 20px;
  }

  &__banner {
    position: relative;
    width: 100%;
    margin-bottom: extClamp(16);

    @media screen and (min-width: 768px) {
      margin-bottom: 24px;

    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__badge {
    font-size: extClamp(12);
    font-weight: 500;
    position: absolute;
    top: extClamp(16);
    right: extClamp(16);
    padding: extClamp(6) extClamp(12);
    color: #fff;
    border-radius: extClamp(6);
    background-color: #ff003d;

    @media screen and (min-width: 768px) {
      font-size: 14px;
      top: 24px;
      right: 24px;
      padding: 8px 16px;
      border-radius: 8px;
    }
  }

  &__content {
    margin-bottom: extClamp(24);

    @media screen and (min-width: 768px) {
      margin-bottom: 40px;
    }
  }

  &__title {
    font-size: extClamp(24);
    font-weight: 600;
    margin-bottom: extClamp(12);
    color: #9c7bcb;

    @media screen and (min-width: 768px) {
      font-size: 24px;
      margin-bottom: 12px;
    }
  }

  &__info {
    margin-bottom: extClamp(24);

    @media screen and (min-width: 768px) {
      margin-bottom: 40px;
    }
  }

  &__code {
    font-size: extClamp(16);
    font-weight: 700;
    line-height: 140%;
    margin-bottom: extClamp(12);
    color: #343e59;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      margin-bottom: 12px;
    }
  }

  &__description {
    font-size: extClamp(10);
    line-height: 1.2;
    margin-bottom: extClamp(16);
    color: #969696;

    @media screen and (min-width: 768px) {
      font-size: 12px;
      margin-bottom: 24px;
    }
  }

  &__dates,
  &__limit {
    font-size: extClamp(14);
    margin-bottom: extClamp(8);
    color: #666;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      margin-bottom: 12px;
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;

    @media screen and (min-width: 768px) {
      flex-direction: row;
    }
  }

  &__apply-btn {
    width: 100%;
    max-width: extClamp(392);
    margin-right: auto;
    margin-left: auto;

    @media screen and (min-width: 768px) {
      max-width: 392px;
    }

    &:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }

  }

  &__loading,
  &__error,
  &__not-found {
    font-size: extClamp(16);
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
    color: #666;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
