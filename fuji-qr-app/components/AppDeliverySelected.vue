<template>
  <div class="delivery-selected">
    <div class="delivery-selected__inner">
      <div class="delivery-selected__type-select delivery-type-select">
        <div
          class="delivery-type-select__item delivery-type delivery-type--delivery"
          @click="setDeliveryDelivery"
        >
          <div class="delivery-type__title">
            Доставка
          </div>
          <div class="delivery-type__image-wrapper">
            <lord-icon
              :src="`/assets/libs/icon-json/scooter.json`"
              class="delivery-type__image"
              trigger="loop"
            />
          </div>
        </div>
        <div
          class="delivery-type-select__item delivery-type delivery-type--self"
          @click="setDeliverySelf"
        >
          <div class="delivery-type__title">
            Самовывоз
          </div>
          <div class="delivery-type__image-wrapper">
            <lord-icon
              :src="`/assets/libs/icon-json/shop.json`"
              class="delivery-type__image"
              trigger="loop"
            />
          </div>
        </div>
      </div>
      <div
        v-if="isAuth"
        class="delivery-selected__address-list"
      >
        <AppAddressList />
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AppDeliverySelected',
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
    gap: extClamp(12);

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
    margin-top: extClamp(24);
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
  // .delivery-type-select__item
  &__item {
  }
}

.delivery-type {
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: flex-start;
  flex-direction: column;
  flex-grow: 1;
  height: extClamp(76);
  padding: extClamp(10);
  cursor: pointer;
  border-radius: extClamp(8);
  background: var(---Primary-LightPurple, #f5ecf6);
  background-repeat: no-repeat;

  @media screen and (min-width: 768px) {
    height: 100px;
    padding: 8px 16px;
    border-radius: 8px;
  }

  @media screen and (min-width: 1280px) {
    padding: 8px 16px;
    border-radius: 8px;
  }

  // .delivery-type--self
  &--self {

  }

  // .delivery-type--delivery
  &--delivery {

  }

  // .delivery-type__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }

  }

  // .delivery-type__image-wrapper
  &__image-wrapper {
    position: absolute;
    right: extClamp(-20);
    bottom: extClamp(-40);
    transform: rotate(-30deg);
    color: #993ca6;
  }

  // .delivery-type__image
  &__image {
    width: extClamp(110);
    height: extClamp(110);
    opacity: 0.5;

    @media screen and (min-width: 768px) {
      width: extClamp(90);
      height: extClamp(90);
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
