<template>
  <div class="page-content">
    <div class="checkout-page">
      <div class="checkout-page__header-wrapper">
        <CheckoutHeader
          :is-close-button-hide="true"
          class="checkout-page__header"
          @click="onClose"
        >
          <template #title>
            Оформление заказа
          </template>
        </CheckoutHeader>
        <div
          class="checkout-page__back"
          @click="checkoutPageBackHandler"
        >
          <div class="checkout-page__back-icon-wrapper">
            <svg class="checkout-page__back-icon">
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#arrow-left-4" />
            </svg>
          </div>

          Вернуться назад
        </div>
      </div>

      <client-only>
        <div
          v-if="step === 'payment'"
          class="checkout-page__inner"
        >
          <div class="checkout-page__panel checkout-page__panel--address-footer">
            <CheckoutPanel class="checkout-address-user">
              <AppCheckoutAddress
                v-if="isDelivery"
                :can-edit="true"
                @edit="$store.commit('modal/showDeliveryModal');"
              >
                <template #title>
                  Доставка
                </template>
                {{ renderAddress($store.state.address.selectedAddress) }}
              </AppCheckoutAddress>
              <AppCheckoutAddress
                v-else
                :can-edit="true"
                @edit="$store.commit('modal/showDeliveryModal');"
              >
                <template #title>
                  Самовывоз
                </template>
                {{ $store.state.cart.selectedRestaurant?.address }}
              </AppCheckoutAddress>

              <div class="line" />

              <div class="checkout-user">
                <div class="checkout-user__icon-wrapper">
                  <svg class="checkout-user__icon">
                    <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#personal-account" />
                  </svg>
                </div>
                <div class="checkout-user__inner">
                  <template v-if="$store.getters['user/isAuth']">
                    <div class="checkout-user__name">
                      {{ $store.getters['user/userName'] }}
                    </div>
                    <div class="checkout-user__phone">
                      {{ $store.getters['user/userFormatPhone'] }}
                    </div>
                  </template>
                  <template v-else>
                    <div @click="$store.commit('modal/showAuthModal')">
                      Войти
                    </div>
                  </template>
                </div>
              </div>
            </CheckoutPanel>
            <footer class="checkout-page__footer checkout-footer">
              <div class="checkout-footer__inner">
                <BaseGradientButton
                  class="checkout-footer__button"
                  type="outline"
                  @click="onPayment"
                >
                  Продолжить
                </BaseGradientButton>
                <div class="checkout-footer__agree">
                  Нажимая на кнопку я даю согласие на обработку моих перс. данных в соответствии с
                  <NuxtLink to="/rule">
                    Условиями
                  </NuxtLink>
                </div>
              </div>
            </footer>
          </div>

          <CheckoutPanel class="checkout-page__panel">
            <template #title>
              Оплата
            </template>
            <div class="checkout-payment">
              <BaseRadio
                v-model="payment"
                class="checkout-payment__item checkout-payment__item--SBP"
                val="SBP"
              >
                <svg class="checkout-payment__item-icon">
                  <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#sbp" />
                </svg>
                СБП при получении
              </BaseRadio>
              <BaseRadio
                v-if="!isOnlinePaymentHide"
                v-model="payment"
                class="checkout-payment__item checkout-payment__item--ONL"
                val="ONL"
              >
                Онлайн
              </BaseRadio>
              <BaseRadio
                v-model="payment"
                class="checkout-payment__item checkout-payment__item--CARD"
                val="CARD"
              >
                {{ deliveryMethod === 'self' ? 'Банк картой' : 'Картой курьеру' }}
              </BaseRadio>
              <BaseRadio
                v-model="payment"
                class="checkout-payment__item checkout-payment__item--CASH"
                val="CASH"
              >
                Наличными
              </BaseRadio>
            </div>

            <div
              v-if="payment === 'CASH'"
              class="checkout-money"
            >
              <BaseInput
                v-model="money"
                placeholder="Сдача с"
                type="number"
                @input="onMoneyChange"
              />
              <div class="checkout-money__inner">
                <div
                  :class="{'checkout-money__item--active': money === '1000'}"
                  class="checkout-money__item"
                  @click="changeMoney('1000')"
                >
                  1000₽
                </div>
                <div
                  :class="{'checkout-money__item--active': money === '2000'}"
                  class="checkout-money__item"
                  @click="changeMoney('2000')"
                >
                  2000₽
                </div>
                <div
                  :class="{'checkout-money__item--active': money === '5000'}"
                  class="checkout-money__item"
                  @click="changeMoney('5000')"
                >
                  5000₽
                </div>
              </div>
            </div>
            <div class="line" />
            <div
              :class="{'checkout-comment--open': isCommentOpen}"
              class="checkout-comment"
            >
              <BaseTextarea
                v-model="comment"
                class="checkout-comment__field"
                placeholder="Комментарий к заказу"
                @focus="isCommentOpen = true"
              />

              <div
                class="checkout-comment__icon-wrapper"
                @click="isCommentOpen = !isCommentOpen"
              >
                <svg class="checkout-comment__icon">
                  <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#field-plus" />
                </svg>
              </div>
            </div>
          </CheckoutPanel>
        </div>
        <div
          v-if="step === 'sending'"
          class="checkout-page__inner"
        >
          <div class="checkout-page__panel checkout-page__panel--time-footer">
            <CheckoutPanel
              v-if="$store.getters['setting/CHECKOUT_DELIVERY_TEXT']"
              class="checkout-page__delivery-time-data"
            >
              <div class="delivery-time-data">
                <div
                  v-if="deliveryMethod === 'delivery'"
                  class="delivery-time-data__inner"
                >
                  <div
                    v-if="$store.getters['setting/CHECKOUT_DELIVERY_TEXT']?.delivery?.title"
                    class="delivery-time-data__title"
                  >
                    <div class="delivery-time-data__icon-wrapper">
                      <svg class="delivery-time-data__icon">
                        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#time" />
                      </svg>
                    </div>
                    {{ $store.getters['setting/CHECKOUT_DELIVERY_TEXT'].delivery.title }}
                  </div>
                  <div
                    v-if="$store.getters['setting/CHECKOUT_DELIVERY_TEXT']?.delivery?.text"
                    class="delivery-time-data__desc"
                  >
                    <svg class="delivery-time-data__icon-desc">
                      <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#field-plus" />
                    </svg>
                    {{ $store.getters['setting/CHECKOUT_DELIVERY_TEXT'].delivery.text }}
                  </div>
                </div>
                <div
                  v-if="deliveryMethod === 'self'"
                  class="delivery-time-data__inner"
                >
                  <div
                    v-if="$store.getters['setting/CHECKOUT_DELIVERY_TEXT']?.self?.title"
                    class="delivery-time-data__title"
                  >
                    <div class="delivery-time-data__icon-wrapper">
                      <svg class="delivery-time-data__icon">
                        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#time" />
                      </svg>
                    </div>
                    {{ $store.getters['setting/CHECKOUT_DELIVERY_TEXT'].self.title }}
                  </div>
                </div>
              </div>
            </CheckoutPanel>
            <footer class="checkout-page__footer checkout-footer">
              <div class="checkout-footer__inner">
                <BaseGradientButton
                  class="checkout-footer__button"
                  @click="onSending"
                >
                  Отправить
                </BaseGradientButton>
                <div class="checkout-footer__agree">
                  Нажимая на кнопку я даю согласие на обработку моих перс. данных в соответствии с
                  <NuxtLink to="/rule">
                    Условиями
                  </NuxtLink>
                </div>
              </div>
            </footer>
          </div>

          <div class="checkout-page__panel">
            <CheckoutPanel>
              <template #title>
                Получить
              </template>
              <div class="checkout-delivery">
                <BaseRadio
                  v-model="inTime"
                  :val="false"
                  class="checkout-payment__item"
                >
                  В ближайшее время
                </BaseRadio>
                <BaseRadio
                  v-if="!isSelectOrderTimeHide"
                  v-model="inTime"
                  :val="true"
                  class="checkout-payment__item"
                >
                  Ко времени
                </BaseRadio>
                <div
                  v-if="inTime && deliveryMethod === 'delivery'"
                  class="checkout-delivery__in-time-block in-time-block"
                  @click="showSelectionTime"
                >
                  <svg class="in-time-block__icon">
                    <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#time" />
                  </svg>
                  <div class="in-time-block__text">
                    <template v-if="toTimeString.length">
                      {{ toTimeString }}
                    </template>
                    <template v-else>
                      Выберите время
                    </template>
                  </div>
                  <svg class="in-time-block__edit">
                    <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#rounded-edit" />
                  </svg>
                </div>
                <div
                  v-if="inTime && deliveryMethod === 'self'"
                  class="checkout-comment"
                >
                  <BaseTextarea
                    v-model="timeStringIfSelfDelivery"
                    class="checkout-comment__field"
                    placeholder="Укажите время"
                  />

                  <div
                    class="checkout-comment__icon-wrapper"
                  >
                    <svg class="checkout-comment__icon">
                      <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#field-plus" />
                    </svg>
                  </div>
                </div>
              </div>
              <div class="line" />

              <div class="checkout-person">
                <div class="checkout-person__title">
                  Кол-во персон
                </div>
                <AppQty
                  :qty="personsCount"
                  class="checkout-person__qty"
                  type="medium"
                  @decrease="onPersonsCountDecrease"
                  @increase="onPersonsCountIncrease"
                />
              </div>
              <div class="line" />
              <div class="checkout-call">
                <div class="checkout-call__title">
                  Хотите мы позвоним?
                </div>
                <div class="checkout-call__inner">
                  <BaseRadio
                    v-model="needCall"
                    :val="false"
                    class="checkout-call__item"
                  >
                    Не перезванивать
                  </BaseRadio>
                  <BaseRadio
                    v-model="needCall"
                    :val="true"
                    class="checkout-call__item"
                  >
                    Потребуется звонок оператора
                  </BaseRadio>
                </div>
              </div>
            </CheckoutPanel>
          </div>
        </div>
      </client-only>
    </div>
  </div>
