<template>
  <div class="delivery-selected">
    <div class="delivery-selected__inner">
      <div class="delivery-selected__type-select delivery-type-select">
        <div
          :class="{
            'delivery-type--active': $store.getters['cart/deliveryMethod'] === 'delivery'
          }"
          class="delivery-type-select__item delivery-type delivery-type--delivery"
          @click="setDeliveryDelivery"
        >
          <div class="delivery-type__image-wrapper">
            <svg class="delivery-type__image">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#delivery-bike" />
            </svg>
          </div>
          <div class="delivery-type__title">
            Курьером
          </div>
        </div>
        <div
          :class="{
            'delivery-type--active': $store.getters['cart/deliveryMethod'] === 'self'
          }"
          class="delivery-type-select__item delivery-type delivery-type--self"
          @click="setDeliverySelf"
        >
          <div class="delivery-type__image-wrapper">
            <svg class="delivery-type__image">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#delivery-shop" />
            </svg>
          </div>
          <div class="delivery-type__title">
            Самовывоз
          </div>
        </div>
      </div>
      <div
        v-if="!isAuth"
        class="delivery-selected__auth delivery-auth"
      >
        <div class="delivery-auth__title">
          Авторизуйтесь и мы станем еще удобнее
        </div>
        <BaseButton
          class="delivery-auth__btn"
          @click="$store.commit('modal/showAuthModal')"
        >
          Авторизация
        </BaseButton>
      </div>
      <div
        v-if="isAuth"
        class="delivery-selected__address-list"
      >
        <AppAddressList v-if="$store.getters['cart/deliveryMethod'] === 'delivery'" />
        <AppRestaurantList v-if="$store.getters['cart/deliveryMethod'] === 'self'" />
      </div>
    </div>
  </div>
</template>

<script>
import AppAddressList from '~/components/AppAddressList.vue';
import AppRestaurantList from '~/components/AppRestaurantList.vue';

export default {
  name: 'AppDeliverySelected',
  components: { AppRestaurantList, AppAddressList },
  props: {
    onSetDeliverySelf: {
      type: Function,
      default: () => {
      },
    },
    onSetDeliveryDelivery: {
      type: Function,
      default: () => {
      },
    },

  },
  computed: {
    isAuth() {
      return this.$store.getters['user/isAuth'];
    },
  },
  methods: {
    setDeliverySelf() {
      this.onSetDeliverySelf();
    },

    setDeliveryDelivery() {
      this.onSetDeliveryDelivery();
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.delivery-selected {
  margin-top: extClamp(6);

  @media screen and (min-width: 768px) {
    margin-top: 0;
  }

  @media screen and (min-width: 1280px) {

  }

  // .delivery-selected__inner
  &__inner {
  }

  // .delivery-selected__type-select
  &__type-select {
    display: flex;
    justify-content: center;

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .delivery-selected__auth
  &__auth {
    margin-top: extClamp(20);

    @media screen and (min-width: 768px) {
      margin-top: 30px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .delivery-selected__address-list
  &__address-list {
    width: 100%;
    max-width: extClamp(428);
    margin-top: extClamp(12);
    margin-right: auto;
    margin-left: auto;

    @media screen and (min-width: 768px) {
      max-width: none;
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}

.delivery-type-select {
  border: 1px solid #993ca6;
  border-radius: extClamp(200);

  // .delivery-type-select__item
  &__item {
    width: 50%;
  }
}

.delivery-type {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: extClamp(5) extClamp(10);
  cursor: pointer;
  color: #993ca6;
  border-radius: extClamp(200);
  gap: extClamp(4);

  @media screen and (min-width: 768px) {
    padding: 11px;
    border-right: 200px;
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .delivery-type--self
  &--self {

  }

  // .delivery-type--delivery
  &--delivery {

  }

  // .delivery-type--active
  &--active {
    color: #fff;
    background-color: #993ca6;

  }

  // .delivery-type__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 1;
    position: relative;
    top: extClamp(1);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      top: 1px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }

  }

  // .delivery-type__image-wrapper
  &__image-wrapper {

  }

  // .delivery-type__image
  &__image {
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }

  }
}

.delivery-auth {
  margin-right: extClamp(-10);
  margin-left: extClamp(-10);
  padding-top: extClamp(20);
  padding-right: extClamp(10);
  padding-left: extClamp(10);
  border-top: 1px solid #eef0f5;

  @media screen and (min-width: 768px) {
    margin-top: 20px;
    margin-left: 0;
    padding-top: 20px;
    padding-right: 10px;
    padding-left: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .delivery-auth__title
  &__title {
    font-size: extClamp(11);
    font-weight: 400;
    font-style: normal;
    line-height: 140%;
    text-align: center;
    color: #d0d0d0;

    @media screen and (min-width: 768px) {
      font-size: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .delivery-auth__btn
  &__btn {
    width: extClamp(257);
    margin: extClamp(15) auto extClamp(15);

    @media screen and (min-width: 768px) {
      width: 460px;
      margin: 30px auto 30px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
