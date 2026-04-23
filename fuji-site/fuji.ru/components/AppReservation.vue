<template>
  <div>
    <div class="reservation">
      <a
        ref="phone"
        :href="`tel: ${phone}`"
        class="reservation__phone"
      >
        {{ phone }}
      </a>
      <BaseGradientButton
        class="reservation__btn"
        type="outline"
        @click="call"
      >
        Позвонить
      </BaseGradientButton>
    </div>
  </div>
</template>

<script>
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';

export default {
  name: 'AppReservation',
  components: { BaseGradientButton },
  data() {
    return {
      phone: '',
    };
  },
  created() {
    const fn = this.$store.state.modal.callback;
    if (typeof fn === 'function') {
      this.phone = fn();
    }
  },
  methods: {
    call() {
      this.$refs.phone.click();
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.reservation {
  display: flex;
  align-items: center;
  flex-direction: column;

  // .reservation__phone
  &__phone {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: 100%;
      font-feature-settings: 'liga' off, 'clig' off;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .reservation__btn
  &__btn {
    width: 100%;
    margin-top: extClamp(12);

    @media screen and (min-width: 768px) {
      width: 100%;
      max-width: 100%;
      margin-top: 16px;
    }

    @media screen and (min-width: 1280px) {

    }

  }
}
</style>a
