<template>
  <div class="catalog-item-mods">
    <div
      :class="{'catalog-item-mods__inner--has-footer': modifier.length > 0 || canBuyWithoutMods}"
      class="catalog-item-mods__inner"
    >
      <div
        v-for="(group, idx) in modalComponentsData.groupModifiers"
        :key="group.modifierId + idx"
        class="catalog-item-mods__mods"
      >
        <CatalogItemModsOne
          v-if="group.minAmount === 1 && group.maxAmount === 1"
          v-model="modifier"
          :group="group"
          :title="subtitle"
        />
        <CatalogItemModsMany
          v-else
          v-model="modifier"
          :group="group"
          :title="subtitle"
        />
      </div>
    </div>
    <div
      v-if="modifier.length > 0 || canBuyWithoutMods"
      class="catalog-item-mods__footer"
    >
      <!--      <div class="catalog-item-mods__total">-->
      <!--        {{ totalPrice }} р-->
      <!--      </div>-->

      <BaseButton
        class="catalog-item-mods__add-to-cart"
        @click="addToCart(modalComponentsData.id)"
      >
        В корзину
      </BaseButton>
    </div>
  </div>
</template>
<script>

import BaseButton from '~/components/Base/BaseButton.vue';

export default {
  name: 'CatalogItemMods',
  components: { BaseButton },

  data() {
    return {
      modifier: [],
      modalComponentsData: null,
    };
  },
  computed: {
    canBuyWithoutMods() {
      for (const group of this.modalComponentsData.groupModifiers) {
        if (group.minAmount === 0) {
          return false;
        }
      }
      return false;
    },

    totalPrice() {
      const modsTotal = this.modifier.reduce((acc, el) => acc + (el.price * el.amount), 0);
      return this.modalComponentsData.price + modsTotal;
    },
    title() {
      let title = 'Выберите';

      if (this.modalComponentsData.id === 'ca399913-2128-4439-979b-ed7fe72ed665') {
        title = 'Выберите топпинг';
      } else if (this.modalComponentsData.parentGroup === '7d003f20-bacd-4aee-8c61-c395f3811bb2') {
        title = 'Выберите ролл';
      }
      if ([
        'dea6f077-c3ae-450b-871a-3ad0ca28769a',
        '0343ac10-13a9-4587-8fce-ad288ea7c476',
        'd2d50b10-7bb7-4c24-ab92-d1a0fafe02bd',
        'aa8cfd33-6884-4d60-9dec-a2b74d90e0fa',
      ].includes(this.modalComponentsData.id)) {
        title = 'Выберите подарок';
      }
      if (this.modalComponentsData.id === '0be71d02-ec86-430c-aa5c-0977a090e260') {
        title = 'Выберите пиццу в подарок';
      }

      return title;
    },
    subtitle() {
      let title = '';
      if (this.modalComponentsData.parentGroup === '7d003f20-bacd-4aee-8c61-c395f3811bb2'
        && !([
          'ca399913-2128-4439-979b-ed7fe72ed665',
          '0343ac10-13a9-4587-8fce-ad288ea7c476',
          'd2d50b10-7bb7-4c24-ab92-d1a0fafe02bd',
          'aa8cfd33-6884-4d60-9dec-a2b74d90e0fa',
        ].includes(this.modalComponentsData.id))) {
        title = 'За 1 рубль:';
      }
      return title;
    },
  },
  watch: {
    modalComponentsData() {
      this.modifier = [];
    },
  },
  created() {
    this.modalComponentsData = this.$store.state.modal.callback();
    this.$store.commit('modal/setModalTitle', this.title);
  },
  methods: {

    addToCart(productId) {
      const { isGift, isHidden, fromPromocode } = this.modalComponentsData;
      this.$store.dispatch(
        'cart/addItem',
        {
          productId,
          mods: this.modifier,
          isGift,
          isHidden,
          fromPromocode,
        },
      );

      this.$store.commit('modal/hideModal');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.catalog-item-mods {
  // .catalog-item-mods__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    // .catalog-item-mods__inner--has-footer
    &--has-footer {

    }
  }

  // .catalog-item-mods__mods
  &__mods {
  }

  // .catalog-item-mods__footer
  &__footer {
    position: sticky;
    z-index: 1;
    bottom: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: extClamp(12) 0 0 0;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      padding-top: 16px;
      border-radius: 200px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      bottom: 0;

    }

  }

  // .catalog-item-mods__total
  &__total {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    height: extClamp(35);
    padding: extClamp(10) extClamp(20);
    color: #993ca6;
    border: 1px solid #993ca6;
    border-radius: extClamp(200);

    @media screen and (min-width: 768px) {
      height: 62px;
      padding: 10px 20px;
      border-radius: 200px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .catalog-item-mods__add-to-cart
  &__add-to-cart {
    flex-grow: 1;
  }

  &::v-deep {
    @media screen and (min-width: 768px) {
      .popup-info__icon-wrapper {
        width: 40px;
        height: 40px;

      }
      .popup-info__icon {
        width: 24px;
        height: 24px;
      }
    }

    @media screen and (min-width: 1280px) {
      .popup-info__icon-wrapper {
        width: 30px;
        height: 30px;

      }
      .popup-info__icon {
        width: 18px;
        height: 18px;
      }
    }
  }
}

.modal__content--has-not-scroll .catalog-item-mods__footer {
  position: static;

}
</style>
