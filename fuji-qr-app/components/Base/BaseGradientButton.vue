<template>
  <button
    class="gradient-button"
    @click.prevent="$emit('click')"
  >
    <span class="gradient-button__inner">
      <slot />
    </span>
  </button>
</template>

<script>
export default {
  name: 'BaseGradientButton',
};
</script>

<style lang="scss" scoped>
.gradient-button {
  font-size: extClamp(12);
  font-weight: 600;
  font-style: normal;
  line-height: 100%;
  display: flex;
  flex-direction: column;
  padding: 1px;
  text-align: center;
  color: var(---Main-Purple, #993ca6);
  border-radius: 200px;
  background: linear-gradient(to bottom, #db9dee, #6f81b4);

  @media screen and (min-width: 768px) {
    font-size: 16px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .gradient-button__inner
  &__inner {
    display: flex;
    overflow: hidden;
    align-items: center;
    justify-content: center;
    width: 100%;

    padding: extClamp(12);
    border-radius: 200px;
    background: var(---Main-White, #fff);

    @media screen and (min-width: 768px) {
      min-height: 52px;
      padding: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

}
</style>