</template>

<script lang="ts">

import { checkWorkTime, renderAddress } from '~/lib/common';
import { yaSendOrderData } from '~/lib/yandexService';
import { IPaymentData, pay, SuccessCallback as PaymentSuccessCallback } from '~/modules/payment/payment.service';
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  name: 'PageCheckout',
  components: { BaseGradientButton },
  middleware: ['auth', 'cart-empty'],
  data() {
    return {
      // view
      step: 'payment',
      isCommentOpen: false,
      isCheckoutTimeDropdownBoxShown: false,

      // processing
      isFetching: false,

      //
      inTime: false,
      timeStringIfSelfDelivery: '',
      needCall: false,

      money: '',
      payment: 'SBP', // SBP, CASH, CARD, ONL
      personsCount: 1,
      toTime: '',
      comment: '',
      streets: [],

      restaurants: this.$store.getters['setting/RESTAURANT_LIST'],

      whenDeliver: 'in-time',
      agree: true,
      restaurantShow: false,
      cloudPaymentWidgetTimer: null,
    };
  },
  computed: {
    deliveryMethod() {
      return this.$store.state.cart.deliveryMethod;
    },
    spendBonus() {
      return this.$store.getters['cart/spendBonus'];
    },

    selectedAddress() {
      return this.$store.getters['address/selectedAddress'];
    },
    cartItems() {
      return this.$store.getters['cart/cartItems'];
    },
    cartTotal() {
      return this.$store.getters['cart/cartTotal'];
    },
    cartTotalAfterDiscounts() {
      return this.$store.getters['cart/cartTotalAfterDiscounts'];
    },
    zoneId() {
      if (this.deliveryMethod === 'self') {
        return null;
      }
      return this.selectedAddress.zoneId;
    },
    terminalId() {
      if (this.deliveryMethod === 'self') {
        return this.restaurant?.terminalId;
      }
      const zoneId = this.$store.getters['address/selectedAddress']?.zoneId;
      const zones = this.$store.getters['setting/ZONES_BY_CITY_ID'];
      const zone = zones.mapZones.find((z) => z.zoneId === zoneId);
      return zone?.terminalId;
    },
    isOnlinePaymentHide() {
      if (this.deliveryMethod === 'delivery') {
        if (this.$store.getters['setting/IS_DELIVERY_ONLINE_PAYMENT_DISABLE']) {
          return true;
        }
        if (!this.selectedAddress) {
          return true;
        }

        const zoneId = this.$store.getters['address/selectedAddress']?.zoneId;
        const zones = this.$store.getters['setting/ZONES_BY_CITY_ID'];
        const zone = zones.mapZones.find((z) => z.zoneId === zoneId);
        const restaurant = this.restaurants.find((r) => r.deliveryTerminalId === zone.terminalId);
        if (restaurant?.isOnlinePaymentHideDelivery) {
          return true;
        }
      }

      if (this.deliveryMethod === 'self') {
        if (this.$store.getters['setting/IS_SELF_ONLINE_PAYMENT_DISABLE']) {
          return true;
        }
        if (this.restaurant?.isOnlinePaymentHideSelf) {
          return true;
        }
      }

      return false;
    },
    filteredRestaurants() {
      return this.restaurants.filter((rest) => rest.isRestHide !== true);
    },
    isDelivery() {
      return this.$store.state.cart.deliveryMethod === 'delivery';
    },
    restaurant() {
      return this.$store.state.cart.selectedRestaurant;
    },
    toTimeString() {
      if (this.inTime && this.deliveryMethod === 'self') {
        return this.timeStringIfSelfDelivery;
      }
      return this.toTime ? `${this.toTime.formattedDate} с ${this.toTime.from} до ${this.toTime.to}` : '';
    },
    isSelectOrderTimeHide() {
      return this.$store.getters['city/isSelectOrderTimeHide'];
    },
  },
  watch: {
    inTime(newValue: boolean) {
      if (newValue && this.deliveryMethod === 'delivery') {
        this.showSelectionTime();
      }
    },
    isOnlinePaymentHide(newValue) {
      if (newValue) {
        this.payment = 'CARD';
      } else {
        this.payment = 'SBP';
      }
    },
    // Следим за изменением зоны и получаем время доставки
    zoneId: {
      handler(newZoneId) {
        if (newZoneId && this.deliveryMethod === 'delivery') {
          this.getDeliveryTimeForZone(newZoneId);
        } else {
          // Сбрасываем время зоны, используем общие настройки
          this.$store.commit('setting/setDeliveryTimeByZone', null);
        }
      },
      immediate: true,
    },
  },
  mounted() {
    if (document.getElementById('cloudpayments-script')) {
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://widget.cloudpayments.ru/bundles/cloudpayments.js';
    script.id = 'cloudpayments-script';
    document.head.appendChild(script);
  },
  beforeDestroy() {
    clearInterval(this.cloudPaymentWidgetTimer);
  },
  async created() {
    if (this.isOnlinePaymentHide) {
      this.payment = 'CARD';
    } else {
      this.payment = 'SBP';
    }

    this.$store.commit('view/hideBlockMobile', 'mobileBottomMenu');
    this.$store.commit('view/hideBlockDesktop', 'mobileBottomMenu');

    const workTime = checkWorkTime(this.$store.getters['setting/WORK_TIME']);
    if (workTime !== true) {
      this.$store.commit('modal/showWorkTimeModal', { workTime });
    }

    if (this.$store.getters['setting/IS_SITE_NOT_WORKING']) {
      this.$store.commit(
        'modal/showNotWorkModal',
        { TEXT_SITE_NOT_WORKING: this.$store.getters['setting/TEXT_SITE_NOT_WORKING'] },
        { root: true },
      );
    }

    this.user = { ...this.$store.getters['user/user'] };

    try {
      this.isFetching = true;
      const res = await this.$axios.get(`${this.$config.FRONT_API_URL}/api/v1/cladr`);
      this.streets = res.data;
    } catch (e) {
      console.log(e);
    } finally {
      this.isFetching = false;
    }

    await this.$store.dispatch('cart/processCart');
  },

  methods: {
    onPayment() {
      this.step = 'sending';
    },

    onClose() {
      if (this.step === 'sending') {
        this.step = 'payment';
      } else {
        this.$router.push('/cart');
      }
    },
    changeMoney(money) {
      this.money = money;
    },
    onPersonsCountDecrease() {
      if (this.personsCount === 1) {
        return;
      }
      this.personsCount -= 1;
    },
    onPersonsCountIncrease() {
      this.personsCount += 1;
    },
    async getDeliveryTimeForZone(zoneId) {
      try {
        await this.$store.dispatch('setting/getDeliveryTimeByZone', zoneId);
      } catch (error) {
        console.error('Ошибка получения времени доставки для зоны:', error);
      }
    },
    createComment() {
      const comment = [];

      comment.push(this.needCall ? 'Потребуется звонок оператора' : 'Не перезванивать');

      if (this.comment.trim()) {
        comment.push(this.comment.trim());
      }

      if (this.deliveryMethod === 'self' && this.restaurant?.address) {
        comment.push(`Ресторан: ${this.restaurant.address}`);
      }

      if (this.payment === 'MCARD') {
        comment.push('Заказ оплачен картой онлайн');
      }

      const toTime = (!this.inTime)
        ? 'Доставить в ближайшее время.'
        : `Доставить ко времени: ${this.toTimeString}.`;
      comment.push(toTime);

      if (this.deliveryMethod !== 'self' && this.selectedAddress.isPrivateHouse) {
        comment.push('Частный дом');
      }

      if (this.spendBonus) {
        comment.push(`Клиент оплатил бонусами: ${this.spendBonus}`);
      }

      if (this.$store.getters['cart/appliedCoupon']?.length) {
        comment.push(`Клиент ввел промокод: ${this.$store.getters['cart/appliedCoupon']}`);
      }

      if (this.payment === 'CASH' && this.money > 0) {
        const money = `Нужна сдача с ${this.money}.`;
        comment.push(money);
      }

      return comment.filter(Boolean).join('\n');
    },

    checkOrderRequiredUserFields() {
      return !(!this.user?.name?.trim() || !this.user?.phone?.trim());
    },

    deleteAddress(id) {
      this.$store.dispatch('address/deleteAddress', id);
    },
    renderAddress(address) {
      return renderAddress(address);
    },

    checkOrderMinSum() {
      const minSum = 590;
      if (this.deliveryMethod !== 'self' && this.cartTotal < minSum) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: `Минимальная сумма заказа ${minSum} рублей`,
        });
        return false;
      }
      return true;
    },

    async onSending() {
      if (!navigator.onLine) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Заказ не отправлен. Нет соединения с интернетом. Пожалуйста, проверьте своё соединение. ',
        });
        return;
      }

      if (this.isFetching) {
        return;
      }
      const workTime = checkWorkTime(this.$store.getters['setting/WORK_TIME']);
      if (workTime !== true) {
        this.$store.commit('modal/showWorkTimeModal', { workTime });
        return;
      }

      if (this.$store.getters['setting/IS_SITE_NOT_WORKING']) {
        this.$store.commit(
          'modal/showNotWorkModal',
          { TEXT_SITE_NOT_WORKING: this.$store.getters['setting/TEXT_SITE_NOT_WORKING'] },
          { root: true },
        );
        return;
      }

      const canCreateOrder = await this.checkCreateOrder();

      if (!canCreateOrder) {
        return;
      }

      if (!this.user.id) {
        await this.$store.dispatch('user/auth', { phone: this.user.phone });
      }

      const comment = this.createComment();

      let deliveryDateTime;
      if (this.inTime && !this.toTime.isToday && this.deliveryMethod === 'delivery') {
        deliveryDateTime = this.toTime.date;
        deliveryDateTime.setHours(Number.parseInt(this.toTime.from, 10));
      }

      const orderData = {
        user: this.user,
        coupon: this.$store.getters['cart/appliedCoupon'],
        spendBonus: this.spendBonus,
        order: {
          payment: this.payment,
          delivery: this.deliveryMethod,
          deliveryDateTime,
          comment,
          personsCount: this.personsCount,
          basket: this.cartItems,
          total: this.cartTotalAfterDiscounts,
          zoneId: this.zoneId,
          terminalId: this.terminalId,
          isSelfService: this.deliveryMethod === 'self',
          addressId: this.deliveryMethod !== 'self' ? this.selectedAddress?.id : null,
        },
        analytics: {
          roistat_visit: this.$cookies.get('roistat_visit'),
        },
      };
      try {
        this.isFetching = true;
        const { data } = await this.$axios.post(`${this.$config.FRONT_API_URL}/api/v1/order`, orderData);

        if (data?.isOrderCreated) {
          const onAfterSuccessOrder = async () => {
            await this.$store.dispatch('user/setUser', this.user);
            yaSendOrderData(orderData.order);
            this.$store.commit('cart/setSpendBonus', 0);
            await this.$store.dispatch('cart/setItems', []);
            await this.$store.dispatch('cart/setAppliedCoupon', '');
            await this.$store.dispatch('cart/setDiscountTotal', 0);
            await this.$router.push('/complete');
          };

          if (this.payment === 'ONL') {
            const zoneDate = this.restaurants.find((r) => r.terminalId === this.terminalId);
            const paymentData: IPaymentData = {
              amount: orderData.order.total,
              firstName: orderData.user.name,
              invoiceId: data.orderId,
              phone: orderData.user.phone,
              publicId: zoneDate.cloudPaymentsPublicId,
            };
            const paymentSuccessCallback: PaymentSuccessCallback = async () => {
              await onAfterSuccessOrder();
            };
            const paymentFailCallback: PaymentSuccessCallback = async () => {
              await this.$router.push('/complete-error');
            };

            this.reSetCssVars();

            pay(paymentData, paymentSuccessCallback, paymentFailCallback);
          } else {
            await onAfterSuccessOrder();
          }
        } else {
          await this.$router.push('/complete-error');
        }
      } catch (e) {
        this.isFetching = false;
        if (e?.response?.data?.data?.code === 'WRONG_CART') {
          this.$store.dispatch('cart/validateCart');
        } else if (e?.response?.data?.data?.code === 'PROMO_TIME_RESTRICTION') {
          // Ошибка ограничения по времени промокода
          const errorMessage = e?.response?.data?.data?.message || 'Промокод не может быть использован для заказа с выбранным временем доставки.';
          this.$notify({
            group: 'messages',
            type: 'error',
            text: errorMessage,
          });
          // Удаляем промокод из корзины, так как он не может быть применен
          await this.$store.dispatch('cart/setAppliedCoupon', '');
        } else {
          this.$notify({
            group: 'messages',
            type: 'error',
            text: 'Возникла проблема при создании заказа. Попробуйте еще раз или свяжитесь с администратором.',
          });
        }
      } finally {
        this.isFetching = false;
      }
    },

    async checkCreateOrder() {
      try {
        if (!this.checkOrderRequiredUserFields()) {
          this.$notify({
            group: 'messages',
            type: 'error',
            text: 'Имя и телефон обязательны!',
          });
          return false;
        }
        if (!this.checkOrderMinSum()) {
          return false;
        }
        if (this.deliveryMethod === 'self') {
          if (!this.restaurant || !this.restaurant.terminalId) {
            this.$notify({
              group: 'messages',
              type: 'error',
              text: 'Выберите ресторан!',
            });
            return false;
          }
        } else if (!this.selectedAddress) {
          this.$notify({
            group: 'messages',
            type: 'error',
            text: 'Добавьте адрес доставки.',
          });
          return false;
        }
        return true;
      } catch (e) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Возникла проблема при создании заказа. Попробуйте еще раз или свяжитесь с администратором.',
        });

        this.isFetching = false;
        return false;
      }
    },

    showSelectionTime() {
      const setTime = (time) => this.toTime = time;
      this.$store.commit(
        'modal/showTimeModal',
        { callback: setTime.bind(this), selectedTime: this.toTime },
      );
    },
    onMoneyChange(money) {
      const tempMoney = Number.parseInt(money, 10);

      this.money = Number.isNaN(tempMoney) ? '' : String(tempMoney);
    },
    reSetCssVars() {
      // платежный виджет как то портит переменные, поэтому переустановим их
      const safeAreaInsetTop = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-top');
      const safeAreaInsetRight = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-right');
      const safeAreaInsetBottom = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-bottom');
      const safeAreaInsetLeft = getComputedStyle(document.documentElement).getPropertyValue('--safe-area-inset-left');

      let safeAreaInsetTopValue = parseInt(safeAreaInsetTop, 10);
      let safeAreaInsetRightValue = parseInt(safeAreaInsetRight, 10);
      let safeAreaInsetBottomValue = parseInt(safeAreaInsetBottom, 10);
      let safeAreaInsetLeftValue = parseInt(safeAreaInsetLeft, 10);

      safeAreaInsetTopValue = Number.isNaN(safeAreaInsetTopValue) ? 0 : safeAreaInsetTopValue;
      safeAreaInsetRightValue = Number.isNaN(safeAreaInsetRightValue) ? 0 : safeAreaInsetRightValue;
      safeAreaInsetBottomValue = Number.isNaN(safeAreaInsetBottomValue) ? 0 : safeAreaInsetBottomValue;
      safeAreaInsetLeftValue = Number.isNaN(safeAreaInsetLeftValue) ? 0 : safeAreaInsetLeftValue;

      this.cloudPaymentWidgetTimer = setInterval(() => {
        document.documentElement.style.setProperty('--safe-area-inset-top', `${safeAreaInsetTopValue}px`);
        document.documentElement.style.setProperty('--safe-area-inset-right', `${safeAreaInsetRightValue}px`);
        document.documentElement.style.setProperty('--safe-area-inset-bottom', `${safeAreaInsetBottomValue}px`);
        document.documentElement.style.setProperty('--safe-area-inset-left', `${safeAreaInsetLeftValue}px`);
      }, 500);
    },
    checkoutPageBackHandler() {
      if (this.step === 'sending') {
        this.step = 'payment';
      } else {
        this.$router.push('/cart');
      }
    },
  },

};
</script>

