<template>
  <div
    v-if="visible"
    class="feedback-modal"
  >
    <div class="feedback-modal__box">
      <h2 class="feedback-modal__title">
        Как вам визит?
      </h2>
      <div class="feedback-modal__stars">
        <button
          v-for="n in 5"
          :key="n"
          type="button"
          :class="{ active: rating >= n }"
          @click="rating = n"
        >
          ★
        </button>
      </div>
      <textarea
        v-model="comment"
        class="feedback-modal__comment"
        placeholder="Комментарий (необязательно)"
        rows="3"
      />
      <button
        type="button"
        class="feedback-modal__submit"
        :disabled="!rating || sending"
        @click="submit"
      >
        {{ sending ? '...' : 'Отправить' }}
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
    return { rating: 0, comment: '', sending: false };
  },

  methods: {
    async submit() {
      this.sending = true;
      try {
        await this.$store.dispatch('tableSession/submitFeedback', {
          rating: this.rating,
          comment: this.comment,
        });
        this.$notify({ group: 'messages', type: 'success', text: 'Спасибо за отзыв!' });
        this.$emit('done');
      } finally {
        this.sending = false;
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.feedback-modal {
  position: fixed;
  z-index: 310;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(0, 0, 0, 0.7);

  &__box {
    width: 100%;
    max-width: 400px;
    padding: 24px;
    border-radius: 20px;
    background: #fff;
    color: var(---Main-Black, #292929);
    text-align: center;
  }

  &__title { margin: 0 0 16px; font-size: 20px; color: var(---Main-Purple, #993ca6); }

  &__stars {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 16px;

    button {
      border: none;
      background: none;
      color: var(---Primary-Gray, #969696);
      font-size: 36px;
      cursor: pointer;

      &.active { color: var(---Main-Purple, #993ca6); }
    }
  }

  &__comment {
    width: 100%;
    margin-bottom: 16px;
    padding: 12px;
    border: 1px solid var(---Primary-Gray, #969696);
    border-radius: 12px;
    background: var(---Primary-LightGray, #f5f5f5);
    color: var(---Main-Black, #292929);
    font-size: 14px;
    resize: none;
  }

  &__submit {
    width: 100%;
    padding: 14px;
    border: none;
    border-radius: 14px;
    background: var(---Main-Purple, #993ca6);
    color: #fff;
    font-weight: 700;
    cursor: pointer;

    &:disabled { opacity: 0.5; }
  }
}
</style>
