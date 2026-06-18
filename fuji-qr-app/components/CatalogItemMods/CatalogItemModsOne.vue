<template>
  <div class="catalog-item-mods-one">
    <div
      v-if="title"
      class="catalog-item-mods-one__title"
    >
      {{ title }}
    </div>
    <div
      class="catalog-item-mods-one__list"
    >
      <div
        v-for="mod in group.modifiers"
        :key="mod.modifierId"
        :class="{'catalog-item-mods-one-item--active': isSelected(mod.modifierId)}"
        class="catalog-item-mods-one__item catalog-item-mods-one-item"
      >
        <div class="catalog-item-mods-one-item__image-wrapper">
          <nuxt-img
            v-if="mod.image?.length"
            :alt="mod.name"
            :src="mod.image"
            :title="mod.name"
            class="catalog-item-mods-one-item__image"
            format="webp"
            loading="lazy"
            quality="100"
            width="300"
          />
        </div>

        <div class="catalog-item-mods-one-item__name">
          {{ mod.name }}
        </div>
        <div class="catalog-item-mods-one-item__desc">
          {{ mod.desc }}
        </div>
        <div class="catalog-item-mods-one-item__popup-info-wrapper">
          <BasePopupInformation
            v-if="mod.description.length"
            class="catalog-item-mods-one-item__popup-info"
            direction="top"
            root-selector=".catalog-item-mods-one"
          >
            {{ mod.description }}
          </basepopupinformation>
        </div>

        <AddToCartButton
          :class="{'catalog-item-mods-one-item__btn--active': isSelected(mod.modifierId)}"
          :is-added="isSelected(mod.modifierId)"
          class="catalog-item-mods-one-item__btn"
          @click="setMod(mod.modifierId)"
        >
          {{ mod.price }} р
        </AddToCartButton>
      </div>
    </div>
  </div>
</template>

<script>

import AddToCartButton from '~/components/Catalog/AddToCartButton.vue';

export default {
  name: 'CatalogItemModsOne',
  components: { AddToCartButton },

  props: {
    group: {
      type: Object,
      required: true,
    },
    value: {
      type: Array,
      required: true,
    },
    title: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      selectedMod: '',

    };
  },
  watch: {
    selectedMod() {
      const mods = [...this.value];
      const mod = this.group.modifiers.find((el) => el.modifierId === this.selectedMod);
      const idx = mods.findIndex((el) => el.groupId === this.group.modifierId);

      const addedMod = {
        ...mod,
        id: this.selectedMod,
        groupId: this.group.modifierId,
        amount: 1,
      };

      if (idx === -1) {
        mods.push(addedMod);
      } else {
        mods[idx] = addedMod;
      }
      this.$emit('input', mods);
    },
  },
  mounted() {
    // if (this.group.modifiers.length) {
    //   this.selectedMod = this.group.modifiers[0].modifierId;
    // }
  },
  methods: {
    setMod(mod) {
      this.selectedMod = mod;
    },
    isSelected(id) {
      return id === this.selectedMod;
    },

  },
};
</script>

<style lang="scss"
       scoped
>
.catalog-item-mods-one {
  // .catalog-item-mods-one__title
  &__title {
    font-size: extClamp(12);
    font-weight: 400;
    font-style: normal;
    line-height: normal;
    margin-bottom: extClamp(10);
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 18px;
      margin-bottom: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 120%;
    }
  }

  // .catalog-item-mods-one__list
  &__list {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .catalog-item-mods-one__item
  &__item {
  }
}

.catalog-item-mods-one-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: extClamp(54);
  gap: extClamp(6);

  @media screen and (min-width: 768px) {
    height: auto;
    gap: 10px;
  }

  @media screen and (min-width: 1280px) {
    height: 80px;
    gap: 10px;
  }

  // .catalog-item-mods-one-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(54);
    height: extClamp(54);

    @media screen and (min-width: 768px) {
      width: 70px;
      height: 70px;

    }

    @media screen and (min-width: 1280px) {
      width: 70px;
      height: 70px;
    }
  }

  // .catalog-item-mods-one-item__image
  &__image {
  }

  // .catalog-item-mods-one-item__name
  &__name {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    flex-grow: 1;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;

      font-weight: 600;
      line-height: 120%;
    }
  }

  // .catalog-item-mods-one-item__desc
  &__desc {
    flex: 0 0 auto;
    margin-left: auto;
  }

  // .catalog-item-mods-one-item__popup-info-wrapper
  &__popup-info-wrapper {

  }

  // .catalog-item-mods-one-item__popup-info
  &__popup-info {
    &::v-deep .popup-info__content {
      width: extClamp(260);

      @media screen and (min-width: 768px) {
        width: 383px;
      }

      @media screen and (min-width: 1280px) {
        width: 383px;
        padding: 20px 10px;
      }
    }
  }

  // .catalog-item-mods-one-item__btn
  &__btn {

    @media screen and (min-width: 768px) {
      padding: 0 10px;
      border-radius: 2000px;
    }

    @media screen and (min-width: 1280px) {
      display: flex;
      height: 30px;
      padding: 6px 20px;
    }
  }
}
</style>
