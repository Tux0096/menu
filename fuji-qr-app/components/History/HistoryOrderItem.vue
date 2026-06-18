<template>
  <div
    class="history-order-item"
  >
    <div class="history-order-item__title">
      <div class="history-order-item__number">
        Заказ №{{ historyOrderItem.number }}
      </div>
      <div class="history-order-item__date">
        {{ historyOrderItem.createdAt }}
      </div>
    </div>
    <div class="history-order-item__line" />
    <div class="history-order-item__inner">
      <div
        v-for="(item, idx) in historyOrderItem.items"
        :key="item.id + 'name' + idx"
        class="history-order-item__product history-order-item-product"
      >
        <div class="history-order-item-product__inner">
          <div class="history-order-item-product__name">
            {{ item.name }}
            <div class="history-order-item-product__mods">
              <div
                v-for="mod in item.modifiers"
                :key="mod.id"
                class="history-order-item-product__mods"
              >
                {{ mod.name }} x {{ mod.amount }} шт.
              </div>
            </div>
          </div>
          <div class="history-order-item-product__qty">
            {{ item.amount }} шт.
          </div>

          <div class="history-order-item-product__actions">
            <template v-if="item.isAction" />
            <AddToCartButton
              v-else-if="isExist(item.id) "
              @click="onBuyButtonClick(item)"
            />
            <div
              v-else
              class="history-order-item-product__not-exist"
            >
              Нет в наличии
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="history-order-item__line" />
    <div class="history-order-item__footer">
      <div class="history-order-item__total">
        {{ historyOrderItem.sum }} ₽
      </div>
      <div
        :class="`history-order-item__status--${status?.key?.toLowerCase()}`"
        class="history-order-item__status"
      >
        {{ status.value }}
      </div>
    </div>
  </div>
</template>

<script>
import { mapGetters } from 'vuex';
import AddToCartButton from '~/components/Catalog/AddToCartButton.vue';

export default {
  name: 'HistoryOrderItem',
  components: { AddToCartButton },
  props: {
    historyOrderItem: {
      type: Object,
      required: true,
    },
  },
  computed: {

    status() {
      return this.historyOrderItem?.frontendStatus;
    },
    ...mapGetters({
      CUSTOM_ADD_TO_CART_GROUPS_ID: 'setting/CUSTOM_ADD_TO_CART_GROUPS_ID',
    }),
  },
  methods: {
    isExist(id) {
      return this.$store.getters['catalog/productById'](id);
    },
    onBuyButtonClick(item) {
      const productId = item.id;
      const currentProductData = this.$store.getters['catalog/productById'](productId);
      this.$store.commit('modal/showCatalogDetailItem', { product: currentProductData });
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.history-order-item {
  display: flex;
  flex-direction: column;
  padding: extClamp(18) extClamp(12);
  border-radius: extClamp(8);
  background: var(---Secondary-FooterLightGray, #f6f6f6);
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    padding: 24px 16px;
    border-radius: 8px;
    gap: 16px
  }

  @media screen and (min-width: 1280px) {

  }

  // .history-order-item__line
  &__line {
    flex-shrink: 0;
    width: 100%;
    height: 1px;
    background: var(---Primary-Gray, #969696);

  }

  // .history-order-item__title
  &__title {
    font-size: 12px;
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    display: flex;
    justify-content: space-between;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .history-order-item__number
  &__number {

  }

  // .history-order-item__date
  &__date {
    font-weight: 500;
    color: var(---Primary-Gray, #969696);
  }

  // .history-order-item__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      gap: 40px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .history-order-item__product
  &__product {
  }

  // .history-order-item__footer
  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;

  }

  // .history-order-item__total
  &__total {
    font-size: extClamp(14);
    font-weight: 600;
    line-height: 100%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .history-order-item__status
  &__status {
    font-size: extClamp(10);

    font-weight: 500;
    font-style: normal;
    line-height: 120%;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(150);
    padding: extClamp(10) extClamp(20);
    color: var(---Extra-SpicyRed, #ff003d);
    border-radius: extClamp(16);
    background: var(---Primary-LightPurple, #f5ecf6);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      width: auto;
      padding: 10px 20px;
      border-radius: 16px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }

    // .history-order-item__status--closed
    &--closed {
      color: #d0d0d0;
      background-color: #f0f0f0;
    }

  }
}

.history-order-item-product {

  // .history-order-item-product__inner
  &__inner {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .history-order-item-product__name
  &__name {
    font-size: extClamp(12);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    display: flex;
    flex-direction: column;
    color: var(---Main-Black, #292929);
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .history-order-item-product__mods
  &__mods {
    font-size: extClamp(9);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    display: flex;
    flex-direction: column;
    color: var(---Main-Black, #292929);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 12px;
      gap: 5px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .history-order-item-product__qty
  &__qty {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 100%;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 14px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .history-order-item-product__actions
  &__actions {
    position: absolute;
    right: 0;
    bottom: 0;
  }

  // .history-order-item-product__not-exist
  &__not-exist {
    font-size: extClamp(11);
    font-weight: 400;
    font-style: normal;
    line-height: 140%;
    display: flex;
    align-items: center;
    justify-content: center;
    height: extClamp(24);
    padding: extClamp(4) extClamp(10);
    color: #d0d0d0;
    border-radius: extClamp(200);
    background-color: #f0f0f0;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      font-size: 12px;
      height: initial;
      padding: 10px 20px;
      border-radius: 200px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
