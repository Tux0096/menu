<template>
  <div
    v-if="addresses.length"
    class="address-list"
  >
    <div class="address-list__title">
      Мои адреса:
    </div>

    <div class="address-list__inner">
      <BaseAddressItem
        v-for="address in addresses"
        :key="address.id"
        :is-active="selectedAddressId === address.id"
        class="address-list__item"
        @click="select(address)"
      >
        {{ renderAddress(address) }}
      </BaseAddressItem>
    </div>
  </div>
</template>

<script>

import { renderAddress } from '../lib/common';

export default {
  name: 'AppAddressList',
  data() {
    return {
      restaurants: this.$store.getters['setting/RESTAURANT_LIST'],
    };
  },
  computed: {
    addresses() {
      return this.$store.getters['address/addressesByCity'];
    },
    selectedAddressId() {
      return this.$store.state.address.selectedAddress?.id;
    },
  },
  methods: {
    renderAddress,
    select(address) {
      this.$store.dispatch('address/setSelectedAddress', address);
      this.$store.dispatch('cart/setDeliveryMethod', 'delivery');
      this.$store.commit('modal/hideModal');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.address-list {

  // .address-list__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    margin-bottom: extClamp(10);
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      margin-bottom: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 120%;
      margin-bottom: 16px;
    }
  }

  // .address-list__inner
  &__inner {
    display: flex;
    overflow: auto;
    flex-direction: column;
    max-height: extClamp(230);
    margin-right: extClampNegative(12);
    margin-left: extClampNegative(12);
    padding-right: extClamp(12);
    padding-left: extClamp(12);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      max-height: 232px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
    }
  }

  // .address-list__item
  &__item {
    cursor: pointer;
  }
}

</style>
