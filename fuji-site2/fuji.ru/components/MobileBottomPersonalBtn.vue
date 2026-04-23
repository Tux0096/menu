<template>
  <div
    class="mobile-bottom-personal-btn"
    @click="onBtnClick"
  >
    <div
      v-if="isPersonalPage"
      class="mobile-bottom-personal-btn__icon-wrapper"
    >
      <svg

        class="mobile-bottom-personal-btn__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#close" />
      </svg>
    </div>
    <div
      v-else
      class="mobile-bottom-personal-btn__icon-wrapper"
    >
      <svg

        class="mobile-bottom-personal-btn__icon"
      >
        <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#personal" />
      </svg>
    </div>

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
}
</style>
