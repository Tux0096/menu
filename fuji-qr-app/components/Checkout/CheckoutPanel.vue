<template>
  <div class="checkout-panel">
    <div
      v-if="$slots.title"
      class="checkout-panel__title"
    >
      <slot name="title" />
    </div>
    <slot />
  </div>
</template>

<script>
export default {
  name: 'CheckoutPanel',
};
</script>

<style lang="scss"
       scoped
>
.checkout-panel {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: extClamp(20) extClamp(10);
  border-radius: extClamp(10);
  background-color: #f6f6f6;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    padding: 24px 16px;
    border-radius: 8px;
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {
    padding: 16px;
    gap: 16px;
  }

  > * {
    width: 100%;
  }

  // .checkout-panel__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }
  }
}
</style>
