<template>
  <div
    class="catalog-item-mods-many-item"
  >
    <nuxt-img
      v-if="mod.image?.length"
      :alt="mod.name"
      :src="mod.image"
      :title="mod.name"
      class="catalog-item-mods-many-item__image"
      format="webp"

      loading="lazy"
      quality="100"

      width="80"
    />
    <!--    <BaseCheckbox-->
    <!--      :checked="count > 0"-->
    <!--      class="catalog-item-mods-many-item__checkbox"-->
    <!--      @click="increase"-->
    <!--    />-->
    <div
      :class="{'catalog-item-mods-many-item__name--active': count > 0}"
      class="catalog-item-mods-many-item__name"
      @click="increase"
    >
      {{ mod.name }}
    </div>

    <AppQty
      :max-mod="maxMod"
      :qty="count"
      class="catalog-item-mods-many-item__qty"
      type="medium"
      @decrease="decrease"
      @increase="increase"
    />

    <div class="catalog-item-mods-many-item__price">
      {{ mod.price }}р
    </div>
  </div>
</template>

<script>
import AppQty from '~/components/AppQty.vue';
import BaseCheckbox from '~/components/Base/BaseCheckbox.vue';

export default {
  name: 'CatalogItemModsManyItem',
  components: { BaseCheckbox, AppQty },
  props: {
    mod: {
      type: Object,
      required: true,
    },
    value: {
      type: Object,
      required: true,
    },
    totalModCount: {
      type: Number,
      required: true,
    },
  },
  data() {
    return {
      count: 0,
      returnedMod: {},
    };
  },

  computed: {
    maxMod() {
      return this.mod.maxAmount - this.totalModCount;
    },
  },

  watch: {
    count() {
      const model = { ...this.value };
      model[this.mod.modifierId] = this.count;
      this.$emit('input', model);
    },
  },
  methods: {
    decrease() {
      this.count = Math.max(0, this.count - 1);
      this.$emit('decrease');
    },
    increase() {
      if (this.maxMod > 0) {
        this.count += 1;
      }
      this.$emit('increase');
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.catalog-item-mods-many-item {
  display: flex;
  align-items: center;
  justify-content: space-between;

  // .catalog-item-mods-many-item__image
  &__image {

  }

  // .catalog-item-mods-many-item__name
  &__name {
    @include WebBody;

    // .catalog-item-mods-many-item__name--active
    &--active {
      @include WebBodyBold;
    }
  }

  // .catalog-item-mods-many-item__desc
  &__desc {
    flex: 0 0 auto;
    margin-left: auto;
  }

  // .catalog-item-mods-many-item__popup-info
  &__popup-info {
    &::v-deep .popup-info__content {
      width: extClamp(260);

      @media screen and (min-width: 768px) {
        width: 260px;
      }

      @media screen and (min-width: 1280px) {
        width: max-content;
        max-width: max-content;
        padding: 20px 10px;
      }
    }
  }

  // .catalog-item-mods-many-item__qty
  &__qty {
    margin-left: auto;

  }

  // .catalog-item-mods-many-item__price
  &__price {
    @include WebBody;
    min-width: extClamp(25);
    margin-left: extClamp(11);
    text-align: right;
    white-space: nowrap;

    @media screen and (min-width: 768px) {
      min-width: 25px;
      margin-left: 11px;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
