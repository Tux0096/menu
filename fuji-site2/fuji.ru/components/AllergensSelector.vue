<template>
  <div class="allergens-selector">
    <div class="allergens-selector__inner">
      <div class="allergens-selector__list">
        <BaseCheckbox
          v-for="allergen in allergens"
          :key="`key-allergens-selector-${allergen.code}`"
          v-model="allergensModel[allergen.code]"

          class="allergens-selector__item"
        >
          {{ allergen.name }}
        </BaseCheckbox>
      </div>
      <BaseButton
        class="allergens-selector__button"
        @click="onSaveClick"
      >
        Сохранить
      </BaseButton>
    </div>
  </div>
</template>

<script>
export default {
  name: 'AllergensSelector',
  data() {
    return {
      allergensModel: [],
    };
  },
  computed: {
    allergens() {
      return this.$store.getters['setting/ALLERGENS'];
    },
  },
  created() {
    const allergens = this.$store.getters['setting/ALLERGENS'] || [];
    this.allergensModel = Object.fromEntries(allergens.map(({ code }) => [code, false]));
    this.$store.state.user.userAllergens.forEach((el) => this.allergensModel[el] = true);
  },
  methods: {
    onSaveClick() {
      const savingAllergens = Object.entries(this.allergensModel)
        .filter(([_key, value]) => value)
        .flatMap(([key]) => key);

      this.$store.commit('user/setUserAllergens', savingAllergens);
      $nuxt.$notify({
        group: 'messages',
        type: 'success',
        text: 'Список аллергенов сохранен',
      });
      this.$store.commit('modal/hideModal');
    },
  },
};
</script>

<style lang="scss" scoped>
.allergens-selector {

  // .allergens-selector__inner
  &__inner {
  }

  // .allergens-selector__list
  &__list {
    display: flex;
    flex-direction: column;
    padding-bottom: extClamp(20);
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      padding-bottom: 32px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .allergens-selector__item
  &__item {

    @media screen and (min-width: 768px) {
      min-height: 32px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .allergens-selector__button
  &__button.button {
    position: sticky;
    bottom: 0;
    width: 100%;
  }

  &::v-deep .base-checkbox__name {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {

    }
  }
}
</style>
