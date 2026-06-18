<template>
  <div
    class="mobile-bottom-personal-btn"
    @click="onBtnClick"
  >
    <template v-if="isPersonalPage">
      <div
        class="mobile-bottom-personal-btn__icon-wrapper"
      >
        <svg

          class="mobile-bottom-personal-btn__icon"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close" />
        </svg>
      </div>
    </template>
    <template v-else>
      <div

        class="mobile-bottom-personal-btn__icon-wrapper"
      >
        <svg

          class="mobile-bottom-personal-btn__icon"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#personal" />
        </svg>
      </div>
      <div
        v-if="hasNewNotifications && isAuth"
        class="mobile-bottom-personal-btn__qty"
        @click="showPersonalPage"
      >
        {{ countNewNotifications }}
      </div>
    </template>

    <div class="mobile-bottom-personal-btn__title">
      Кабинет
    </div>
  </div>
</template>
<script>
export default {
  name: 'MobileBottomCallBtn',
  data() {
    return {
      pageFrom: '/',
    };
  },
  computed: {
    isPersonalPage() {
      return this.$route.name === 'personal';
    },
    hasNewNotifications() {
      return this.$store.getters['notification/hasNewNotifications'];
    },

    countNewNotifications() {
      return this.$store.getters['notification/countNewNotifications'];
    },
    isAuth() {
      return this.$store.getters['user/isAuth'];
    },
  },
  methods: {
    onBtnClick() {
      if (this.isPersonalPage) {
        this.returnPersonalPage();
      } else {
        this.showPersonalPage();
      }
    },
    showPersonalPage() {
      this.pageFrom = this.$route.path;
      this.$router.push({ path: '/personal' });
    },
    returnPersonalPage() {
      this.$router.push({ path: this.pageFrom });
    },
  },
};
</script>
<style lang="scss"
       scoped
>
.mobile-bottom-personal-btn {
  position: relative;
  display: flex;
  align-items: center;
  flex-direction: column;
  justify-content: center;
  cursor: pointer;

  @media screen and (min-width: 768px) {
    flex-direction: row;
  }

  @media screen and (min-width: 1280px) {

  }

  // .mobile-bottom-personal-btn__icon-wrapper
  &__icon-wrapper {
    @media screen and (min-width: 768px) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 54px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .mobile-bottom-personal-btn__icon
  &__icon {
    width: extClamp(30);
    height: extClamp(30);
    color: #fff;

    @media screen and (min-width: 768px) {
      width: 38px;
      height: 38px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .mobile-bottom-personal-btn__title
  &__title {
    font-size: extClamp(8);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    text-align: center;
    text-transform: uppercase;
    opacity: 0.5;
    color: #fff;

    @media screen and (min-width: 768px) {
      font-size: 11px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .mobile-bottom-personal-btn__qty
  &__qty {
    font-size: extClamp(8);
    font-weight: 400;
    font-style: normal;
    line-height: 1;
    position: absolute;
    top: extClamp(1);
    left: 50%;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    width: extClamp(16);
    height: extClamp(16);
    margin-left: extClamp(2);
    padding: extClamp(4);
    text-align: center;
    color: #fff;
    border-radius: extClamp(200);
    background-color: #993ca6;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      top: 2px;
      width: 28px;
      height: 28px;
      margin-left: 4px;
      padding: 7px;
      border-radius: 50%;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 8px;
      position: absolute;
      top: initial;
      right: 13px;
      bottom: 5px;
      left: initial;
      display: flex;
      align-items: center;
      flex-direction: column;
      justify-content: center;
      width: 18px;
      height: 18px;
      padding: 4px;
      color: #993ca6;

      border-radius: 50%;
      background: #fff;
    }
  }
}
</style>
