<template>
  <div
    v-if="visible"
    class="call-waiter"
    @click.self="$emit('close')"
  >
    <div class="call-waiter__box">
      <h2 class="call-waiter__title">
        Позвать официанта
      </h2>
      <p class="call-waiter__hint">
        Выберите причину — персонал получит уведомление
      </p>
      <button
        v-for="r in reasons"
        :key="r.id"
        type="button"
        class="call-waiter__option"
        :disabled="calling"
        @click="call(r.id)"
      >
        {{ r.label }}
      </button>
      <button
        type="button"
        class="call-waiter__cancel"
        @click="$emit('close')"
      >
        Отмена
      </button>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    visible: { type: Boolean, default: false },
  },

  data() {
    return {
      calling: false,
      reasons: [
        { id: 'general', label: 'Нужна помощь' },
        { id: 'reorder', label: 'Дозаказ' },
        { id: 'bill', label: 'Попросить счёт' },
        { id: 'question', label: 'Вопрос по блюдам' },
      ],
    };
  },

  methods: {
    async call(reason) {
      this.calling = true;
      try {
        const data = await this.$store.dispatch('tableSession/callWaiter', reason);
        this.$notify({
          group: 'messages',
          type: 'success',
          text: data?.message || 'Официант скоро подойдёт',
        });
        this.$emit('close');
      } catch (e) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Не удалось вызвать официанта',
        });
      } finally {
        this.calling = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.call-waiter {
  position: fixed;
  z-index: 290;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);

  &__box {
    width: 100%;
    max-width: 480px;
    padding: 20px 16px 28px;
    border-radius: 20px 20px 0 0;
    background: #fff;
    color: var(---Main-Black, #292929);
  }

  &__title { margin: 0 0 6px; font-size: 18px; color: var(---Main-Purple, #993ca6); }
  &__hint { margin: 0 0 16px; font-size: 13px; opacity: 0.65; }

  &__option {
    display: block;
    width: 100%;
    margin-bottom: 8px;
    padding: 14px;
    border: 1px solid var(---Primary-Gray, #969696);
    border-radius: 12px;
    background: #fff;
    color: var(---Main-Black, #292929);
    font-size: 15px;
    text-align: left;
    cursor: pointer;

    &:disabled { opacity: 0.5; }
  }

  &__cancel {
    width: 100%;
    margin-top: 8px;
    padding: 12px;
    border: none;
    background: transparent;
    color: rgba(41, 41, 41, 0.5);
    cursor: pointer;
  }
}
</style>
