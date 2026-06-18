<template>
  <div class="page-content">
    <div class="complete-error-page">
      <CheckoutHeader
        :is-back-button-hide="false"
        :is-close-button-hide="true"
        class="complete-error-page__header"
        @click="onClose"
      >
        <template #title>
          Благодарим за Ваш выбор!
        </template>
      </CheckoutHeader>

      <div class="complete-error-page__inner">
        <div class="complete-error-page__complete-error complete-error">
          <div class="complete-error__header">
            <div class="complete-error__icon-wrapper">
              <lord-icon
                :src="`/assets/libs/icon-json/wrong.json`"
                class="complete-error__icon"
                delay="1000000"
                trigger="loop"
              />
            </div>
            <div class="complete-error__text">
              <div class="complete-error__title">
                Платеж не прошел
              </div>
              <div class="complete-error__message">
                Перейдите в корзину, повторите заказ и&nbsp;выберите другой тип оплаты. Или свяжитесь с нашим оператором
                по телефону
                <br><b>8800-2222-000</b>
              </div>
            </div>
          </div>
        </div>

        <footer class="complete-error-page__footer complete-error-footer">
          <div class="complete-error-footer__inner">
            <div class="complete-error-footer__buttons">
              <BaseButton
                class="complete-error-footer__home"
                @click="$router.push('/')"
              >
                Вернуться на главную
              </BaseButton>
            </div>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PagecompleteError',

  data() {
    return {};
  },
  head() {
    return {

      bodyAttrs: {
        class: 'body--complete-error',
      },
    };
  },

  created() {
    this.$store.commit('view/hideBlockMobile', 'mobileBottomMenu');
    this.$store.commit('view/hideBlockDesktop', 'mobileBottomMenu');
  },
  methods: {
    onClose() {
      this.$router.push('/');
    },
  },
};
</script>
<style lang="scss"
       scoped
>
.complete-error-page {

  // .complete-error-page__inner
  &__inner {
    display: flex;
    flex-direction: column;
    margin-top: extClamp(16);

    @media screen and (min-width: 768px) {
      margin-top: 36px;
      padding-bottom: 145px;
      gap: 40px;
    }

    @media screen and (min-width: 1280px) {
      gap: 24px;
    }

    > * {
      width: 100%;
    }

  }

  // .complete-error-page__header
  &__header {
    padding-top: extClamp(16);
    padding-bottom: extClamp(16);

    @media screen and (min-width: 768px) {
      padding-top: 40px;
      padding-bottom: 40px;
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }

  }

  // .complete-error-page__title
  &__title {

  }

  // .complete-error-page__close
  &__close {

  }

  // .complete-error-page__icon
  &__icon {

  }

  // .complete-error-page__cart
  &__cart {

  }

  // .complete-error-page__footer-info
  &__footer-info {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: 140%;
    text-align: center;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 12px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .complete-error-page__footer
  &__footer {
    position: fixed;
    right: extClamp(10);
    bottom: max(var(--safe-area-inset-bottom, 0), extClamp(10));
    left: extClamp(10);
    width: auto;

    @media screen and (min-width: 768px) {
      right: 20px;
      bottom: max(var(--safe-area-inset-bottom, 0), 20px);
      left: 20px;
    }

    @media screen and (min-width: 1280px) {
      position: static;
      width: 100%;
      max-width: 398px;
      margin-right: auto;
      margin-left: auto;
    }
  }

  // complete-error-page__social
  &__social {

  }

  &::v-deep {
    .cart-page-header__inner {

    }
  }
}

.complete-error {

  @media screen and (min-width: 768px) {
    padding-bottom: 40px;
  }

  @media screen and (min-width: 1280px) {
    max-width: 398px;
    margin-right: auto;
    margin-left: auto;
    padding-bottom: 0;
    border-bottom: none;
  }

  // .complete-error__header
  &__header {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 20px;
    }
  }

  // .complete-error__icon-wrapper
  &__icon-wrapper {

  }

  // .complete-error__icon
  &__icon {
    width: extClamp(50);
    height: extClamp(50);
    color: #ff003d;

    @media screen and (min-width: 768px) {
      width: 128px;
      height: 128px;
    }

    @media screen and (min-width: 1280px) {
      width: 128px;
      height: 128px;
    }
  }

  // .complete-error__text
  &__text {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
    }
  }

  // .complete-error__title
  &__title {
    font-size: extClamp(18);
    font-weight: 600;
    line-height: 120%;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 24px;
      font-weight: 600;
      line-height: normal;
      text-align: center;

    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
      font-weight: 600;
      line-height: normal;
    }

  }

  // .complete-error__message
  &__message {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 100%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      font-weight: 500;
      line-height: 100%;
      text-align: center;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      font-style: normal;
      line-height: 120%;
    }

    > b {
      font-weight: inherit;
    }
  }
}

.complete-error-social {
  display: flex;
  flex-direction: column;
  width: 100%;
  gap: extClamp(30);

  @media screen and (min-width: 768px) {
    gap: 40px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .complete-error-social__title
  &__title {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: 140%;
    text-align: center;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 16px;

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .complete-error-social__buttons
  &__buttons {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .complete-error-social__button
  &__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: extClamp(100);
    padding: extClamp(10);
    border: extClamp(2) solid #993ca6;
    border-radius: extClamp(20);

    @media screen and (min-width: 768px) {
      height: 100px;
      padding: 10px;
      border-radius: 20px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .complete-error-social__icon
  &__icon {
    width: extClamp(48);
    height: extClamp(48);

    @media screen and (min-width: 768px) {
      width: 48px;
      height: 48px;
    }

    @media screen and (min-width: 1280px) {

    }

  }
}

.complete-error-footer {

  // .complete-error-footer__inner
  &__inner {

  }

  // .complete-error-footer__message
  &__message {

  }

  // .complete-error-footer__button
  &__button {

  }

  // .complete-error-footer__inner
  &__inner {
  }

  // .complete-error-footer__message
  &__message {

  }

  // .complete-error-footer__buttons
  &__buttons {
    display: flex;
    align-items: flex-start;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .complete-error-footer__home
  &__home {
    flex-grow: 1;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      width: 100%;
    }
  }

  // .complete-error-footer__track
  &__track {

  }
}

</style>
