<template>
  <div class="page-content">
    <div class="page-address">
      <div class="page-address__content">
        <client-only>
          <div
            v-if="addresses.length"
            class="page-address__addresses address-list"
          >
            <div class="page-address__addresses-inner">
              <AppCheckoutAddress
                v-for="address in addresses"
                :key="address.id"
                :can-delete="true"
                :is-active="selectedAddressId === address.id"
                class="page-address__address"
                @click="select(address)"
                @delete="$store.dispatch('address/deleteAddress', address.id);"
              >
                <template #title>
                  Доставка
                </template>
                {{ renderAddress(address) }}
              </AppCheckoutAddress>
            </div>

            <div class="page-address__footer">
              <BaseButton
                class="page-address__add-new-address"
                @click="addNewAddress"
              >
                Добавить адрес
              </BaseButton>
            </div>
          </div>
          <PersonalEmptyPage
            v-else
            :bnt-callback="addNewAddress"
            class="page-favorite__empty"
          >
            <template #button-text>
              Добавить новый адрес
            </template>
            <template #icon>
              <lord-icon
                :src="`/assets/libs/icon-json/track-order.json`"
                class="page-address__empty-icon"
                trigger="loop"
              />
            </template>
          </PersonalEmptyPage>
        </client-only>
      </div>
    </div>
  </div>
</template>

<script>

import { renderAddress } from '~/lib/common';

export default {
  name: 'PageAddress',
  data() {
    return {
      restaurants: this.$store.getters['setting/RESTAURANT_LIST'],
    };
  },
  computed: {
    addresses() {
      return this.$store.state.address.addresses;
    },
    selectedAddressId() {
      return this.$store.state.address.selectedAddress?.id;
    },
  },
  methods: {
    renderAddress,
    select(address) {
      this.$store.dispatch('address/setSelectedAddress', address);
    },
    logout() {
      this.$store.dispatch('user/logoutUser');
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
.page-address {
  display: flex;
  flex-direction: column;
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    gap: 40px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .page-address__content
  &__content {
    display: inline-flex;
    flex-direction: column;
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-address__addresses
  &__addresses {

  }

  // .page-address__addresses-inner
  &__addresses-inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      flex-direction: row;
      flex-wrap: wrap;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-address__address
  &__address {
    padding: extClamp(10);
    border-radius: extClamp(10);
    background: #f6f6f6;

    @media screen and (min-width: 768px) {
      width: 100%;
      padding: 12px 10px;
      border-radius: 8px;

    }

    @media screen and (min-width: 1280px) {
      width: calc(100% / 3 - 40px / 3);
      padding: 12px 10px;
      border-radius: 8px;
    }
  }

  // .page-address__add-new-address
  &__add-new-address.button {
    width: 100%;
    color: var(---Main-Purple, #993ca6);
    border-color: var(---Primary-LightPurple, #f5ecf6);
    background: var(---Primary-LightPurple, #f5ecf6);

    @media screen and (min-width: 768px) {
      padding: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-address__empty-icon
  &__empty-icon {
    width: extClamp(50);
    height: extClamp(50);
    margin-top: extClamp(60);

    @media screen and (min-width: 768px) {
      width: 100px;
      height: 100px;
      margin-top: 60px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-address__footer
  &__footer {
    margin-top: extClamp(18);

    @media screen and (min-width: 768px) {
      margin-top: 24px;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 36px;
    }
  }

}

</style>
