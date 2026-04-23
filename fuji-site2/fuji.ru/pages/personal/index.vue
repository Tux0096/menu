<template>
  <client-only>
    <div class="page-content">
      <div class="page-personal">
        <div class="page-personal__header">
          <div
            class="page-personal__user-info no-user-user-info"
          >
            <svg
              class="no-user-user-info__icon"
              @click="$router.push('/')"
            >
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#return-back" />
            </svg>
            Личный кабинет
            <div class="no-user-user-info__stub" />
          </div>
        </div>
        <div class="page-personal__middle">
          <div
            class="page-personal__city city"
            @click="showCityModal"
          >
            <svg class="city__location-icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#address" />
            </svg>
            {{ $store.getters['city/cityName'] || 'Выберите город' }}
            <svg class="city__icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#arrow-down" />
            </svg>
          </div>
          <div class="auth-info-wrapper">
            <div
              v-if="isAuth"
              class="page-personal__user-info user-info"
            >
              <div class="user-info__detail">
                <div
                  class="user-info__name"
                >
                  Привет, {{ $store.getters['user/userName'] }}
                </div>
                <div class="user-info__phone">
                  {{ $store.getters['user/userFormatPhone'] }}
                </div>
              </div>
              <div
                class="user-info__exit edit-btn"
                @click="showUserEditForm"
              >
                <div class="edit-btn__icon-wrapper">
                  <svg
                    :class="{'edit-btn__icon--needToCompleteUserInfo': needToCompleteUserInfo}"
                    class="edit-btn__icon"
                  >
                    <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#personal-edit" />
                  </svg>

                  <svg
                    v-if="needToCompleteUserInfo"
                    class="edit-btn__icon-warn"
                  >
                    <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#personal-edit-warn" />
                  </svg>
                </div>
              </div>
            </div>
            <div
              v-if="isAuth && needToCompleteUserInfo"
              class="page-personal__notification user-notification"
              @click="showUserEditForm"
            >
              <div class="user-notification__icon-wrapper">
                <svg class="user-notification__icon">
                  <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#warn" />
                </svg>
              </div>
              <div class="user-notification__text">
                Необходимо дополнить ваши персональные данные
              </div>
            </div>
          </div>
          <div
            v-if="!isAuth"
            class="page-personal__auth auth-info"
            @click="$store.commit('modal/showAuthModal')"
          >
            <div class="auth-info__text">
              Авторизуйтесь и мы станем еще удобнее
            </div>
            <BaseGradientButton
              class="auth-info__btn"
            >
              Авторизоваться
            </BaseGradientButton>
          </div>
          <!--          TODO: включить когда будет готов ремаркет-->
          <div
            v-if="isAuth && false"
            class="page-personal__promotions promotions"
          >
            <NuxtLink
              class="promotions__item promotions-item"
              to="/personal/promotions"
            >
              <div class="promotions-item__title">
                Актуальные акции
              </div>
              <div class="promotions-item__footer">
                <div class="promotions-item__count">
                  {{ activePromocodesCount }}
                </div>
                {{ activePromocodesCountText }}
              </div>
            </NuxtLink>
          </div>

          <div
            v-if="isAuth"
            class="page-personal__menu menu"
          >
            <div class="menu__inner">
              <NuxtLink
                v-if="currentOrderStatus"
                class="menu__item menu-item"
                to="/personal/history"
              >
                <img
                  alt=""
                  class="menu-item__icon"
                  src="~/assets/images/icons/svg/order-status.svg"
                >
                <div class="menu-item__title">
                  Заказ №{{ currentOrder.delivery.number }}
                </div>
                <div class="menu-item__footer">
                  {{ currentOrderStatus }}
                </div>
              </NuxtLink>
              <NuxtLink
                class="menu__item menu-item"
                to="/personal/history"
              >
                <img
                  alt=""
                  class="menu-item__icon"
                  src="~/assets/images/icons/svg/order-history.svg"
                >
                <div class="menu-item__title">
                  История заказов
                </div>
                <div class="menu-item__footer">
                  {{ historyTitle }}
                </div>
              </NuxtLink>

              <NuxtLink
                class="menu__item menu-item"
                to="/personal/favorite"
              >
                <img
                  alt=""
                  class="menu-item__icon"
                  src="~/assets/images/icons/svg/favorite.svg"
                >
                <div class="menu-item__title">
                  Любимые блюда
                </div>
                <div class="menu-item__footer">
                  {{ favoriteTitle }}
                </div>
              </NuxtLink>
              <NuxtLink
                class="menu__item menu-item"
                to="/personal/address"
              >
                <img
                  alt=""
                  class="menu-item__icon"
                  src="~/assets/images/icons/svg/address.svg"
                >
                <div class="menu-item__title">
                  Адрес доставки
                </div>
                <div class="menu-item__footer">
                  {{ addressTitle }}
                </div>
              </NuxtLink>
              <div
                class="menu__item menu-item"
                @click="onAllergenClick"
              >
                <img
                  alt=""
                  class="menu-item__icon"
                  src="~/assets/images/icons/svg/allergen.svg"
                >
                <div class="menu-item__title">
                  Аллергены
                </div>
                <div class="menu-item__footer">
                  {{ allergensTitle }}
                </div>
              </div>
              <div style="flex-shrink: 0; width: 10px;" />
            </div>
          </div>
        </div>
        <div
          class="page-personal__footer page-personal-footer"
        >
          <!--        <div-->
          <!--          v-if="isAuth"-->
          <!--          class="page-personal-footer__header"-->
          <!--        >-->
          <!--          Персональные предложения:-->
          <!--        </div>-->
          <!--        <div-->
          <!--          v-if="isAuth"-->
          <!--          class="page-personal-footer__promo page-personal-promo"-->
          <!--        >-->
          <!--          <img-->
          <!--            alt=""-->
          <!--            class="page-personal-promo__img"-->
          <!--            src=""-->
          <!--          >-->

          <!--          <div class="page-personal-promo__inner">-->
          <!--            <div class="page-personal-promo__title">-->
          <!--              Ролл за 1 рубль-->
          <!--            </div>-->
          <!--            <div class="page-personal-promo__text">-->
          <!--              *узнайте подробнее условия акции-->
          <!--            </div>-->
          <!--            <BaseButton class="page-personal-promo__btn">-->
          <!--              Узнать подробнее-->
          <!--            </BaseButton>-->
          <!--          </div>-->
          <!--        </div>-->

          <div
            v-if="personalPagePromo?.image"
            class="page-personal-footer__header"
          >
            Персональные предложения:
          </div>
          <div
            v-if=" personalPagePromo?.image"
            class="page-personal-footer__promo page-personal-promo"
          >
            <NuxtLink
              :to="personalPagePromo.link"
              class="page-personal-promo__link"
            >
              <img
                :src="personalPagePromo.image"
                alt=""
                class="page-personal-promo__img"
              >
            </NuxtLink>
          </div>

          <div class="page-personal-footer__socials socials">
            <a
              :href="$store.getters['city/cityData']?.social?.vk"
              class="socials__item"
              rel="nofollow noopener"
              target="_blank"
            > VK
              <svg class="socials__item-icon">
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#personal-vk" />
              </svg>
            </a>

            <a
              class="socials__item"
              href="https://t.me/fujisamara"
              rel="nofollow noopener"
              target="_blank"
            > Telegram
              <svg class="socials__item-icon">
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#personal-tg" />
              </svg>
            </a>
          </div>
          <div class="page-personal-footer__menu personal-footer-menu">
            <NuxtLink
              class="personal-footer-menu__item"
              to="/delivery"
            >
              Доставка
            </NuxtLink>
            <NuxtLink
              class="personal-footer-menu__item"
              to="/restaurant"
            >
              Рестораны
            </NuxtLink>
            <NuxtLink
              class="personal-footer-menu__item"
              to="/about"
            >
              О компании
            </NuxtLink>
            <NuxtLink
              class="personal-footer-menu__item"
              to="/vacancies"
            >
              Вакансии
            </NuxtLink>
            <AppExternalLink
              class="personal-footer-menu__item"
              href="https://fujifranchise.ru"
            >
              Франшиза
            </AppExternalLink>
            <div
              class="personal-footer-menu__item personal-footer-menu__item--exit"
              @click="logout"
            >
              Выйти
              <svg class="exit-btn__icon">
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#exit" />
              </svg>
            </div>
            <div
              class="personal-footer-menu__item personal-footer-menu__item--delete"
              @click="deleteUser"
            >
              Удалить аккаунт
            </div>
          </div>
        </div>
      </div>
    </div>
  </client-only>
