<template>
  <button
    :class="{'add-button--is-added': isAdded}"
    aria-label="Добавить в корзину"
    class="catalog-item__add-button add-button"
    @click="$emit('click')"
  >
    <svg class="add-button__icon">
      <use
        v-if="isAdded"
        xlink:href="~/assets/images/icons/svg/sprite-v2.svg#tick"
      />
      <use
        v-else
        xlink:href="~/assets/images/icons/svg/sprite-v2.svg#plus"
      />
    </svg>
  </button>
</template>
<script>
export default {
  name: 'AddToCartButton',
  props: {
    isAdded: {
      type: Boolean,
      default: false,
    },
  },
};
</script>
<style lang="scss"
       scoped
>

.add-button {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  justify-content: center;
  padding: extClamp(5) extClamp(16);
  color: #993ca6;
  border-radius: extClamp(16);
  background: var(---Primary-LightPurple, #f5ecf6);
  background-color: #f5ecf6;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: 58px;
    height: 38px;
    padding: 10px 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .add-button__text
  &__text {

  }

  // .add-button__icon
  &__icon {
    width: extClamp(12);
    height: extClamp(12);

    @media screen and (min-width: 768px) {
      width: 18px;
      height: 18px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .add-button--is-added
  &--is-added {
    color: #fff;
    background-color: #993ca6;
  }
}

</style>
