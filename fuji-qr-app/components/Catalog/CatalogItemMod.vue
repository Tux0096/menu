<template>
  <div
    v-if="group.modifiers.length"

    class="catalog-item-mod"
  >
    <div
      v-if="title"
      class="catalog-item-mod__title"
    >
      {{ title }}
    </div>
    <div
      :class="[
        `catalog-item-mod__inner--${group.modifiers.length}`,
        {'catalog-item-mod__inner--more-than-four': group.modifiers.length > 4}
      ]"
      class="catalog-item-mod__inner"
    >
      <label
        v-for="mod in group.modifiers"
        :key="mod.modifierId"
        :class="{'catalog-item-mod__item--active': mod.modifierId === selectedMod}"
        class="catalog-item-mod__item"
      >

        <input
          v-model="selectedMod"
          :value="mod.modifierId"
          class="visually-hidden"
          type="radio"
        >
        <span class="catalog-item-mod__image-wrapper">
          <img
            v-if="getModImagePath(mod.name)"
            :class="imageClass"
            :src="getModImagePath(mod.name)"
            alt=""
            class="catalog-item-mod__image"
          >
        </span>

        <span
          :class="{'catalog-item-mod__name--active': mod.modifierId === selectedMod}"
          class="catalog-item-mod__name"
        >{{ mod.name }}</span>

      </label>
    </div>
  </div>
</template>

<script>
import { getModImagePath } from '~/lib/common';

export default {
  name: 'CatalogItemMod',
  props: {
    group: {
      type: Object,
      required: true,
    },
    value: {
      type: Array,
      required: true,
    },
  },
  data() {
    return {
      selectedMod: '',
    };
  },
  computed: {
    title() {
      if ([
        '24eebba4-6b1b-455c-9fdd-046ea5ae1016',
      ].includes(this.group.modifierId)) {
        return 'Лапша на выбор';
      }
      if ([
        'c0314841-d3e5-4ff8-93d3-90eb740d7e86',
        '528ebae5-5b9a-463a-adcf-14d6a35d5af6',
      ].includes(this.group.modifierId)) {
        return 'Соус на выбор';
      }

      return '';
    },

    imageClass() {
      if ([
        '24eebba4-6b1b-455c-9fdd-046ea5ae1016',
      ].includes(this.group.modifierId)) {
        return 'catalog-item-mod__image--noodles';
      }
      if ([
        'c0314841-d3e5-4ff8-93d3-90eb740d7e86',
        '528ebae5-5b9a-463a-adcf-14d6a35d5af6',
      ].includes(this.group.modifierId)) {
        return 'catalog-item-mod__image--sauce';
      }
      return '';
    },

  },
  watch: {
    selectedMod() {
      const mods = [...this.value];
      const mod = this.group.modifiers.find((el) => el.modifierId === this.selectedMod);
      const idx = mods.findIndex((el) => el.groupId === this.group.modifierId);

      const addedMod = {
        ...mod,
        id: this.selectedMod,
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
    if (this.group.modifiers.length) {
      this.selectedMod = this.group.modifiers[0].modifierId;
    }
  },
  methods: {
    getModImagePath,

  },
};
</script>

<style lang="scss"
       scoped
>
.catalog-item-mod {
  display: flex;
  flex-direction: column;
  gap: extClamp(15);

  @media screen and (min-width: 768px) {
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .catalog-item-mod__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 32px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 140%;
    }
  }

  // .catalog-item-mod__inner
  &__inner {
    display: grid;
    flex-wrap: wrap;
    width: 100%;
    grid-template-columns: repeat(4, 1fr);
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 8px;

    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      gap: 8px;
    }

    // .catalog-item-mod__inner--3
    &--3 {
      grid-template-columns: repeat(3, 1fr);
    }

    // .catalog-item-mod__inner--3
    &--2 {
      grid-template-columns: repeat(2, 1fr);
    }

    // .catalog-item-mod__inner--more-than-four
    &--more-than-four {

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {

      }

    }
  }

  // .catalog-item-mod__item
  &__item {
    position: relative;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: center;
    width: 100%;
    padding: extClamp(6) extClamp(3);
    cursor: pointer;
    text-align: center;
    border: 1px solid #e8e8e8;
    border-radius: extClamp(10);
    background-color: #fff;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      padding: 16px;
      border-radius: 16px;
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      max-width: none;
      padding: 16px 8px;
      border-radius: 24px;
      gap: 4px;
    }

    // .catalog-item-mod__item--active
    &--active {
      border: 1px solid #993ca6;
    }
  }

  // .catalog-item-mod__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: extClamp(48);
    height: extClamp(48);

    @media screen and (min-width: 768px) {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 128px;
      height: 128px;
      margin-right: 0;
      margin-left: 0;
      padding-right: 0;
      padding-left: 0;
    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      max-width: 143px;
      height: 100px;
    }
  }

  // .catalog-item-mod__image
  &__image {
    display: block;
    width: auto;
    max-width: 100%;
    height: auto;
    max-height: 100%;

    // .catalog-item-mod__image--noodles
    &--noodles {

    }

    // .catalog-item-mod__image--sauce
    &--sauce {

    }
  }

  // .catalog-item-mod__name
  &__name {
    font-size: extClamp(9);
    font-weight: 400;
    line-height: 95%;
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 100%;
      text-align: center;
      color: var(---Main-Black, #292929);
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      line-height: 120%;
    }

  }
}
</style>
