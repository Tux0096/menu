<template>
  <div
    class="ai-thinking"
    aria-live="polite"
    aria-busy="true"
  >
    <div class="ai-thinking__orbs">
      <span class="ai-thinking__orb ai-thinking__orb--1" />
      <span class="ai-thinking__orb ai-thinking__orb--2" />
      <span class="ai-thinking__orb ai-thinking__orb--3" />
    </div>

    <p class="ai-thinking__label">
      Фуджи AI подбирает
      <span class="ai-thinking__dots">
        <span /><span /><span />
      </span>
    </p>

    <div class="ai-thinking__cards">
      <div
        v-for="n in 3"
        :key="n"
        class="ai-thinking__card"
        :style="{ animationDelay: `${n * 0.15}s` }"
      >
        <div class="ai-thinking__card-img" />
        <div class="ai-thinking__card-lines">
          <div class="ai-thinking__card-line ai-thinking__card-line--wide" />
          <div class="ai-thinking__card-line" />
          <div class="ai-thinking__card-line ai-thinking__card-line--short" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AiThinkingLoader',
};
</script>

<style lang="scss" scoped>
@keyframes ai-orb-float {
  0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.5; }
  33% { transform: translate(8px, -12px) scale(1.1); opacity: 0.8; }
  66% { transform: translate(-6px, 6px) scale(0.95); opacity: 0.6; }
}

@keyframes ai-dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
  40% { transform: translateY(-6px); opacity: 1; }
}

@keyframes ai-card-pulse {
  0%, 100% { opacity: 0.55; }
  50% { opacity: 1; }
}

@keyframes ai-shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

.ai-thinking {
  padding: 8px 0 16px;
  animation: ai-card-pulse 2s ease-in-out infinite;

  &__orbs {
    position: relative;
    height: 48px;
    margin-bottom: 12px;
  }

  &__orb {
    position: absolute;
    left: 50%;
    border-radius: 50%;
    filter: blur(1px);
    animation: ai-orb-float 2.4s ease-in-out infinite;

    &--1 {
      top: 8px;
      width: 28px;
      height: 28px;
      margin-left: -40px;
      background: radial-gradient(circle, rgba(153, 60, 166, 0.55) 0%, transparent 70%);
    }

    &--2 {
      top: 0;
      width: 36px;
      height: 36px;
      margin-left: -18px;
      background: radial-gradient(circle, rgba(219, 157, 238, 0.6) 0%, transparent 70%);
      animation-delay: 0.4s;
    }

    &--3 {
      top: 12px;
      width: 22px;
      height: 22px;
      margin-left: 16px;
      background: radial-gradient(circle, rgba(111, 129, 180, 0.5) 0%, transparent 70%);
      animation-delay: 0.8s;
    }
  }

  &__label {
    margin: 0 0 16px;
    font-size: extClamp(12);
    font-weight: 600;
    text-align: center;
    color: var(---Main-Purple, #993ca6);
  }

  &__dots {
    display: inline-flex;
    gap: 3px;
    margin-left: 2px;
    vertical-align: bottom;

    span {
      display: block;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: var(---Main-Purple, #993ca6);
      animation: ai-dot-bounce 1.2s ease-in-out infinite;

      &:nth-child(2) { animation-delay: 0.15s; }
      &:nth-child(3) { animation-delay: 0.3s; }
    }
  }

  &__cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: extClamp(12);
    border: 1px solid var(---Primary-LightGray, #f0f0f0);
    border-radius: extClamp(12);
    background: #fff;
    animation: ai-card-pulse 1.8s ease-in-out infinite;
  }

  &__card-img {
    flex-shrink: 0;
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(
      90deg,
      #f5f5f5 0%,
      #f0e6f7 40%,
      #f5f5f5 80%
    );
    background-size: 200% 100%;
    animation: ai-shimmer 1.4s linear infinite;
  }

  &__card-lines {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__card-line {
    height: 10px;
    border-radius: 6px;
    background: linear-gradient(
      90deg,
      #f5f5f5 0%,
      #ececec 40%,
      #f5f5f5 80%
    );
    background-size: 200% 100%;
    animation: ai-shimmer 1.4s linear infinite;

    &--wide { width: 85%; }
    &--short { width: 40%; }
  }
}
</style>
