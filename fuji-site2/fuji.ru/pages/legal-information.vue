<template>
  <div class="page-content">
    <div class="page-legal-information">
      <h1 class="page-content__title">
        Правовая информация
      </h1>
      <div
        class="page-legal-information__content"
      >
        <div class="page-legal-information__buttons">
          <BaseGradientButton
            class="page-legal-information__button"
            type="outline"
            @click="$router.push('/legal')"
          >
            Юридическая информация
          </BaseGradientButton>
          <BaseGradientButton
            class="page-legal-information__button"
            type="outline"
            @click="$router.push('/rule')"
          >
            Обработка персональных данных
          </BaseGradientButton>
          <BaseGradientButton
            class="page-legal-information__button"
            type="outline"
            @click="$router.push('/oferta')"
          >
            Публичная оферта
          </BaseGradientButton>
          <BaseGradientButton
            class="page-legal-information__button"
            type="outline"
            @click="$router.push('/user-agreement')"
          >
            Пользовательское соглашение
          </BaseGradientButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  name: 'PageLegalInformation',
  components: { BaseGradientButton },
  data() {
    return {
      content: null,
    };
  },

};
</script>

<style lang="scss"
       scoped
>

.page-legal-information {
  // .page-legal-information__content
  margin-top: extClamp(20);

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    margin-top: 0;
  }

  &__content {
    h1 {

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        margin-top: 0;
      }
    }

  }

  // .page-legal-information__buttons

  &__buttons {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      flex-direction: row;
      gap: 20px;
    }
  }

  // .page-legal-information__button

  &__button {
    flex-grow: 1;
  }
}

.page-content__title {
  display: none;

  @media screen and (min-width: 768px) {

  }

  @media screen and (min-width: 1280px) {
    display: block;
  }
}
</style>