<style lang="scss"
       scoped
>
.checkout-page {
  display: flex;
  flex-direction: column;
  padding-bottom: extClamp(20);

  @media screen and (min-width: 768px) {

    padding-bottom: 0;
  }

  @media screen and (min-width: 1280px) {
    padding-top: 0;
  }

  // .checkout-page__back
  &__back {
    font-size: 14px;
    font-weight: 400;
    line-height: 140%;
    display: none;
    align-items: center;
    cursor: pointer;
    gap: 10px;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      font-style: normal;
      line-height: 120%;
      display: flex;
    }
  }

  // .checkout-page__back-icon-wrapper
  &__back-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    padding: 4px;
    border-radius: 50%;
    background: var(---Extra-LightGray, #e8e8e8);
    gap: 10px;

    @media screen and (min-width: 768px) {
      width: 30px;
      height: 30px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .checkout-page__back-icon
  &__back-icon {
    width: 24px;
    height: 24px;
    color: #969696;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      width: 18px;
      height: 18px;
    }
  }

  // .checkout-page__header-wrapper
  &__header-wrapper {
    padding-bottom: extClamp(16);
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      padding-bottom: 40px;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      padding-bottom: 24px;
    }
  }

  // .checkout-page__inner
  &__inner {
    display: flex;
    flex-direction: column;
    padding-bottom: extClamp(91);
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      padding-bottom: 160px;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      align-items: flex-start;
      flex-direction: row-reverse;
      gap: 36px;

    }

  }

  // .checkout-page__header
  &__header {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;

  }

  // .checkout-page__panel
  &__panel {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      max-width: calc(50% - 12px);
    }

    // .checkout-page__panel--address-footer
    &--address-footer {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        display: flex;
        flex-direction: column;
        max-width: calc(50% - 12px);

        gap: 24px;
      }
    }

    // .checkout-page__panel--time-footer
    &--time-footer {
      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        display: flex;
        flex-direction: column;
        width: 100%;
        gap: 24px;
      }
    }

  }

  // .checkout-page__checkout-address-user
  &__checkout-address-user {

  }

  // .checkout-page__delivery-time-data
  &__delivery-time-data {

  }

  // .checkout-page__footer
  &__footer {
    position: fixed;
    z-index: 2;
    right: 0;
    bottom: max(var(--safe-area-inset-bottom), extClamp(20));
    left: 0;

    @media screen and (min-width: 768px) {
      bottom: max(var(--safe-area-inset-bottom), 20px);
    }

    @media screen and (min-width: 1280px) {
      position: static;
    }
  }

}

