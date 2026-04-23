<template>
  <div class="page-content">
    <div class="complete-page">
      <CheckoutHeader
        :is-back-button-hide="false"
        :is-close-button-hide="true"
        class="complete-page__header"
        @click="onClose"
      >
        <template #title>
          Благодарим за Ваш выбор!
        </template>
      </CheckoutHeader>

      <div class="complete-page__inner">
        <div class="complete-page__complete complete">
          <div class="complete__header">
            <div class="complete__icon-wrapper">
              <lord-icon
                :src="`/assets/libs/icon-json/tick.json`"
                class="complete__icon"
                delay="1000000"
                trigger="loop"
              />
            </div>
            <div class="complete__text">
              <div class="complete__title">
                Заказ обработан
              </div>
              <div class="complete__message">
                Мы уже начали его готовить. Ожидайте звонок
              </div>
            </div>
          </div>
        </div>
        <div class="complete-page__social complete-social">
          <div class="complete-social__title">
            Хочешь участвовать в конкурсах и получать актуальные новости? Подписывайся!
          </div>
          <div class="complete-social__socials socials">
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
        </div>
        <!--        <div class="complete-page__footer-info">-->
        <!--          Вы можете отслеживать статус заказа в&nbsp;личном кабинете.-->
        <!--        </div>-->
        <footer class="complete-page__footer complete-footer">
          <div class="complete-footer__inner">
            <div class="complete-footer__buttons">
              <BaseButton
                class="complete-footer__home"

                @click="$router.push('/')"
              >
                Вернуться на главную
              </BaseButton>
              <!--              <BaseButton-->
              <!--                class="complete-footer__track"-->
              <!--                type="outline"-->
              <!--                @click="$router.push('/personal/history')"-->
              <!--              >-->
              <!--                Отследить заказ-->
              <!--              </BaseButton>-->
            </div>
          </div>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  name: 'PageComplete',

  data() {
    return {};
  },
  head() {
    return {

      bodyAttrs: {
        class: 'body--complete',
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
.complete-page {

  // .complete-page__inner
  &__inner {
    display: flex;
    flex-direction: column;
    margin-top: extClamp(16);
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      margin-top: 36px;

      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      display: grid;
      grid-template-columns: auto 500px;
      grid-template-rows: auto auto;
      gap: 20px;
    }

  }

  // .complete-page__complete
  &__complete {
    grid-row: 1 / 3;
  }

  // .complete-page__header
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

  // .complete-page__title
  &__title {

  }

  // .complete-page__close
  &__close {

  }

  // .complete-page__icon
  &__icon {

  }

  // .complete-page__cart
  &__cart {

  }

  // .complete-page__footer-info
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

  // .complete-page__footer
  &__footer {
    position: fixed;
    right: extClamp(10);
    bottom: max(var(--safe-area-inset-bottom, 0), extClamp(10));
    left: extClamp(10);
    width: auto;

    @media screen and (min-width: 768px) {
      right: 20px;
      bottom: max(var(--safe-area-inset-bottom, 0), 36px);
      left: 20px;
    }

    @media screen and (min-width: 1280px) {
      position: static;
    }
  }

  // complete-page__social
  &__social {
    display: flex;
    flex-direction: column;
    gap: extClamp(16);

  }

  &::v-deep {
    .cart-page-header__inner {

    }
  }
}

.complete {
  padding-bottom: extClamp(16);
  border-bottom: 1px solid #f0f0f0;

  @media screen and (min-width: 768px) {
    padding-bottom: 16px;
  }

  @media screen and (min-width: 1280px) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding-bottom: 0;
    border-radius: 8px;
    background: var(---Primary-LightGray, #f5f5f5);
  }

  // .complete__header
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

  // .complete__icon-wrapper
  &__icon-wrapper {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .complete__icon
  &__icon {
    width: extClamp(50);
    height: extClamp(50);
    color: #3eae4a;

    @media screen and (min-width: 768px) {
      width: 128px;
      height: 128px;
    }

    @media screen and (min-width: 1280px) {
      width: 128px;
      height: 128px;
    }
  }

  // .complete__text
  &__text {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      gap: 20px;
    }
  }

  // .complete__title
  &__title {
    font-size: extClamp(18);
    font-weight: 600;
    line-height: 120%;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 24px;
      line-height: 100%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 600;
      line-height: 100%;
      font-feature-settings: 'liga' off, 'clig' off;
    }

  }

  // .complete__message
  &__message {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: 100%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      max-width: none;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      line-height: 120%;
    }
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

.complete-footer {

  // .complete-footer__inner
  &__inner {

  }

  // .complete-footer__message
  &__message {

  }

  // .complete-footer__button
  &__button {

  }

  // .complete-footer__inner
  &__inner {
  }

  // .complete-footer__message
  &__message {

  }

  // .complete-footer__buttons
  &__buttons {
    display: flex;
    align-items: flex-start;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      padding: 24px 16px;
      border-radius: 8px;
      background: var(---Primary-LightGray, #f5f5f5);
    }

  }

  // .complete-footer__home
  &__home {
    font-size: extClamp(12);
    flex-grow: 1;

    @media screen and (min-width: 768px) {

      font-size: 16px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .complete-footer__track
  &__track {
    flex-grow: 1;
  }

}

.complete-social {

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    font-size: 16px;
    font-weight: 500;
    font-style: normal;
    line-height: 120%;
    display: flex;
    align-items: flex-start;
    align-self: stretch;

    flex-direction: column;
    padding: 24px 16px;
    text-align: center;
    color: var(---Primary-Gray, #969696);
    border-radius: 8px;
    background: var(---Primary-LightGray, #f5f5f5);
    gap: 16px;
  }

  // .complete-social__title
  &__title {
    @media screen and (min-width: 768px) {
      font-size: 14px;
      font-weight: 600;
      line-height: 120%;
      text-align: center;
      color: var(---Main-Black, #292929);
    }

    @media screen and (min-width: 1280px) {

    }
  }
}

</style>
