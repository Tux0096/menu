<template>
  <div class="page-content safe-top safe-left safe-right safe-bottom">
    <ErrorComponent
      :error="error"
    />
  </div>
</template>
<script>

import ErrorComponent from '~/components/Error/index.vue';

export default {
  name: 'LayoutError',
  components: { ErrorComponent },
  layout: 'default', // optional
  props: {
    error: {
      type: Object,
      default: () => {},
    },
  },

};
</script>
