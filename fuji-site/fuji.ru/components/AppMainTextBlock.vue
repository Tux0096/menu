<template>
  <div class="main-text-block">
    <div class="main-text-block__inner">
      <h1
        v-if="$slots.title"
        class="main-text-block__title"
      >
        <slot name="title" />
      </h1>
      <div class="main-text-block__text">
        <slot />
      </div>
    </div>

    <div
      v-if="$slots.footer"
      class="main-text-block__footer"
    >
      <slot name="footer" />
    </div>
  </div>
</template>

<script>
export default {};
</script>

<style lang="scss"
       scoped
>

.main-text-block {
  display: flex;
  flex-direction: column;
  padding-bottom: extClamp(12);
  gap: extClamp(12);

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    padding-bottom: 0;
    gap: 36px;
  }

  // .main-text-block__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      padding-top: 0;
      gap: 24px;
    }

  }

  // .main-text-block__title
  &__title {
    font-size: extClamp(18);
    font-weight: 600;
    line-height: 120%;
    color: var(---Main-Purple, #993ca6);

    @media screen and (min-width: 768px) {
      font-size: 24px;
      font-weight: 600;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 600;
      line-height: 100%;
      font-feature-settings: 'liga' off, 'clig' off;
    }
  }

  // .main-text-block__text
  &__text {
    font-size: extClamp(10);
    font-weight: 400;
    line-height: 120%;

    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 14px;
      font-weight: 400;
      line-height: 120%;
    }
    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      line-height: 120%;
    }
  }

  // .main-text-block__footer
  &__footer {
    display: flex;
    justify-content: center;

    @media screen and (min-width: 768px) {
      margin-top: 20px;
    }

    @media screen and (min-width: 1280px) {
      margin-top: 0;
    }
  }

}

</style>
