<template>
  <div class="modal-confirm">
    <div
      v-if="content?.length"
      class="modal-confirm__content"
      v-html="content"
    />
    <div class="modal-confirm__actions">
      <BaseButton
        v-if="cancelCallback"
        type="outline"
        @click="cancelCallback"
      >
        {{ cancelBtnTitle }}
      </BaseButton>
      <BaseButton
        v-if="confirmCallback"
        type="fill"
        @click="confirmCallback"
      >
        {{ confirmBtnTitle }}
      </BaseButton>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ModalConfirm',
  props: {

    confirmCallback: {
      type: Function,
    },
    confirmBtnTitle: {
      type: String,
      default: 'Ок',
    },
    cancelCallback: {
      type: Function,
    },
    cancelBtnTitle: {
      type: String,
      default: 'Отменить',
    },
    content: {
      type: String,
      default: '',
    },
  },
  data() {
    return {};
  },
};
</script>

<style lang="scss" scoped>
.modal-confirm {

  // .modal-confirm__content
  &__content {
    padding: 0 0 extClamp(15);

    @media screen and (min-width: 768px) {
      padding: 0 0 15px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .modal-confirm__actions
  &__actions {
    display: flex;
    gap: extClamp(10);

    > button {
      flex: 1 1 auto;
    }

    @media screen and (min-width: 768px) {
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
