<template>
  <div class="calling">
    <div
      v-if="courierPhone"
      class="calling__item calling-item"
    >
      <div class="calling-item__title">
        Связаться с курьером:
      </div>
      <a
        :href="'tel:' + courierPhone"
        class="calling-item__phone-wrapper"
      >
        <svg class="calling-item__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#filled-phone" />
        </svg>

        {{ formatPhoneNumber(courierPhone) }}
      </a>
    </div>

    <div class="calling__item calling-item">
      <div class="calling-item__title">
        Служба доставки:
      </div>
      <a
        :href="'tel:' + phoneDeliveryService"
        class="calling-item__phone-wrapper"
      >
        <svg class="calling-item__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#filled-phone" />
        </svg>

        {{ phoneDeliveryService }}
      </a>
    </div>

    <div class="calling__socials calling-socials">
      <a
        class="calling-socials__item calling-social"
        href="https://wa.me/79277164107"
        target="_blank"
      >
        <svg class="calling-social__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#whatsapp" />
        </svg>
      </a>
      <a
        class="calling-socials__item calling-social"
        href="https://t.me/okkFuji_bot"
        target="_blank"
      >
        <svg class="calling-social__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#telegram" />
        </svg>
      </a>
      <a
        class="calling-socials__item calling-social"
        href="viber://pa?chatURI=okkFuji"
        target="_blank"
      >
        <svg class="calling-social__icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#viber" />
        </svg>
      </a>
    </div>
  </div>
</template>

<script>
import { formatPhoneNumber } from '../lib/common.js';

export default {
  computed: {
    phoneDeliveryService() {
      return this.$store.getters['setting/phoneDeliveryService'];
    },
    courierPhone() {
      const activeOrder = this.$store.getters['order/activeOrder'];
      return activeOrder?.delivery?.courierInfo?.phone || null;
    },
  },
  methods: { formatPhoneNumber },
};
</script>

<style lang="scss"
       scoped
>
.calling {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: extClamp(24);

  @media screen and (min-width: 768px) {
    padding-bottom: 0;
    gap: 32px;
  }

  @media screen and (min-width: 1280px) {
    gap: 32px;
  }

  // .calling__item
  &__item {

  }

  // .calling__socials
  &__socials {
  }
}

.calling-item {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .calling-item__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 100%;
      text-align: center;
      font-feature-settings: 'liga' off, 'clig' off;
    }
  }

  // .calling-item__phone-wrapper
  &__phone-wrapper {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: extClamp(8) extClamp(12);
    text-align: center;
    color: var(---Main-Black, #292929);
    border-radius: 200px;
    background: var(---Primary-LightPurple, #f5ecf6);
    font-feature-settings: 'clig' off, 'liga' off;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: 100%;
      padding: 10px 16px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 100%;
      gap: 10px;
    }
  }

  // .calling-item__icon
  &__icon {
    width: extClamp(24);
    height: extClamp(24);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 30px;
      height: 30px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }
}

.calling-socials {
  display: flex;
  align-items: flex-start;
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .calling-socials__item
  &__item {
  }
}

.calling-social {
  // .calling-social__icon
  &__icon {
    width: extClamp(28);
    height: extClamp(28);

    @media screen and (min-width: 768px) {
      width: 42px;
      height: 42px;
    }

    @media screen and (min-width: 1280px) {
      width: 42px;
      height: 42px;
    }
  }
}
</style>
