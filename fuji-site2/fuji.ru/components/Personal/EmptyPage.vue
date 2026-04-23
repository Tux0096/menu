<template>
  <div class="personal-empty-page">
    {{ $slots.buttonText }}
    <div class="personal-empty-page__icon-wrapper">
      <slot name="icon" />
    </div>
    <div class="personal-empty-page__title">
      <slot name="title">
        Здесь пусто
      </slot>
    </div>
    <div
      v-if="$slots.buttonText"
      class="personal-empty-page__buttons"
    >
      <BaseGradientButton
        class="personal-empty-page__button"
        type="outline"
        @click="bntCallback"
      >
        <slot name="button-text" />
      </BaseGradientButton>
    </div>
  </div>
</template>

<script>
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  name: 'PersonalEmptyPage',
  components: { BaseGradientButton },
  props: {
    bntCallback: {
      type: Function,
      default: () => ({}),
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.personal-empty-page {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    margin-top: 60px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .personal-empty-page__icon-wrapper
  &__icon-wrapper {

    > svg {
      width: extClamp(50);
      height: extClamp(50);

      @media screen and (min-width: 768px) {
        width: 100px;
        height: 100px;
      }

      @media screen and (min-width: 1280px) {

      }
    }
  }

  // .personal-empty-page__title
  &__title {
    font-size: extClamp(16);
    font-weight: 400;
    line-height: normal;

    @media screen and (min-width: 768px) {
      font-size: 24px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .personal-empty-page__buttons
  &__buttons {
    width: 100%;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      max-width: 315px;
      margin-right: auto;
      margin-left: auto;
    }
  }

  // .personal-empty-page__button
  &__button {
    width: 100%;
  }
}
</style>
