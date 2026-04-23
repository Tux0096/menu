<template>
  <span>
    <slot
      :minutes="minutes"
      :seconds="seconds"
    >
      {{ minutes }}:{{ seconds }}
    </slot>
  </span>
</template>

<script>
export default {
  props: {
    expireAt: {
      type: Number,
      required: true,
    },
  },

  data() {
    return {
      timer: null,

      minutes: 0,
      seconds: 0,
    };
  },

  watch: {
    expireAt(newExpireAt) {
      this.startCountdown(newExpireAt);
    },
  },

  mounted() {
    this.startCountdown(this.expireAt);
  },

  beforeDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  },

  methods: {
    startCountdown(expireAt) {
      // Convert expireAt to seconds
      expireAt = Math.floor(expireAt / 1000);

      // Clear any existing timer
      if (this.timer) {
        clearInterval(this.timer);
      }

      const calc = () => {
        // Get the current time in seconds
        const now = Math.floor(Date.now() / 1000);

        // Calculate the remaining time
        const remainingTime = expireAt - now;

        if (remainingTime <= 0) {
          clearInterval(this.timer);

          // Emit the 'timer-ended' event
          this.$emit('timer-ended');
        } else {
          // Otherwise, update the countdown
          this.minutes = Math.floor(remainingTime / 60);
          this.seconds = remainingTime % 60;
        }
      };
      calc();
      this.timer = setInterval(calc, 1000);
    },
  },
};
</script>