.checkout-user {
  font-size: extClamp(12);
  font-weight: 400;
  font-style: normal;
  line-height: 140%;
  display: flex;
  align-items: center;
  flex-shrink: 0;
  color: #d0d0d0;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    font-size: 18px;
    line-height: normal;
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {
    font-size: 16px;
    gap: 8px;
  }

  // .checkout-user__icon-wrapper
  &__icon-wrapper {

  }

  // .checkout-user__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }

  // .checkout-user__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    flex-shrink: 0;
    justify-content: center;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 10px;
    }
  }

  // .checkout-user__name
  &__name {
    font-size: extClamp(10);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: 100%;

    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 120%;
    }
  }

  // .checkout-user__phone
  &__phone {
    font-size: extClamp(10);
    font-weight: 400;
    line-height: 120%;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.checkout-payment {
  display: flex;
  flex-direction: column;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .checkout-payment__item
  &__item {

    &::v-deep .base-radio__name {
      display: flex;
      align-items: center;
      gap: extClamp(6);

      @media screen and (min-width: 768px) {
        gap: 8px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    &::v-deep > label {

    }

    // .checkout-payment__item--ONL
    &--ONL::v-deep {
      .base-radio__input:checked ~ .base-radio__icon-wrapper {

      }
    }

    // .checkout-payment__item--CARD
    &--CARD::v-deep {
      .base-radio__input:checked ~ .base-radio__icon-wrapper {

      }
    }

    // .checkout-payment__item--CASH
    &--CASH::v-deep {
      .base-radio__input:checked ~ .base-radio__icon-wrapper {

      }
    }
  }

  // .checkout-payment__item-icon
  &__item-icon {
    width: extClamp(13);
    height: extClamp(16);
    @media screen and (min-width: 768px) {
      width: 15px;
      height: 18px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.checkout-money {
  position: relative;

  // .checkout-money__inner
  &__inner {
    position: absolute;
    z-index: 1;
    top: extClamp(8);
    right: extClamp(8);
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: flex-end;
    width: extClamp(147);
    margin-left: auto;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      top: 9px;
      right: 9px;
      width: auto;
      gap: 4px;

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .checkout-money__item
  &__item {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 84%;
    display: flex;
    padding: extClamp(8) extClamp(12);
    cursor: pointer;
    text-align: center;
    white-space: nowrap;
    color: #fff;
    border: 1px solid var(---Main-Purple, #993ca6);
    border-radius: extClamp(6);
    background-color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      padding: 10px 15px;
      border-radius: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      font-weight: 500;
      font-style: normal;
      line-height: 100%;
    }

    // .checkout-money__item--active
    &--active {

      color: var(---Main-Purple, #993ca6);
      background-color: #fff;

    }

  }

  &::v-deep .base-input__input {
    @media screen and (min-width: 768px) {
      font-size: 16px;
      height: 52px;
      min-height: 52px;
      padding: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

.checkout-comment {
  position: relative;

  &::v-deep(.base-textarea__input) {
    height: extClamp(42);
    padding-right: extClamp(30px);

    @media screen and (min-width: 768px) {
      height: 58px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .checkout-comment--open
  &--open {
    &::v-deep(.base-textarea__input) {
      height: extClamp(156);

      @media screen and (min-width: 768px) {
        height: 156px;
      }

      @media screen and (min-width: 1280px) {

      }
    }
  }

  // .checkout-comment__title
  &__title {

  }

  // .checkout-comment__field
  &__field {

  }

  // .checkout-comment__icon-wrapper
  &__icon-wrapper {
    position: absolute;
    top: extClamp(14);
    right: extClamp(16);
    cursor: pointer;

    @media screen and (min-width: 768px) {
      top: 20px;
      right: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .checkout-comment__icon
  &__icon {
    width: extClamp(14);
    height: extClamp(14);

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {
      width: 18px;
      height: 18px;
    }
  }
}

.delivery-time-data {
  display: flex;
  align-items: flex-start;
  gap: extClamp(16);

  @media screen and (min-width: 768px) {
    align-items: center;
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .delivery-time-data__icon-wrapper
  &__icon-wrapper {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .delivery-time-data__icon
  &__icon {
    width: extClamp(24);
    height: extClamp(24);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 25px;
      height: 25px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .delivery-time-data__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .delivery-time-data__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    display: flex;
    align-items: center;
    color: var(---Main-Black, #292929);
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      gap: 24px;

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .delivery-time-data__desc
  &__desc {
    font-size: extClamp(11);
    font-weight: 400;
    line-height: 140%;
    display: flex;
    align-items: center;
    color: #d0d0d0;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      line-height: 120%;
      color: var(---Main-Black, #292929);
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .delivery-time-data__icon-desc
  &__icon-desc {
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

.checkout-delivery {
  display: flex;
  flex-direction: column;
  flex-wrap: wrap;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .checkout-delivery__in-time-block
  &__in-time-block {

  }

}

.checkout-footer {
  padding-right: extClamp(10);
  padding-left: extClamp(10);

  @media screen and (min-width: 768px) {
    padding-right: 20px;
    padding-left: 20px;
  }

  @media screen and (min-width: 1280px) {
    padding: 16px;
    border-radius: 8px;
    background: #f6f6f6;
    gap: 8px;
  }

  // .checkout-footer__inner
  &__inner {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    gap: extClamp(8);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .checkout-footer__button
  &__button {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .checkout-footer__agree
  &__agree {
    font-size: extClamp(9);
    font-weight: 400;
    line-height: 120%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 12px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      font-weight: 400;
      line-height: 120%;
    }

    > a {
      color: #993ca6
    }

  }
}

.checkout-person {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: extClamp(39);

  @media screen and (min-width: 768px) {
    height: auto;
  }

  @media screen and (min-width: 1280px) {

  }

  // .checkout-person__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: 100%;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .checkout-person__qty
  &__qty {
  }
}

.checkout-call {
  display: flex;
  flex-direction: column;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .checkout-call__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .checkout-call__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .checkout-call__item
  &__item {
    &::v-deep > label {
      font-weight: 300;
    }
  }
}

.in-time-block {
  font-size: extClamp(10);
  font-weight: 400;
  font-style: normal;
  line-height: 120%;
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(---Main-Black, #292929);
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    font-size: 16px;

    gap: 8px;

  }

  @media screen and (min-width: 1280px) {
    font-size: 12px;
  }

  // .in-time-block__icon
  &__icon {
    width: extClamp(18);
    height: extClamp(18);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 25px;
      height: 25px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }

  // .in-time-block__text
  &__text {
    font-weight: 300;
  }

  // .in-time-block__edit
  &__edit {
    width: extClamp(24);
    height: extClamp(24);
    margin-left: auto;
    cursor: pointer;
    color: #ccc;

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }
}

.checkout-page-steps {
  display: flex;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {

  }

}
</style>
