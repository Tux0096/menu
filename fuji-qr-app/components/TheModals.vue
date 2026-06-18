<template>
  <div class="modals">
    <Modal
      ref="modal"
      :is-open="$store.state.modal.isShowModal"
      v-bind="params"
      @close="hideModal"
    />
  </div>
</template>

<script>
import { mapMutations } from 'vuex';

export default {
  name: 'TheModals',
  computed: {
    params() {
      return this.$store.state.modal.params;
    },
  },
  mounted() {
    this.$store.commit('modal/setModalInstance', this.$refs.modal);
  },
  methods: {
    ...mapMutations({ hideModal: 'modal/hideModal' }),
  },

};
</script>

<style lang="scss"
       scoped
>

</style>
