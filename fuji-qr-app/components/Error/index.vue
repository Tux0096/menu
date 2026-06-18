<template>
  <div class="error">
    <div class="error__status-code">
      {{ error.statusCode }}
    </div>
    <div class="error__text">
      Что-то пошло не так
    </div>
    <NuxtLink
      class="error__button"
      to="/"
      @click="$router.push('/')"
    >
      Вернуться на главную
    </NuxtLink>
  </div>
</template>
<script>
export default {
  name: 'ErrorComponent',
  props: {
    error: {
      type: Object,
      default: () => {
      },
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.error {
  display: flex;
  flex-direction: column;
  margin-right: extClampNegative(10);
  margin-left: extClampNegative(10);
  padding-right: extClamp(16);
  padding-left: extClamp(16);
  text-align: center;

  @media screen and (min-width: 768px) {
    justify-content: center;
    height: 100%;
    margin-right: 0;
    margin-left: 0;
  }

  @media screen and (min-width: 1280px) {

  }

  // .error__image-wrapper
  &__image-wrapper {
  }

  // .error__status-code
  &__status-code {
    font-size: extClamp(100);
    font-weight: 700;
    font-style: normal;
    line-height: 80%;
    margin-top: extClamp(36);
    text-align: center;
    color: #993ca6;

    @media screen and (min-width: 768px) {
      font-size: 169px;
      margin-top: 0;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .error__text
  &__text {
    font-size: extClamp(18);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    margin-top: extClamp(16);
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 24px;
      font-weight: 600;
      line-height: normal;
      margin-top: 24px;
      color: var(---Main-Black, #292929);

    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .error__button
  &__button {
    font-size: extClamp(10);
    font-weight: 500;
    font-style: normal;
    line-height: normal;
    display: flex;
    align-items: center;
    flex-grow: 1;
    justify-content: center;
    width: auto;
    margin: extClamp(16) 0 0;
    padding: extClamp(14) extClamp(12);
    text-align: center;
    color: #fff;
    border: 2px solid #993ca6;
    border-radius: 200px;
    background: #993ca6;
    gap: 50px;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      flex-grow: 0;
      width: 100%;
      max-width: 398px;
      margin: 24px auto 0;
      padding: 20px 30px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
      max-width: 360px;
      min-height: 54px;
      margin-right: auto;
      margin-left: auto;
      padding: 10px;
    }
  }
}

.error-404 {
}
</style>
