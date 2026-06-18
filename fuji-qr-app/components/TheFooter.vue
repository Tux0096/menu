<template>
  <footer
    class="footer"
  >
    <div class="footer__top">
      <portal-target name="footer-top" />
    </div>

    <div class="footer__inner">
      <div class="footer__header">
        <NuxtLink
          aria-label="Вернуться на главую"
          class="footer__logo"
          to="/"
        >
          <svg
            height="28"
            width="110"
          >
            <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#logo" />
          </svg>
        </NuxtLink>
        <AppSocialLinks class="footer__social" />
      </div>
      <div class="footer__line" />
      <nav class="footer__menu footer-menu">
        <div class="footer-menu__promo-text">
          Доставка еды Самара. Заказать пиццу, сеты, суши, роллы в Самаре от Фуджи Суши Friends с доставкой на дом и в
          офис
        </div>
        <ul class="footer-menu__list">
          <li class="footer-menu__item">
            <NuxtLink
              class="footer-menu__link"
              to="/legal"
            >
              Юридическая информация
            </NuxtLink>
          </li>
          <li class="footer-menu__item">
            <NuxtLink
              class="footer-menu__link"
              to="/rule"
            >
              Персональные данные
            </NuxtLink>
          </li>
          <li class="footer-menu__item">
            <NuxtLink
              class="footer-menu__link"
              to="/oferta"
            >
              Публичная оферта
            </NuxtLink>
          </li>
          <!--          <li class="footer-menu__item">-->
          <!--            <NuxtLink-->
          <!--              class="footer-menu__link"-->
          <!--              to="/loyalty-program"-->
          <!--            >-->
          <!--              Программа лояльности-->
          <!--            </NuxtLink>-->
          <!--          </li>-->
        </ul>
      </nav>

      <div class="footer__footer">
        <AppFreeCall class="mobile-menu__free-call" />
      </div>
    </div>
  </footer>
</template>

<script>

export default {
  name: 'TheFooter',
  data() {
    return {};
  },
  computed: {},
};
</script>

<style lang="scss"
       scoped
>
.footer {
  display: flex;
  flex-direction: column;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    padding: 30px 0 0 0;
    border-radius: 20px 20px 0 0;
  }

  @media screen and (min-width: 1280px) {
    padding: 20px 10px;
    border-top: 1px solid #e8e8e8;
    border-radius: 0;
    background-color: #fff;
  }

  // .footer__pre-footer
  &__pre-footer {
    display: flex;
    align-items: center;
    flex-grow: 1;
    justify-content: space-between;
    width: auto;
    margin-top: extClamp(12);
    margin-right: extClamp(16);
    margin-left: extClamp(16);
    padding-top: extClamp(16);
    padding-bottom: 0;
    border-top: 1px solid var(---Extra-LightGray, #e8e8e8);

    @media screen and (min-width: 768px) {
      display: none;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .footer__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    width: 100%;
    padding: extClamp(16) extClamp(16) calc(extClamp(20) + var(--safe-area-inset-bottom)) extClamp(16);
    border-radius: extClamp(12) extClamp(12) 0 0;
    background: #f6f6f6;

    @media screen and (min-width: 768px) {
      padding-top: 36px;
      gap: 40px;
    }

    @media screen and (min-width: 1280px) {
      align-items: center;
      flex-direction: row;
      justify-content: space-between;
      max-width: 1440px;
      margin-right: auto;
      margin-left: auto;
      padding: 0 60px 0;

      background: var(---Main-White, #fff);
    }
  }

  // .footer__header
  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding-bottom: extClamp(16);

    @media screen and (min-width: 768px) {
      padding-right: 20px;
      padding-bottom: 0;
      padding-left: 20px;
      border-color: var(---Extra-LightGray, #e8e8e8);
    }

    @media screen and (min-width: 1280px) {
      display: flex;
      align-items: center;
      justify-content: flex-start;
      width: auto;
      padding: 0;
      gap: 36px;

    }

  }

  // .footer__logo
  &__logo {
    padding-top: extClamp(8);
    color: var(---Main-Black);

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      margin-top: 0;
    }

    > svg {
      width: 82px;
      height: 17px;

      @media screen and (min-width: 768px) {
        width: 148px;
        height: 38px;
      }

      @media screen and (min-width: 1280px) {
        width: 150px;
        height: 31px;
      }
    }

  }

  // .footer__social
  &__social {

    &::v-deep {
      // .social-links__icon
      .social-links__icon {

        @media screen and (min-width: 768px) {

        }

        @media screen and (min-width: 1280px) {
          width: 18px;
          height: 18px;
        }
      }

      // .social-links__item
      .social-links__item {

        @media screen and (min-width: 768px) {

        }

        @media screen and (min-width: 1280px) {
          width: 34px;
          height: 34px;
          padding: 8px;
          border-radius: 8px;

        }

      }
    }

  }

  // .footer__line
  &__line {
    display: none;

    @media screen and (min-width: 768px) {
      display: block;
      width: 100%;
      height: 1px;
      background: var(---Extra-LightGray, #e8e8e8);
    }

    @media screen and (min-width: 1280px) {
      display: none;
    }
  }

  // .footer__menu
  &__menu {

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .footer__footer
  &__footer {
    display: none;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    margin-top: extClampNegative(20);
    padding-top: extClamp(20);

    @media screen and (min-width: 768px) {
      display: flex;
      margin-top: 0;
      padding-top: 16px;
      padding-right: 24px;
      padding-left: 24px;
      border-top: 1px solid var(---Extra-LightGray, #e8e8e8);
    }

    @media screen and (min-width: 1280px) {
      flex-shrink: 0;
      width: auto;
      padding: 0;
      border: none;
      gap: 16px;
    }

  }
}

.footer-menu {
  display: flex;
  flex-direction: column;
  padding-bottom: extClamp(16);
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    width: 100%;
    padding-bottom: 0;
    gap: 0;
  }

  @media screen and (min-width: 1280px) {
    position: relative;
    top: 32px;
    align-items: center;
    flex-direction: column-reverse;
    padding-bottom: 20px;
    text-align: center;
    gap: 16px;
  }

  // .footer-menu__promo-text
  &__promo-text {
    font-size: extClamp(10);
    font-weight: 400;
    line-height: 120%;
    padding-bottom: extClamp(16);
    text-align: center;
    color: var(---Primary-Gray, #969696);
    border-bottom: 1px solid var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      font-style: normal;
      line-height: 140%;
      max-width: 550px;
      margin-right: auto;
      margin-bottom: 20px;
      margin-left: auto;
      padding-bottom: 20px;
      border: none;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      line-height: 120%;
      margin: 0;
      padding: 0;

    }

  }

  // .footer-menu__list
  &__list {
    display: flex;
    align-items: flex-start;
    flex-direction: column;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      flex-direction: row;
      justify-content: center;
      width: 100%;
      gap: 40px;
    }

    @media screen and (min-width: 1280px) {
      justify-content: center;
      gap: 20px;
    }

  }

  // .footer-menu__item
  &__item {
  }

  // .footer-menu__link
  &__link {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;

    @media screen and (min-width: 768px) {
      font-size: 16px;

    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      line-height: 120%;
      display: inline-block;
    }
  }
}

</style>
