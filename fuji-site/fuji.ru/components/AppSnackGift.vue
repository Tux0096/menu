<template>
  <div class="gift">
    <div class="gift__inner">
      <BaseGradientButton
        class="gift__btn"
        @click="$store.commit('modal/hideModal')"
      >
        Ok
      </BaseGradientButton>
    </div>
  </div>
</template>

<script>
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  components: { BaseGradientButton },
};
</script>

<style lang="scss"
       scoped
>.gift {
  // .gift__inner
  &__inner {
    display: flex;
    justify-content: space-around;
  }

  // .gift__btn
  &__btn {
    min-width: extClamp(260);

    @media screen and (min-width: 768px) {
      width: 100%;
    }

    @media screen and (min-width: 1280px) {
      min-width: 0;
    }
  }
}</style>
