<template>
  <div
    :class="[
      {'stories-bullet--active': isActive},
      {'stories-bullet--finished': isFinished},
    ]"
    class="stories-bullet"
    @click="$emit('click')"
  >
    <div
      :style="{width: fillWidth}"
      class="stories-bullet__fill"
    />
  </div>
</template>

<script>
export default {
  props: {
    isActive: {
      type: Boolean,
      default: false,
    },
    isFinished: {
      type: Boolean,
      default: false,
    },
    tick: {
      type: Number,
      default: 0,
    },
  },
  data() {
    return {};
  },
  computed: {
    fillWidth() {
      if (this.isFinished) {
        return '100%';
      }
      if (this.isActive && this.tick > 0) {
        const fill = 100 * this.tick;
        return `${fill > 100 ? 100 : fill * this.tick}%`;
      }
      return '0%';
    },
  },

};
</script>

<style lang="scss" scoped>
.stories-bullet {
  height:           extClamp(3);
  width:            100%;
  background-color: #fff;
  border-radius:    extClamp(3);
  position:         relative;

  @media screen and (min-width: 768px) {
    height:        3px;
    border-radius: 3px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .stories-bullet__fill
  &__fill {
    content:          '';
    position:         absolute;
    top:              0;
    bottom:           0;
    left:             0;
    transition:       width 100ms linear;
    background-color: #993ca6;
  }

  // .stories-bullet--active
  &--active {
    // background-color: #993ca6;
    &::before {
      right:      0;
      transition: right var(--SLIDER_INTERVAL) linear;
    }
  }

  // .stories-bullet--finished
  &--finished {
    background: #993ca6;
  }
}
</style>
