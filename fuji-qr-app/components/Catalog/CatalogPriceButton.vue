<template>
  <button
    class="catalog-price-button"
    v-on="$listeners"
  >
    <span
      v-if="$slots['old-price']"
      class="catalog-price-button__old-price"
    >
      <slot name="old-price" />
    </span>
    <span class="catalog-price-button__price">
      <slot />
    </span>
  </button>
</template>

<script>
export default {
  name: 'CatalogPriceButton',
};
</script>

<style lang="scss"
       scoped
>
.catalog-price-button {
  font-size: extClamp(12);
  font-weight: 600;
  font-style: normal;
  line-height: 120%;
  display: flex;
  align-items: center;
  flex-grow: 1;
  justify-content: center;
  height: extClamp(36);
  padding: extClamp(10) extClamp(12);
  text-align: center;
  color: var(---Main-Purple, #993ca6);
  border: 1px solid var(---Main-Purple, #993ca6);
  border-radius: extClamp(12);
  background: var(---Main-White, #fff);
  background-color: #fff;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    font-size: 20px;
    height: 64px;
    padding: 20px 10px;
    border-radius: 200px;
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .catalog-price-button__old-price
  &__old-price {
    text-decoration: line-through;
    color: #d0d0d0;
  }
}
</style>
