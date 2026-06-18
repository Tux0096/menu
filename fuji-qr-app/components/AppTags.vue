<template>
  <div class="tags">
    <span
      v-for="(tag, idx) in tags"
      :key="`tag-id=${tag}-${idx}`"
      class="tags__item"
      @click="$emit('click', tag)"
    >
      #{{ tag }}
    </span>
  </div>
</template>
<script>
export default {
  name: 'AppTags',
  props: {
    tags: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {};
  },
};
</script>

<style lang="scss"
       scoped
>
.tags {
  display:   flex;
  flex-wrap: wrap;
  gap:       15px;
  // .tags__item
  &__item {
    @include MobCaption;
    position: relative;
    cursor:   pointer;
    color:    #7f8499;

    &::after {
      content:          '';
      position:         absolute;
      bottom:           -1px;
      left:             0;
      width:            100%;
      height:           1px;
      background-color: #7f8499;
    }
  }
}
</style>
