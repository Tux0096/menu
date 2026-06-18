<template>
  <div
    class="mobile-bottom-menu"
  >
    <div class="mobile-bottom-menu__inner">
      <MobileBottomMenuBtn
        class="mobile-bottom-menu__item"
      />

      <MobileBottomFilterBtn
        class="mobile-bottom-menu__item"
      />

      <CartBlock
        class="mobile-bottom-menu__item"
        title="Заказ"
      />
    </div>
  </div>
</template>

<script>

export default {
  name: 'TheMobileBottomMenu',

  data() {
    return {};
  },
};
</script>

<style lang="scss"
       scoped
>

.is-modal-show {
  .mobile-bottom-menu {
    z-index: 250;
  }
}

.mobile-bottom-menu {
  position: fixed;
  z-index: 100;
  right: extClamp(16);
  bottom: max(var(--safe-area-inset-bottom), var(--mobile-bottom-menu-bottom));
  left: extClamp(16);
  width: auto;
  max-width: $mobileBottomMenuWidth;
  margin-right: auto;
  margin-left: auto;
  padding: extClamp(6) extClamp(18);
  border-radius: extClamp(6);
  background: var(---Secondary-MenuBackground, #171b1e);
  box-shadow: 0 extClamp(10) extClamp(60) 0 #fff;

  @media screen and (min-width: 768px) {
    right: 24px;
    left: 24px;
    max-width: 720px;
    height: auto;
    padding: 8px 24px;
    border-radius: 8px;
  }

  @media screen and (min-width: 1280px) {
    display: none;
  }

  // .mobile-bottom-menu__inner
  &__inner {
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: extClamp(18);

    @media screen and (min-width: 768px) {
      justify-content: space-evenly;
      gap: 12px;

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .mobile-bottom-menu__item
  &__item {
    width: extClamp(35);
    height: extClamp(46);

    @media screen and (min-width: 768px) {
      width: 130px;
      height: 53px;

    }

    @media screen and (min-width: 1280px) {

    }
  }
}

</style>
