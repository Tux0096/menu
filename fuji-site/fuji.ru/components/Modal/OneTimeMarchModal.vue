<template>
  <div
    v-if="isVisible"
    class="one-time-modal"
  >
    <div
      class="one-time-modal__overlay"
      @click="closeModal"
    />
    <div class="one-time-modal__content">
      <button
        class="one-time-modal__close"
        @click="closeModal"
      >
        <span class="icon-close" />
      </button>

      <div class="one-time-modal__body">
        <img
          alt=""
          src="~/assets/images/content/promos/8-march-modal.png"
        >
        <h3>Сделай предзаказ<br> на 6, 7, 8 марта</h3>
        <p>Сет «Царица»</p>
        <button
          class="one-time-modal__button"
          @click="goToCatalog"
        >
          В каталог
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'OneTimeModal',
  data() {
    return {
      isVisible: false,
    };
  },
  mounted() {
    if (!this.$store.getters['setting/IS_SHOW_8MARCH_MODAL']) {
      this.isVisible = false;
      return;
    }
    const hasSeenModal = localStorage.getItem('hasSeenMarchModal');
    if (!hasSeenModal) {
      this.isVisible = true;
    }
  },
  methods: {
    closeModal() {
      this.isVisible = false;
      localStorage.setItem('hasSeenMarchModal', 'true');
    },
    goToCatalog() {
      this.closeModal();
      this.$router.push('/catalog/sety');
    },
  },
};
</script>

<style lang="scss" scoped>
.one-time-modal {
  position: fixed;
  z-index: 1000;
  top: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;

  // .one-time-modal__overlay
  &__overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
  }

  // .one-time-modal__content
  &__content {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: extClamp(288);
    padding: extClamp(28) extClamp(12);
    border-radius: extClamp(12);
    background: url('~/assets/images/content/promos/8-march-modal-bg-3.png') left top no-repeat,
    url('~/assets/images/content/promos/8-march-modal-bg-4.png') right bottom no-repeat,
    linear-gradient(180deg, #ffc9e4 0%, #ffe6f3 100%);
    background-size: extClamp(175) extClamp(175), extClamp(175) extClamp(175), cover;

    @media screen and (min-width: 768px) {
      max-width: 640px;
      padding: 24px 16px;
      border-radius: 16px;
      background: url('~/assets/images/content/promos/8-march-modal-bg-1.png') left top no-repeat,
      url('~/assets/images/content/promos/8-march-modal-bg-2.png') right bottom no-repeat,
      linear-gradient(180deg, #ffc9e4 0%, #ffe6f3 100%);
      background-size: 300px 300px, 300px 300px, cover;

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .one-time-modal__close
  &__close {
    position: absolute;
    top: extClamp(12);
    right: extClamp(10);
    padding: extClamp(8);
    cursor: pointer;
    color: #993ca6;
    border: none;
    background: none;

    @media screen and (min-width: 768px) {
      top: 12px;
      right: 10px;

    }

    @media screen and (min-width: 1280px) {

    }

    .icon-close {
      display: block;
      width: extClamp(20);
      height: extClamp(20);

      @media screen and (min-width: 768px) {
        width: 20px;
        height: 20px;
      }

      @media screen and (min-width: 1280px) {

      }

      &::before, &::after {
        position: absolute;
        width: extClamp(14);
        height: extClamp(1);
        content: '';
        transform: rotate(45deg);
        background: #993ca6;

        @media screen and (min-width: 768px) {
          width: 18px;
          height: 2px;
        }

        @media screen and (min-width: 1280px) {

        }
      }

      &::after {
        transform: rotate(-45deg);
      }
    }
  }

  // .one-time-modal__body
  &__body {
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    text-align: center;

    img {
      display: inline-block;
      width: extClamp(172);
      height: extClamp(98);

      @media screen and (min-width: 768px) {
        width: 348px;
        height: 198px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    h3 {
      font-size: extClamp(16);
      font-weight: 500;
      font-style: normal;
      line-height: 120%;
      max-width: extClamp(240);
      margin-top: extClamp(12);
      text-align: center;
      color: var(---Main-Black, #292929);

      @media screen and (min-width: 768px) {
        font-size: 20px;
        margin-top: 12px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    p {
      font-size: extClamp(10);
      font-weight: 500;
      font-style: normal;
      line-height: 120%;
      margin-top: extClamp(8);
      margin-bottom: 0;
      text-align: center;
      color: var(---Main-Purple, #993ca6);

      @media screen and (min-width: 768px) {
        font-size: 14px;
        margin-top: 10px;
      }

      @media screen and (min-width: 1280px) {

      }
    }
  }

  // .one-time-modal__button
  &__button {
    font-size: extClamp(12);
    width: 100%;
    margin-top: extClamp(12);
    padding: extClamp(12) extClamp(12);
    cursor: pointer;
    color: white;
    border: none;
    border-radius: extClamp(200);
    background: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      margin-top: 16px;
      padding: 12px 12px;
    }

    @media screen and (min-width: 1280px) {

    }

  }
}
</style>