</template>

<script>

import { pluralize, renderAddress } from '~/lib/common';

export default {
  name: 'PagePersonal',

  data() {
    return {
      favorite: [],

    };
  },
  async fetch() {
    const user = this.$store.getters['user/user'];
    if (!user.phone) {
      return;
    }
    this.favorite = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/user/${user.id}/like`);

    await this.$store.dispatch('order/loadActiveOrder');
    await this.$store.dispatch('promo/fetchPromocodes');
  },
  computed: {
    addresses() {
      return this.$store.state.address.addresses;
    },
    selectedAddressId() {
      return this.$store.state.address.selectedAddress?.id;
    },
    isAuth() {
      return this.$store.getters['user/isAuth'];
    },
    historyTitle() {
      const history = this.$store.getters['user/userHistory'];
      const historyCount = history?.length || 0;
      return `${historyCount} ${pluralize(historyCount, 'заказ', 'заказа', 'заказов')}`;
    },
    favoriteTitle() {
      const favoriteCount = this.favorite?.length || 0;
      return `${favoriteCount} ${pluralize(favoriteCount, 'блюдо', 'блюда', 'блюд')}`;
    },
    allergensTitle() {
      const allergenCount = this.$store.state.user.userAllergens.length || 0;
      return `${allergenCount} ${pluralize(allergenCount, 'аллерген', 'аллергена', 'аллергенов')}`;
    },
    addressTitle() {
      const address = this.$store.state.address.addresses;
      const addressCount = address?.length || 0;
      return `${addressCount} ${pluralize(addressCount, 'адрес', 'адреса', 'адресов')}`;
    },
    personalPagePromo() {
      return this.$store.state.setting.settings.PERSONAL_PAGE_PROMO;
    },
    currentOrder() {
      return this.$store.getters['order/activeOrder'];
    },
    currentOrderStatus() {
      if (!this.currentOrder) return '';

      const status = this.$store.getters['order/currentDeliveryStatus'];

      const statusTexts = {
        Unconfirmed: null,
        WaitCooking: 'Принят',
        ReadyForCooking: 'Готовим',
        CookingStarted: 'Готовим',
        CookingCompleted: 'Приготовлен',
        Waiting: 'В пути',
        OnWay: 'В пути',
        OnWayCourier: 'В пути',
        CourierNearby: 'В пути',
        Delivered: 'Доставлен',
        Closed: null,
        Cancelled: null,
      };

      return statusTexts[status];
    },

    activePromocodesCountText() {
      return pluralize(this.activePromocodesCount, 'активен', 'активны', 'активны');
    },
    activePromocodesCount() {
      return this.$store.getters['promo/activePromocodesCount'];
    },
    needToCompleteUserInfo() {
      const user = this.$store.getters['user/user'];
      return !user.name || !user.email || !user.birthday;
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
    showCityModal() {
      this.$store.commit('modal/showCityModal');
    },
    showUserEditForm() {
      this.$store.commit('modal/showUserEditForm');
    },
    deleteUser() {
      const modalConfirmPayload = {
        title: 'Удалить учетную запись?',
        confirmCallback: async () => {
          await this.$store.dispatch('user/deleteUser');
          this.$notify({
            group: 'messages',
            type: 'error',
            text: 'Аккаунт успешно удален!',
          });
          this.$store.commit('modal/hideModal');
        },
        confirmBtnTitle: 'Удалить',
        cancelCallback: () => this.$store.commit('modal/hideModal'),
        cancelBtnTitle: 'Отменить',
      };
      this.$store.commit('modal/showConfirm', modalConfirmPayload);
    },
    onAllergenClick() {
      this.$store.commit('modal/showAllergensSelector');
    },
  },
};
</script>

<style lang="scss"
       scoped
>

.page-personal {
  display: flex;
  flex-wrap: wrap;
  margin-right: extClampNegative(16);
  margin-left: extClampNegative(16);
  padding-top: extClamp(20);
  padding-right: extClamp(16);
  padding-left: extClamp(16);
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    flex-direction: column;
    height: 100%;
    margin-right: -24px;
    margin-left: -24px;
    padding-top: extClamp(23);
    padding-right: 24px;
    padding-left: 24px;
    gap: 40px;
  }

  @media screen and (min-width: 1280px) {
    display: block;
    margin-right: 0;
    margin-left: 0;
    padding: 0;
    gap: 36px;
  }

  // .page-personal__header
  &__header {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: space-between;
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .page-personal__user-info
  &__user-info {
  }

  // .page-personal__middle
  &__middle {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 18px;
    }

    @media screen and (min-width: 1280px) {
      gap: 24px;
    }
  }

  // .page-personal__auth
  &__auth {
  }

  // .page-personal__promotions
  &__promotions {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      flex-direction: column;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-personal__city-time
  &__city-time {
  }

  // .page-personal__menu
  &__menu {

    @media screen and (min-width: 768px) {
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-personal__footer
  &__footer {

    @media screen and (min-width: 768px) {
      margin-top: auto;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 36px;
    }
  }
}

.user-info {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    align-items: flex-start;
    justify-content: flex-start;
    gap: 10px;
  }

  // .user-info__detail
  &__detail {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      gap: 12px;
    }
  }

  // .user-info__name
  &__name {
    font-size: extClamp(20);
    font-weight: 600;
    font-style: normal;
    line-height: 100%;
    display: flex;
    width: 100%;
    color: var(---Main-White, #fff);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 32px;
      line-height: 100%;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 600;
      line-height: 100%;
      font-feature-settings: 'liga' off, 'clig' off;
    }
  }

  // .user-info__phone
  &__phone {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    opacity: 0.6;
    color: var(---Main-White, #fff);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: 120%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 400;
      font-style: normal;
      line-height: 140%;
      color: var(---Main-White, #fff);
    }
  }

  // .user-info__exit
  &__exit {
  }
}

.edit-btn {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  justify-content: space-between;
  cursor: pointer;
  color: #fff;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    position: relative;
    top: 6px;
    width: 24px;
    height: 24px;
  }

  // .edit-btn__icon-wrapper
  &__icon-wrapper {
    position: relative;
    color: #993ca6;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .edit-btn__icon
  &__icon {
    flex-shrink: 0;
    width: extClamp(20);
    height: extClamp(20);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 30px;
      height: 30px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }

    // .edit-btn__icon--needToCompleteUserInfo
    &--needToCompleteUserInfo {
      color: #ba9576;

    }
  }

  // .edit-btn__icon-warn
  &__icon-warn {
    position: absolute;
    top: extClamp(-6);
    right: extClamp(-6);
    width: extClamp(12);
    height: extClamp(12);

    @media screen and (min-width: 768px) {
      top: -7px;
      right: -7px;
      width: 14px;
      height: 14px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

}

.no-user-user-info {
  font-size: extClamp(16);
  font-weight: 600;
  font-style: normal;
  line-height: 100%; /* 16px */
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: center;
  color: var(---Main-White, #fff);
  font-feature-settings: 'liga' off, 'clig' off;

  @media screen and (min-width: 768px) {
    font-size: 24px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .no-user-user-info__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .no-user-user-info__stub
  &__stub {
    width: extClamp(18);
    height: extClamp(18);

    @media screen and (min-width: 768px) {
      width: 40px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.auth-info-wrapper {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 100%;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    flex-direction: row;

  }
}

.auth-info {
  display: flex;
  align-items: center;
  flex-direction: column;
  width: 100%;
  padding: extClamp(18) extClamp(12) extClamp(12) extClamp(12);
  border-radius: extClamp(8);
  background: var(---Main-White, #fff);
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    padding: 30px 20px;
    border-radius: 20px;
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .auth-info__text
  &__text {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      max-width: none;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .auth-info__btn
  &__btn {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.city {
  font-size: extClamp(16);
  font-weight: 500;
  font-style: normal;
  line-height: 120%;
  display: flex;
  align-items: center;
  width: 100%;
  cursor: pointer;
  color: var(---Main-White, #fff);
  gap: extClamp(4);

  @media screen and (min-width: 768px) {
    font-size: 24px;
    line-height: 100%;
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {
    font-size: 20px;
    font-weight: 600;
    gap: 4px;

  }

  // .city__location-icon
  &__location-icon {
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .city__icon
  &__icon {
    width: extClamp(14);
    height: extClamp(14);

    @media screen and (min-width: 768px) {
      width: 18px;
      height: 18px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.line {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 1px;
  background-color: #f0f0f0;

}

.work-time {
  display: flex;
  align-items: center;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .work-time___icon
  &___icon {
    width: extClamp(24);
    height: extClamp(24);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .work-time__inner
  &__inner {
  }

  // .work-time__item
  &__item {
    font-size: extClamp(11);
    font-weight: 400;
    font-style: normal;
    line-height: 140%;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 11px;
    }

    @media screen and (min-width: 1280px) {

    }

    &::v-deep b {
      color: #993ca6;
    }
  }
}

.menu {
  overflow: auto;
  width: extClamp(320);
  margin-right: extClampNegative(16);
  margin-left: extClampNegative(16);
  -ms-overflow-style: none;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }

  @media screen and (min-width: 768px) {
    width: 100%;
    margin: 0;
  }

  @media screen and (min-width: 1280px) {

  }

  // .menu__inner
  &__inner {
    display: flex;
    width: auto;
    padding-right: extClamp(16);
    padding-left: extClamp(16);
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      padding: 0;
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .menu__item
  &__item {
  }
}

.menu-item {
  font-size: extClamp(12);
  font-weight: 600;
  line-height: 120%;
  position: relative;
  display: flex;
  overflow: hidden;
  align-items: flex-start;
  flex-direction: column;
  flex-grow: 1;
  flex-shrink: 0;
  width: extClamp(92);
  height: extClamp(103);
  padding: extClamp(10);
  cursor: pointer;
  color: var(---Main-Black, #292929);
  border-radius: extClamp(10);
  background: var(---Main-White, #fff);
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    font-size: 16px;
    font-weight: 600;
    font-style: normal;
    line-height: normal;
    width: calc(100% / 4 - extClamp(60) / 4);
    height: 164px;
    padding: 16px 8px;
    border-radius: 8px;
  }

  @media screen and (min-width: 1280px) {
    font-size: 16px;
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    height: 140px;

    padding: 16px;
    border-radius: 8px;

  }

  // .menu-item__icon
  &__icon {
    position: absolute;
    right: extClampNegative(21);
    bottom: extClampNegative(23);
    width: extClamp(90);
    max-width: none;
    height: extClamp(90);
    max-height: none;
    transform: rotate(-30deg);
    opacity: 0.2;

    @media screen and (min-width: 768px) {
      right: -25px;
      bottom: -20px;
      width: 90px;
      height: 90px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .menu-item__title
  &__title {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .menu-item__footer
  &__footer {
    margin-top: auto;
    color: #993ca6;
  }

  // .menu-item--status
  &--status {
    border: 1px solid #993ca6;

    .menu-item__footer {
      font-weight: 600;
      color: #993ca6;
    }
  }

  // .menu-item__icon--status
  &__icon--status {
    position: absolute;
    right: extClampNegative(21);
    bottom: extClampNegative(23);
    width: extClamp(90);
    height: extClamp(90);
    transform: rotate(-30deg);
    opacity: 0.3;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      right: -25px;
      bottom: -20px;
      width: 90px;
      height: 90px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.page-personal-footer {
  flex-grow: 1;
  margin-right: extClampNegative(16);
  margin-left: extClampNegative(16);
  padding: extClamp(12) extClamp(8) calc(extClamp(98) + var(--safe-area-inset-bottom));
  border-radius: extClamp(10) extClamp(10) 0 0;
  background: #fff;

  @media screen and (min-width: 768px) {
    $margin: calc((100vw - 728px) / 2);
    flex-grow: 0;
    margin-right: calc($margin * -1);
    margin-left: calc($margin * -1);
    padding: 32px 24px calc(110px + var(--safe-area-inset-bottom));
    border-radius: 20px 20px 0 0;

  }

  @media screen and (min-width: 1280px) {
    $margin: calc((100vw - 100% - 1px) / 2);
    margin-right: calc($margin * -1);
    margin-bottom: 0;
    margin-left: calc($margin * -1);
    padding: 36px $margin 48px;
    border-radius: 24px 24px 0 0;
  }

  // .page-personal-footer__header
  &__header {
    font-size: extClamp(16);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    margin-bottom: extClamp(12);
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 32px;
      line-height: 100%;
      max-width: none;
      margin-bottom: 32px;
      text-align: left;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 600;
      line-height: 100%;
      margin-right: 0;
      margin-bottom: 24px;
      margin-left: 0;
      font-feature-settings: 'liga' off, 'clig' off;
    }
  }

  // .page-personal-footer__promo
  &__promo {
    margin-bottom: extClamp(14);

    @media screen and (min-width: 768px) {
      margin-bottom: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-personal-footer__socials
  &__socials.socials {
    margin-bottom: extClamp(22);

    @media screen and (min-width: 768px) {
      margin-bottom: 40px;
    }

    @media screen and (min-width: 1280px) {
      display: none;
      width: auto;
      margin-right: 24px;
      margin-left: 24px;
    }
  }

  // .page-personal-footer__menu
  &__menu {
    margin-top: 24px;
  }
}

.page-personal-promo {
  position: relative;
  overflow: hidden;

  @media screen and (min-width: 768px) {
    border-radius: 20px;
  }

  @media screen and (min-width: 1280px) {
    display: flex;
    margin: 0;
    padding: 0;
    gap: 28px;
  }

  // .page-personal-promo__inner
  &__inner {
    max-width: extClamp(170);
  }

  // .page-personal-promo__link
  &__link {
    display: block;
    overflow: hidden;
    border-radius: extClamp(16);

    @media screen and (min-width: 768px) {
      border-radius: 16px;
    }

    @media screen and (min-width: 1280px) {
      width: calc(100% / 2 - 14px);
    };
  }

  // .page-personal-promo__img
  &__img {
    width: 100%;
  }

  // .page-personal-promo__title
  &__title {
    font-size: extClamp(16);
    font-weight: 500;
    font-style: normal;
    line-height: normal;
    color: #292929;
  }

  // .page-personal-promo__text
  &__text {
    font-size: extClamp(11);
    font-weight: 400;
    font-style: normal;
    line-height: 140%;
    margin-top: extClamp(10);
    opacity: 0.6;
    color: #292929;
  }

  // .page-personal-promo__btn
  &__btn {
    margin-top: extClamp(20);
  }
}

.socials {
  display: flex;
  width: 100%;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .socials__item
  &__item {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    display: flex;
    align-items: center;
    flex: 1 0 0;
    justify-content: center;
    padding: extClamp(10) extClamp(20);
    text-align: center;
    color: var(---Main-Black, #292929);
    border-radius: extClamp(12);
    background: var(---Primary-LightPurple, #f5ecf6);
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
      display: flex;
      align-items: center;
      flex: 1 0 0;
      justify-content: center;
      padding: 24px 28px;
      color: var(---Main-Black, #292929);
      gap: 12px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .socials__item-icon
  &__item-icon {
    width: extClamp(18);
    height: extClamp(18);

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.personal-footer-menu {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: extClamp(18);

  @media screen and (min-width: 768px) {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 24px 20px;

  }

  @media screen and (min-width: 1280px) {
    justify-content: space-between;
    width: 100%;
    gap: initial;
  }

  // .personal-footer-menu__item
  &__item {

    font-size: extClamp(16);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 24px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
      text-decoration: none;

      &:hover {
        text-decoration: underline;
      }
    }

    // .personal-footer-menu__item--exit
    &--exit {
      display: flex;
      align-items: center;
      color: #993ca6;
      gap: extClamp(4);

      @media screen and (min-width: 768px) {
        gap: 4px;
      }

      @media screen and (min-width: 1280px) {

      }

      > svg {
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

    // .personal-footer-menu__item--delete
    &--delete {
      color: var(---Primary-Gray, #969696);
    }
  }
}

.promotions-item {
  display: flex;
  align-items: baseline;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
  max-width: extClamp(356);
  padding: extClamp(16);
  border-radius: extClamp(8);
  background: #f4ecff;
  gap: extClamp(24px);

  @media screen and (min-width: 768px) {
    width: 100%;
    max-width: calc(50% - 4px);
    padding: 16px;
    border-radius: 8px;
    gap: 18px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .promotions-item__title
  &__title {
    font-size: extClamp(17);
    font-weight: 500;
    line-height: 100%;
    color: #343e59;

    @media screen and (min-width: 768px) {
      font-size: 17px;
      max-width: 130px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .promotions-item__count
  &__count {
    font-size: extClamp(32);
    line-height: 81%;

    @media screen and (min-width: 768px) {
      font-size: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // ..promotions-item__footer
  &__footer {
    font-size: extClamp(16);
    font-weight: 500;
    line-height: 100%;
    display: flex;
    align-items: flex-end;
    opacity: 0.5;
    color: #343e59;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      opacity: 1;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.user-notification {
  display: flex;
  align-items: center;
  width: 100%;
  padding: extClamp(8) extClamp(16);
  cursor: pointer;

  border-radius: extClamp(8);
  background: #fef6e9;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    padding: 8px 16px;
    border-radius: 8px;
  }

  @media screen and (min-width: 1280px) {
    justify-content: space-between;
    width: auto;
    padding: 8px 16px;
    border-radius: 8px;
  }

  // .user-notification__icon-wrapper
  &__icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(16);
    height: extClamp(16);

    @media screen and (min-width: 768px) {
      width: 16px;
      height: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .user-notification__text
  &__text {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 120%;
    flex: 1;
    color: #ba9576;

    @media screen and (min-width: 768px) {
      font-size: 14px;

    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      white-space: nowrap;

    }
  }

  // .user-notification__edit-icon-wrapper
  &__edit-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);

    @media screen and (min-width: 768px) {
      width: 28px;
      height: 28px;
    }

    @media screen and (min-width: 1280px) {
      width: 28px;
      height: 28px;
    }
  }

  // .user-notification__icon
  &__icon {
    width: 100%;
    height: 100%;
    color: #f59e0b;
  }

  // .user-notification__edit-icon
  &__edit-icon {
    width: 100%;
    height: 100%;
    color: #993ca6;
  }
}

</style>
