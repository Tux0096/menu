<template>
  <div
    class="app-thanks"
  >
    <div class="app-thanks__text">
      Наш менеджер по персоналу свяжется с вами в ближайшее время!
    </div>
  </div>
</template>
<script>
export default {
  name: 'ModalThanks',

  data() {
    return {};
  },
  methods: {},
};
</script>
<style lang="scss"
       scoped
>
.app-thanks {
  // .app-thanks__text
  &__text {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 120%;
    text-align: center;
    color: var(---Primary-Gray, #969696);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
