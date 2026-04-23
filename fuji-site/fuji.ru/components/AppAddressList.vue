<template>
  <div

    class="address-list"
  >
    <div

      class="address-list__title"
    >
      Мои адреса:
    </div>

    <div

      class="address-list__inner"
    >
      <BaseAddressItem
        v-for="address in addresses"
        :key="address.id"
        :is-active="selectedAddressId === address.id"
        class="address-list__item"
        start-icon-name="delivery-item-icon"
        @click="select(address)"
      >
        {{ renderAddress(address) }}
      </BaseAddressItem>
      <BaseButton
        class="address-list__add-new-address"
        @click="addNewAddress"
      >
        Добавить новый адрес
      </BaseButton>
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
    addNewAddress() {
      this.$store.commit('modal/showAddressModal', 'Address');
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
    height: extClamp(223);
    margin-right: extClampNegative(12);
    margin-left: extClampNegative(12);
    padding-right: extClamp(12);
    padding-bottom: extClamp(30);
    padding-left: extClamp(12);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      padding-bottom: 0;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
    }
  }

  // .address-list__item
  &__item {
    cursor: pointer;
  }

  // .address-list__add-new-address
  &__add-new-address.button {
    width: 100%;
    margin-top: extClamp(8);
    color: var(---Main-Purple, #993ca6);
    border-color: var(---Primary-LightPurple, #f5ecf6);
    background: var(---Primary-LightPurple, #f5ecf6);

    @media screen and (min-width: 768px) {
      margin-top: 8px;
    }

    @media screen and (min-width: 1280px) {
    }
  }
}

</style>
