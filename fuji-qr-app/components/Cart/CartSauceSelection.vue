<template>
  <div class="sauce-selection">
    <div class="sauce-selection__header">
      <div class="sauce-selection__icons-wrapper">
        <img
          alt=""
          class="sauce-selection__icons"
          src="~assets/images/icons/sauces.png"
        >
      </div>
      <div class="sauce-selection__title">
        Выбрать соус
      </div>
      <div
        class="sauce-selection__btn-wrapper"
        @click="isOpen = !isOpen"
      >
        <svg
          v-if="isOpen"
          fill="none"
          height="24"
          width="24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M16.667 2H7.333C3.93 2 2 3.929 2 7.333v9.334C2 20.062 3.92 22 7.333 22h9.334C20.07 22 22 20.062 22 16.667V7.333C22 3.93 20.071 2 16.667 2Z"
            fill="#C1C2CB"
            opacity=".4"
          />
          <path
            d="M15.32 12.708H8.68a.753.753 0 0 1-.68-.747c0-.384.293-.707.68-.747H15.32c.387.04.68.363.68.747a.753.753 0 0 1-.68.747Z"
            fill="#C1C2CB"
          />
        </svg>
        <svg
          v-else
          class="sauce-selection__btn-icon"
        >
          <use xlink:href="~/assets/images/icons/svg/sprite.svg#plus" />
        </svg>
      </div>
    </div>
    <div
      v-if="isOpen"
      class="sauce-selection__inner"
    >
      <CartSauceSelectionItem
        v-for="item in items"
        :key="item.id"
        :item="item"
        class="sauce-selection__item"
      />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    items: {
      type: Array,
      default: () => ([]),
    },
  },
  data() {
    return {
      isOpen: false,
    };
  },
};
</script>

<style lang="scss"
       scoped
>
.sauce-selection {
  display:          flex;
  flex-direction:   column;
  padding:          extClamp(16);
  border-radius:    extClamp(24);
  background-color: #fff;
  gap:              extClamp(16);

  // .sauce-selection__header
  &__header {
    display:     flex;
    align-items: center;
    gap:         extClamp(8);
  }

  // .sauce-selection__icons-wrapper
  &__icons-wrapper {
  }

  // .sauce-selection__icons
  &__icons {
  }

  // .sauce-selection__title
  &__title {
  }

  // .sauce-selection__btn-wrapper
  &__btn-wrapper {
    display:         flex;
    align-items:     center;
    flex:            none;
    justify-content: center;
    width:           extClamp(56);
    height:          extClamp(56);
    margin-left:     auto;
    cursor:          pointer;
    border-radius:   extClamp(24);
    background:      #f7f4ef;
  }

  // .sauce-selection__btn-icon
  &__btn-icon {
    width:  extClamp(20);
    height: extClamp(20);
    color:  #ff6523
  }

  // .sauce-selection__inner
  &__inner {
    display:               grid;
    grid-template-columns: repeat(2, 1fr);
    gap:                   extClamp(16) extClamp(12);

  }

  // .sauce-selection__item
  &__item {
    border: 1px solid #f1f5fd;
  }
}
</style>
