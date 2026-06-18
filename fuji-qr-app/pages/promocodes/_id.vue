<template>
  <client-only>
    <div class="page-content page-promocode-detail">
      <div class="page-promocodes">
        <div class="page-promocodes__header">
          <svg
            class="back__button"
            @click="$router.push('/promocodes')"
          >
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#return-back" />
          </svg>
          <h1>{{ splitPromocodeDescription(promocode?.config?.description).first || 'Промокод' }}</h1>
        </div>
      </div>
      <div class="page-promocodes__middle">

        <div class="promocode__text">
          <h1 class="promocode__title">
            <span class="description-first">
              {{ splitPromocodeDescription(promocode?.config?.description).first }}
            </span>
            <span
              v-if="splitPromocodeDescription(promocode?.config?.description).second"
              class="description-second"
            >
              {{ splitPromocodeDescription(promocode?.config?.description).second }}
            </span>
          </h1>
          <h1 class="promocode__code">
            ПРОМОКОД: {{ promocode?.code }}
          </h1>
          <div class="promocode__conditions">
            <p class="promocode__conditions-title">Условия использования</p>
            <p
              v-for="(condition, idx) in promocodeConditions"
              :key="`${idx}-${condition}`"
              class="promocode__conditions-item"
            >
              {{ condition }}
            </p>
          </div>
        </div>


      <BaseGradientButton
        class="page-promocode-detail__apply"
        type="outline"
        @click="applyPromocode"
      >
        Применить промокод
      </BaseGradientButton>
      </div>
    </div>
  </client-only>
</template>

<script>
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  name: 'PagePromocodeById',
  components: { BaseGradientButton },
  data() {
    return {
      promocode: null,
    };
  },
  async fetch() {
    const id = this.$route.params.id;
    this.promocode = await this.$axios.$get(
      `${this.$config.FRONT_API_URL}/api/v1/remarked-loyalty/promocodes/${id}`,
    );
  },
  methods: {
    splitPromocodeDescription(text) {
      const src = (text || '').trim();
      if (!src) {
        return { first: '', second: '' };
      }

      const words = src.split(/\s+/);
      if (words.length < 2) {
        return { first: src, second: '' };
      }

      const splitWords = ['в', 'во', 'на', 'при', 'к', 'ко', 'с', 'со', 'по', 'для', 'без', 'за'];
      let splitIndex = -1;
      for (let i = 1; i < words.length; i += 1) {
        const w = words[i].toLowerCase().replace(/[.,!?;:()]/g, '');
        if (splitWords.includes(w)) {
          splitIndex = i;
          break;
        }
      }

      if (splitIndex === -1) {
        splitIndex = Math.ceil(words.length / 2);
      }

      return {
        first: words.slice(0, splitIndex).join(' ').trim(),
        second: words.slice(splitIndex).join(' ').trim(),
      };
    },
    async applyPromocode() {
      const code = String(this.promocode?.code || '').trim();
      if (!code) {
        return;
      }
      await this.$store.dispatch('cart/setAppliedCoupon', code);
      await this.$router.push('/cart');
    },
  },
  computed: {
    promocodeConditions() {
      const cfg = this.promocode?.config || {};
      const items = [];

      if (cfg.description) items.push(String(cfg.description));
      if (cfg.min_order_sum != null) items.push(`Минимальная сумма заказа: ${cfg.min_order_sum}`);
      if (cfg.max_order_sum != null) items.push(`Максимальная сумма заказа: ${cfg.max_order_sum}`);
      if (cfg.time_from && cfg.time_to) items.push(`Действует с ${cfg.time_from} до ${cfg.time_to}`);
      if (cfg.delivery_type) items.push(`Тип доставки: ${cfg.delivery_type}`);

      if (!items.length) {
        items.push('Подробные условия уточняйте у оператора.');
      }

      return [...new Set(items)];
    },
  },
};
</script>

<style lang="scss" scoped>
.page-promocode-detail.page-content {
  padding: 0;
  width: 100%;
  box-sizing: border-box;

  @media screen and (min-width: 768px) {
    max-width: 640px;
    margin: 0 auto;
    padding: 0 24px;
  }

  @media screen and (min-width: 1280px) {
    max-width: 720px;
    padding: 0 40px;
  }
}

.page-promocodes__header {
  padding: extClamp(16);
  border-bottom: 1px solid #E8E8E8;
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;

  .back__button {
    width: 24px;
    height: 24px;
    margin-right: auto;
    flex-shrink: 0;
  }

  h1 {
    font-size: extClamp(16);
    color: #292929;
    font-family: 'Wix Madefor Display', sans-serif;
    font-weight: 600;
    margin-right: auto;
    line-height: 1.25;
  }

  @media screen and (min-width: 768px) {
    padding: 20px 0;
    border-bottom-width: 1px;
  }

  @media screen and (min-width: 1280px) {
    display: none;
  }
}

.page-promocodes__middle {
  padding: 16px;
  width: 100%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  padding-bottom: 120px;

  @media screen and (min-width: 768px) {
    padding: 24px 0 96px;
  }

  @media screen and (min-width: 1280px) {
    padding: 32px 0 120px;
  }

  .promocode__image {
    height: extClamp(260);
    background-color: #F4ECFF;
    width: 100%;
    border-radius: extClamp(12);
    margin-bottom: 16px;
  }

  .promocode__text {
    display: flex;
    flex-direction: column;
    gap: 20px;

    @media screen and (min-width: 768px) {
      gap: 24px;
    }

    @media screen and (min-width: 1280px) {
      gap: 28px;
    }
  }

  .promocode__title {
    color: #9C7BCB;
    font-family: 'Wix Madefor Display', sans-serif;
    font-size: extClamp(22);
    font-weight: 600;
    display: flex;
    flex-direction: column;
    line-height: 1.2;

    @media screen and (min-width: 768px) {
      font-size: 26px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 32px;
    }

    .description-first {
      font-weight: 600;
    }

    .description-second {
      margin-top: 4px;

      @media screen and (min-width: 768px) {
        margin-top: 8px;
      }
    }
  }

  .promocode__code {
    font-family: 'Wix Madefor Display', sans-serif;
    font-size: extClamp(14);
    font-weight: 700;
    color: #343E59;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 18px;
    }
  }

  .promocode__conditions-title {
    color: #969696;
    font-size: extClamp(10);
    font-weight: 400;
    line-height: 140%;
    margin-bottom: 6px;

    @media screen and (min-width: 768px) {
      font-size: 12px;
      margin-bottom: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 13px;
    }
  }

  .promocode__conditions-item {
    color: #969696;
    font-size: extClamp(10);
    font-weight: 400;
    line-height: 150%;

    @media screen and (min-width: 768px) {
      font-size: 13px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      max-width: 62ch;
    }
  }

  .apply__button {
    width: 100%;
    max-width: extClamp(220);
    height: extClamp(40);
    border-radius: extClamp(8);
    display: flex;
    justify-content: center;
    align-items: center;
    color: #fff;
    font-size: extClamp(14);
    font-weight: 500;
    font-family: 'Wix Madefor Display', sans-serif;
    background-color: #993CA6;
    cursor: pointer;
  }
}

.page-promocode-detail__apply {
  margin-top: 24px;
  width: 100%;
  max-width: 100%;
  align-self: stretch;
  box-sizing: border-box;

  @media screen and (min-width: 768px) {
    margin-top: 32px;
  }

  @media screen and (min-width: 1280px) {
    margin-top: 40px;
  }
}
</style>
