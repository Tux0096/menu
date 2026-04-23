<template>
  <div
    :class="{'like--active': isLiked}"
    class="like"
    @click.stop="$emit('click')"
  >
    <svg
      :class="{'like__icon--active': isLiked}"
      class="like__icon"
    >
      <use
        v-if="isLiked"
        xlink:href="~/assets/images/icons/svg/sprite-v2.svg#filled-favorite"
      />
      <use
        v-else
        xlink:href="~/assets/images/icons/svg/sprite-v2.svg#favorite"
      />
    </svg>
  </div>
</template>
<script>
export default {
  name: 'AppLike',
  props: {
    likesCount: {
      type: Number,
      default: 0,
    },
    isLiked: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    formattingLikesCount() {
      if (this.likesCount < 1000) {
        return this.likesCount;
      }

      return `${(this.likesCount / 1000).toFixed(1)}k`;
    },
  },
};
</script>
<style lang="scss"
       scoped
>

.like {
  padding: extClamp(5);
  border-radius: 50%;
  background-color: #f5ecf6;

  @media screen and (min-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    padding: 0;
  }

  @media screen and (min-width: 1280px) {
    padding: 4px;
  }

  // .like__icon
  &__icon {
    width: extClamp(14);
    height: extClamp(14);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 24px;
      height: 24px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }

    // .like__icon--active
    &--active {
      width: 20px;
      height: 20px;
      fill: #fff;

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        width: 20px;
        height: 20px;
      }
    }
  }

  // .like--active
  &--active {
    background-color: #993ca6;
  }
}
</style>
