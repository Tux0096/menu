<template>
  <div
    class="ai-welcome-icon"
    aria-hidden="true"
  >
    <div class="ai-welcome-icon__glow" />
    <div class="ai-welcome-icon__ring ai-welcome-icon__ring--1" />
    <div class="ai-welcome-icon__ring ai-welcome-icon__ring--2" />
    <svg
      class="ai-welcome-icon__svg"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient
          id="aiGrad"
          x1="20"
          y1="10"
          x2="100"
          y2="110"
          gradientUnits="userSpaceOnUse"
        >
          <stop stop-color="#db9dee" />
          <stop
            offset="0.5"
            stop-color="#993ca6"
          />
          <stop
            offset="1"
            stop-color="#6f81b4"
          />
        </linearGradient>
      </defs>
      <circle
        cx="60"
        cy="60"
        r="44"
        stroke="url(#aiGrad)"
        stroke-width="2"
        opacity="0.35"
      />
      <path
        d="M38 72c0-12 10-22 22-22s22 10 22 22"
        stroke="url(#aiGrad)"
        stroke-width="3"
        stroke-linecap="round"
      />
      <circle
        cx="48"
        cy="54"
        r="4"
        fill="#db9dee"
      />
      <circle
        cx="72"
        cy="54"
        r="4"
        fill="#db9dee"
      />
      <path
        d="M52 78c3 3 13 3 16 0"
        stroke="#fff"
        stroke-width="2.5"
        stroke-linecap="round"
        opacity="0.9"
      />
      <path
        d="M24 36l6 6M96 36l-6 6M60 18v8"
        stroke="#db9dee"
        stroke-width="2.5"
        stroke-linecap="round"
      />
      <path
        class="ai-welcome-icon__spark"
        d="M88 68l4 10 10 4-10 4-4 10-4-10-10-4 10-4 4-10z"
        fill="url(#aiGrad)"
      />
      <path
        class="ai-welcome-icon__spark ai-welcome-icon__spark--2"
        d="M28 48l2 5 5 2-5 2-2 5-2-5-5-2 5-2 2-5z"
        fill="#db9dee"
        opacity="0.85"
      />
    </svg>
    <div class="ai-welcome-icon__badge">
      AI
    </div>
  </div>
</template>

<script>
export default {
  name: 'AiWelcomeIcon',
};
</script>

<style lang="scss" scoped>
@keyframes ai-float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes ai-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes ai-pulse {
  0%, 100% { opacity: 0.35; transform: scale(1); }
  50% { opacity: 0.7; transform: scale(1.08); }
}

@keyframes ai-spark {
  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
  50% { transform: scale(1.15) rotate(12deg); opacity: 0.75; }
}

.ai-welcome-icon {
  position: relative;
  width: 200px;
  height: 200px;
  margin: 0 auto;

  &__glow {
    position: absolute;
    inset: 10%;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(153, 60, 166, 0.45) 0%, transparent 70%);
    animation: ai-pulse 3s ease-in-out infinite;
  }

  &__ring {
    position: absolute;
    inset: 0;
    border: 1px dashed rgba(219, 157, 238, 0.35);
    border-radius: 50%;
    animation: ai-spin 18s linear infinite;

    &--2 {
      inset: 12%;
      animation-direction: reverse;
      animation-duration: 12s;
    }
  }

  &__svg {
    position: relative;
    z-index: 1;
    width: 100%;
    height: 100%;
    animation: ai-float 4s ease-in-out infinite;
  }

  &__spark {
    transform-origin: 88px 68px;
    animation: ai-spark 2.4s ease-in-out infinite;

    &--2 {
      transform-origin: 28px 48px;
      animation-delay: 0.8s;
    }
  }

  &__badge {
    position: absolute;
    z-index: 2;
    right: 8px;
    bottom: 8px;
    padding: 6px 10px;
    border-radius: 999px;
    background: linear-gradient(135deg, #993ca6, #6f81b4);
    color: #fff;
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.12em;
    box-shadow: 0 4px 16px rgba(153, 60, 166, 0.45);
  }
}
</style>
