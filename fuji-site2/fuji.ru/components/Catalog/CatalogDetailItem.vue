<template>
  <div class="catalog-detail-item">
    <div class="catalog-detail-item__image-info-wrapper">
      <div class="catalog-detail-item__image-wrapper catalog-detail-item__image-wrapper--top">
        <nuxt-img
          :height="imagePreset.height"
          :priority="true"
          :quality="imagePreset.quality"
          :src="product.image"
          :title="product.name"
          :width="imagePreset.width"
          class="catalog-detail-item__image"
          format="webp"
        />
      </div>

      <div class="catalog-detail-item__info">
        <div class="catalog-detail-item__top">
          <div class="catalog-detail-item__image-wrapper  catalog-detail-item__image-wrapper--bottom">
            <nuxt-img
              :height="imagePreset.height"
              :priority="true"
              :quality="imagePreset.quality"
              :src="product.image"
              :title="product.name"
              :width="imagePreset.width"
              class="catalog-detail-item__image"
              format="webp"
            />
          </div>
          <div class="catalog-detail-item__top-inner">
            <div class="catalog-detail-item__title-wrapper">
              <h1 class="catalog-detail-item__title">
                {{ product.name }}
              </h1>
              <div class="catalog-detail-item__title-info catalog-detail-item__title-info--top">
                <BasePopupInformation
                  class="catalog-detail-item__popup-info"
                  root-selector=".catalog-detail-item"
                >
                  <div class="characteristic">
                    <div class="characteristic__row">
                      <div class="characteristic__item">
                        <div class="characteristic__head">
                          Белки
                        </div>
                        <div class="characteristic__col">
                          {{ fiberAmount.toFixed(1) }}
                        </div>
                      </div>
                      <div class="characteristic__item">
                        <div class="characteristic__head">
                          Жиры
                        </div>
                        <div class="characteristic__col">
                          {{ fatAmount.toFixed(1) }}
                        </div>
                      </div>
                      <div class="characteristic__item">
                        <div class="characteristic__head">
                          Углеводы
                        </div>
                        <div class="characteristic__col">
                          {{ carbohydrateAmount.toFixed(1) }}
                        </div>
                      </div>
                      <div class="characteristic__item">
                        <div class="characteristic__head">
                          Ккал
                        </div>
                        <div class="characteristic__col">
                          {{ energyAmount.toFixed(1) }}
                        </div>
                      </div>
                      <div class="characteristic__item">
                        <div class="characteristic__head">
                          &nbsp;
                        </div>
                        <div class="characteristic__col">
                          на 100 г.
                        </div>
                      </div>
                    </div>
                  </div>
                </BasePopupInformation>
                <AppLike
                  :is-liked="product.isLiked"
                  :likes-count="product.likesCount"
                  class="catalog-detail-item__like"
                  @click="onLikeClick"
                />
              </div>
            </div>
            <div class="catalog-detail-item__add-info">
              <template v-if="product.count > 0">
                {{ product.count }}шт |
              </template>
              {{ weight }} г.
            </div>
            <div
              v-if="product.description"
              class="catalog-detail-item__desc"
            >
              {{ product.description }}
            </div>
          </div>
        </div>

        <div class="catalog-detail-item__allergens-wrapper">
          <div
            v-if="allergens"
            class="catalog-detail-item__allergens catalog-detail-item__allergens--top"
          >
            <div class="allergens">
              <div class="allergens__title">
                Аллергены
              </div>
              <BasePopupInformation
                class="allergens__text"
                direction="top"
                root-selector=".catalog-detail-item"
              >
                {{ allergens }}

                <div
                  class="allergens__select"
                  @click="onAllergenClick"
                >
                  Исключить аллергены
                </div>
              </BasePopupInformation>
            </div>
          </div>
          <div class="catalog-detail-item__title-info catalog-detail-item__title-info--bottom">
            <BasePopupInformation
              class="catalog-detail-item__popup-info"
              root-selector=".catalog-detail-item"
            >
              <div class="characteristic">
                <div class="characteristic__row">
                  <div class="characteristic__item">
                    <div class="characteristic__head">
                      Белки
                    </div>
                    <div class="characteristic__col">
                      {{ fiberAmount.toFixed(1) }}
                    </div>
                  </div>
                  <div class="characteristic__item">
                    <div class="characteristic__head">
                      Жиры
                    </div>
                    <div class="characteristic__col">
                      {{ fatAmount.toFixed(1) }}
                    </div>
                  </div>
                  <div class="characteristic__item">
                    <div class="characteristic__head">
                      Углеводы
                    </div>
                    <div class="characteristic__col">
                      {{ carbohydrateAmount.toFixed(1) }}
                    </div>
                  </div>
                  <div class="characteristic__item">
                    <div class="characteristic__head">
                      Ккал
                    </div>
                    <div class="characteristic__col">
                      {{ energyAmount.toFixed(1) }}
                    </div>
                  </div>
                  <div class="characteristic__item">
                    <div class="characteristic__head">
                      &nbsp;
                    </div>
                    <div class="characteristic__col">
                      на 100 г.
                    </div>
                  </div>
                </div>
              </div>
            </BasePopupInformation>
            <AppLike
              :is-liked="product.isLiked"
              :likes-count="product.likesCount"
              class="catalog-detail-item__like"
              @click="onLikeClick"
            />
          </div>
        </div>

        <div
          v-if="CUSTOM_ADD_TO_CART_GROUPS_ID.includes(product.parentGroup) && hasMods"
          class="catalog-detail-item__inner"
        >
          <div
            v-if="CUSTOM_ADD_TO_CART_GROUPS_ID.includes(product.parentGroup) && hasMods"
            class="catalog-detail-item__mods"
          >
            <CatalogItemMod
              v-for="(group, idx) in product.groupModifiers"
              :key="group.modifierId + idx"
              v-model="modifier"
              :group="group"
              class="catalog-detail-item__mod"
            />
          </div>
        </div>

        <div
          v-if="product.composition?.length"
          class="catalog-detail-item__composition composition-list"
        >
          <div
            v-show="!isCompositionHide || isDesktop"
            class="composition-list__inner"
          >
            <div class="composition-list__title">
              Входит в заказ:
            </div>
            <div class="composition-list__list">
              <div
                v-for="(compositionItem, idx) in product.composition"
                :key="compositionItem.name + idx"
                class="composition-list__item composition-item"
              >
                <div class="composition-item__image-wrapper">
                  <nuxt-img
                    :alt="compositionItem.name"
                    :src="compositionItem.image"
                    class="composition-item__image"
                    format="webp"
                    loading="lazy"
                    quality="90"
                    width="300"
                  />
                </div>

                <div class="composition-item__name">
                  {{ compositionItem.name }}
                </div>
                <BasePopupInformation
                  class="composition-item__desc"
                  direction="top"
                  root-selector=".catalog-detail-item"
                >
                  {{ compositionItem.description }}
                </BasePopupInformation>
              </div>
            </div>
          </div>

          <div
            :class="{ 'composition-list__btn--active': !isCompositionHide }"
            class="composition-list__btn"
            @click="toggleComposition"
          >
            <div class="composition-list__name">
              <template v-if="isCompositionHide">
                Показать состав комбо
              </template>
              <template v-else>
                Свернуть состав комбо
              </template>
            </div>

            <svg
              :class="{ 'composition-list__btn-icon--active': !isCompositionHide }"
              class="composition-list__btn-icon"
            >
              <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#arrow-down" />
            </svg>
          </div>
        </div>

        <footer class="catalog-detail-item__footer">
          <AppQty
            v-if="!product.fromPromocode"
            :qty="countInCart"
            class="catalog-detail-item__qty"
            @decrease="decreaseQtyById"
            @increase="addToCart"
          />

          <CatalogPriceButton
            :class="{ 'catalog-detail-item__add-button--full': product.fromPromocode }"
            class="catalog-detail-item__add-button"
            @click="addToCart"
          >
            <template
              v-if="product.oldPrice && !product.fromPromocode"
              #old-price
            >
              {{ product.oldPrice }}<span class="rub">р</span>
            </template>
            <template v-if="product.fromPromocode">
              Добавить
            </template>
            <template v-else>
              {{ price }}₽
            </template>
          </CatalogPriceButton>
        </footer>
      </div>
    </div>
  </div>
</template>

<script>

import { mapGetters } from 'vuex';
import AppQty from '~/components/AppQty.vue';
import CatalogPriceButton from '~/components/Catalog/CatalogPriceButton.vue';
import BasePopupInformation from '~/components/Base/BasePopupInformation.vue';
import CatalogItemMod from '~/components/Catalog/CatalogItemMod.vue';

function getFiberFatCarbohydrateEnergyWeightFromMod(fieldName) {
  let result = 0;

  if (this.modifier?.length) {
    this.modifier.forEach((m) => {
      result += m[fieldName];
    });
  } else if (this.product[fieldName]) {
    result += this.product[fieldName];
  }

  return result;
}

export default {
  name: 'CatalogDetailItem',
  components: {
    CatalogItemMod, BasePopupInformation, CatalogPriceButton, AppQty,
  },
  props: {
    product: {
      type: Object,
      required: true,
    },
  },
  data() {
    return {
      modifier: [],
      isCompositionHide: true,
      isDesktop: false,
      imageLoaded: false,
    };
  },
  computed: {
    ...mapGetters({
      CUSTOM_ADD_TO_CART_GROUPS_ID: 'setting/CUSTOM_ADD_TO_CART_GROUPS_ID',
      imagePreset: 'setting/IMAGE_PRESET_CATALOG_DETAIL',
    }),
    hasMods() {
      return this.product.groupModifiers.length > 0;
    },

    price() {
      let { price } = this.product;
      if (this.modifier.length) {
        this.modifier.forEach((m) => {
          price += m.price;
        });
      }
      return price;
    },

    countInCart() {
      const products = this.$store.getters['cart/cartItems'].filter((el) => el.product.id === this.product.id);
      if (products.length > 0) {
        return products.reduce((acc, p) => acc + p.quantity, 0);
      }
      return 0;
    },

    productsInCartIds() {
      return this.$store.getters['cart/productsInCartIds'];
    },

    isProductInCart() {
      return this.productsInCartIds.includes(this.product.id);
    },

    fiberAmount() {
      return getFiberFatCarbohydrateEnergyWeightFromMod.call(this, 'fiberAmount');
    },

    fatAmount() {
      return getFiberFatCarbohydrateEnergyWeightFromMod.call(this, 'fatAmount');
    },

    carbohydrateAmount() {
      return getFiberFatCarbohydrateEnergyWeightFromMod.call(this, 'carbohydrateAmount');
    },

    energyAmount() {
      return getFiberFatCarbohydrateEnergyWeightFromMod.call(this, 'energyAmount');
    },

    weight() {
      return Math.round(getFiberFatCarbohydrateEnergyWeightFromMod.call(this, 'weight') * 1000);
    },
    hasHistory() {
      return window.history.length > 2;
    },

    allergens() {
      if (!this.product.allergens) { return ''; }

      return this.product.allergens
        .map((el) => el.name.toLocaleLowerCase())
        .join(', ');
    },
  },

  methods: {
    addToCart() {
      if (this.product.fromPromocode && this.countInCart > 0) {
        this.$store.commit('modal/hideModal');
        return;
      }

      this.$store.dispatch(
        'cart/addItem',
        {
          productId: this.product.id,
          mods: this.modifier,
          isGift: this.product.isGift,
          fromPromocode: this.product.fromPromocode,
          quantity: this.product.fromPromocode ? 1 : undefined,
        },
      );

      if (this.product.fromPromocode) {
        this.$store.commit('modal/hideModal');
      }
    },

    decreaseQtyById() {
      this.$store.dispatch('cart/decreaseQtyById', this.product.id);
    },

    async onLikeClick() {
      if (this.product.isLiked) {
        await this.$store.dispatch('user/removeLike', { product: this.product });
        this.$emit('delete-like');
      } else {
        await this.$store.dispatch('user/addLike', { product: this.product });
      }
    },
    toggleComposition() {
      this.isCompositionHide = !this.isCompositionHide;
    },

    onAllergenClick() {
      this.$store.commit('modal/showAllergensSelector');
    },

  },
};
</script>

<style lang="scss" scoped>
.catalog-detail-item {
  min-height: extClamp(400);
  padding-bottom: extClamp(36);

  @media screen and (min-width: 768px) {
    min-height: 0;
    padding-bottom: 128px;
  }

  @media screen and (min-width: 1280px) {
    padding-bottom: 0;
  }

  // .catalog-detail-item__popup-info
  &__popup-info {
    margin-left: auto;

    &::v-deep {
      .popup-info__icon-wrapper {

        @media screen and (min-width: 768px) {
        }

        @media screen and (min-width: 1280px) {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 30px;
          height: 30px;
        }
      }

      .popup-info__icon {
        @media screen and (min-width: 768px) {
          width: 24px;
          height: 24px;
        }

        @media screen and (min-width: 1280px) {
          width: 18px;
          height: 18px;
        }
      }
    }

  }

  // .catalog-detail-item__like
  &__like.like {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: extClamp(24);
    height: extClamp(24);
    cursor: pointer;

    @media screen and (min-width: 768px) {
      width: 40px;
      height: 40px;
    }

    @media screen and (min-width: 1280px) {
      width: 30px;
      height: 30px;
    }

    .like__icon {
      width: 18px;
      height: 18px;
    }

  }

  // .catalog-detail-item__image-info-wrapper
  &__image-info-wrapper {

    @media screen and (min-width: 768px) {
      display: flex;
      padding-top: 24px;
      gap: 8px;

    }

    @media screen and (min-width: 1280px) {
      display: flex;
      align-items: center;
      padding-top: 0;
      gap: 36px;

    }

  }

  // .catalog-detail-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: extClamp(280);
    margin-bottom: extClamp(12);

    @media screen and (min-width: 768px) {
      flex-shrink: 0;
      width: 294px;
      height: 294px;
      margin-bottom: 10px;
    }

    @media screen and (min-width: 1280px) {
      width: 50%;
      height: 650px;
      margin-bottom: 0;
    }

    // .catalog-detail-item__image-wrapper--top
    &--top {

      @media screen and (min-width: 768px) {
        display: none;
      }

      @media screen and (min-width: 1280px) {
        display: flex;
      }
    }

    // .catalog-detail-item__image-wrapper--bottom
    &--bottom {
      display: none;

      @media screen and (min-width: 768px) {
        display: flex;
      }

      @media screen and (min-width: 1280px) {
        display: none;
      }
    }

  }

  // .catalog-detail-item__image
  &__image {
    width: 100%;
  }

  // .catalog-detail-item__top
  &__top {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      align-items: center;
      flex-direction: row;
      justify-content: flex-start;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
    }
  }

  // .catalog-detail-item__top-inner
  &__top-inner {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      width: 100%;
      gap: 20px;
    }
  }

  // .catalog-detail-item__info
  &__info {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      width: 100%;
      padding-bottom: 36px;
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {
      flex-grow: 1;
      justify-content: flex-start;
      width: calc(50% - 18px);
      padding-top: 0;
      padding-bottom: 0;
      gap: 24px;
    }

  }

  // .catalog-detail-item__title-wrapper
  &__title-wrapper {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      padding-top: 24px;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
    }
  }

  // .catalog-detail-item__title-info
  &__title-info {
    display: flex;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      margin-left: auto;
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      gap: 8px;
    }

    // .catalog-detail-item__title-info--bottom
    &--top {
      @media screen and (min-width: 768px) {
        display: none;
      }

      @media screen and (min-width: 1280px) {
        display: flex;
      }
    }

    // .catalog-detail-item__title-info--bottom
    &--bottom {
      display: none;

      @media screen and (min-width: 768px) {
        display: flex;
      }

      @media screen and (min-width: 1280px) {
        display: none;
      }
    }
  }

  // .catalog-detail-item__title
  &__title {

    font-size: extClamp(16);
    font-weight: 600;
    font-style: normal;
    line-height: 100%;
    color: var(---Main-Black, #292929);
    font-feature-settings: 'liga' off, 'clig' off;

    @media screen and (min-width: 768px) {
      font-size: 32px;
      font-weight: 600;
      line-height: 100%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 36px;
      font-weight: 600;
      font-style: normal;
      line-height: 100%;

    }
  }

  // .catalog-detail-item__inner
  &__inner {
  }

  // .catalog-detail-item__add-info
  &__add-info {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    opacity: 0.6;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 20px;
      font-weight: 600;
      line-height: 100%;
    }
  }

  // .catalog-detail-item__desc
  &__desc {
    font-size: extClamp(9);
    font-weight: 400;
    font-style: normal;
    line-height: 120%;
    opacity: 0.6;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      min-height: 110px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 500;
      line-height: 120%;
      min-height: 0;
      color: var(---Main-Black, #292929);
    }
  }

  // .catalog-detail-item__allergens-wrapper
  &__allergens-wrapper {
    display: flex;
    justify-content: space-between;

    @media screen and (min-width: 768px) {
    }

    @media screen and (min-width: 1280px) {
    }
  }

  // .catalog-detail-item__allergens
  &__allergens {

    @media screen and (min-width: 768px) {
    }

    @media screen and (min-width: 1280px) {
    }

    // .catalog-detail-item__allergens--bottom
    &--bottom {
      display: block;

      @media screen and (min-width: 768px) {
      }

      @media screen and (min-width: 1280px) {
        display: none;
      }
    }

  }

  // .catalog-detail-item__mods
  &__mods {
    display: flex;
    flex-direction: column;
    gap: extClamp(16);

    @media screen and (min-width: 768px) {
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {
      gap: 40px;
    }
  }

  // .catalog-detail-item__mod
  &__mod {
  }

  // .catalog-detail-item__composition
  &__composition {
  }

  // .catalog-detail-item__footer
  &__footer {
    position: fixed;
    z-index: 1;
    right: extClamp(12);
    bottom: 0;
    left: extClamp(12);
    display: flex;
    align-items: flex-start;
    padding-right: 0;
    padding-bottom: extClamp(12);
    padding-left: 0;
    border-radius: extClamp(12) extClamp(12) 0 0;
    background: var(---Main-White, #fff);
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      right: 16px;
      bottom: 0;
      left: 16px;
      padding-bottom: 64px;
      gap: 36px;
    }

    @media screen and (min-width: 1280px) {
      position: static;
      margin-top: 12px;
      padding: 0;
      gap: 12px;
    }
  }

  // .catalog-detail-item__add-button
  &__add-button {
    width: 50%;

    @media screen and (min-width: 768px) {
      height: 64px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 100%;
      text-align: center;
      color: var(---Main-Purple, #993ca6);
      border-width: 2px;
      border-radius: 16px;
    }

    &--full {
      width: 100%;
    }
  }

  // .catalog-detail-item__qty
  &__qty.qty {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    display: flex;
    align-items: center;
    flex-grow: 1;
    justify-content: center;
    width: 50%;
    height: extClamp(36);
    padding: extClamp(10) extClamp(12);
    text-align: center;
    color: var(---Main-Purple, #993ca6);
    border-radius: extClamp(12);
    background: var(---Primary-LightPurple, #f5ecf6);
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      max-width: 252px;
      height: 64px;
      padding: 20px 32px;
      border-radius: 32px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 100%;
      max-width: none;
      border-radius: 16px;
    }
  }

  // .catalog-detail-item__characteristic
  &__characteristic {
    @media screen and (min-width: 768px) {
    }

    @media screen and (min-width: 1280px) {
    }
  }
}

.characteristic {
  font-weight: 400;
  position: relative;
  margin-block: extClampNegative(5);

  &::before {

    position: absolute;
    top: extClamp(20);
    right: extClamp(-10);
    left: extClamp(-10);
    height: 1px;
    content: '';
    opacity: 0.2;
    background-color: #ccc;

    @media screen and (min-width: 768px) {
      top: 50%;
      right: -12px;
      left: -12px;
    }

    @media screen and (min-width: 1280px) {
    }
  }

  // .characteristic__row
  &__row {
    display: flex;
    justify-content: space-around;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
    }

  }

  // .characteristic__item
  &__item {
    font-size: extClamp(9);
    font-weight: 400;
    line-height: 120%;
    display: flex;
    align-items: center;
    flex-direction: column;
    text-align: center;

    gap: extClamp(19);

    @media screen and (min-width: 768px) {
      font-size: 10px;
      gap: 16px;

    }

    @media screen and (min-width: 1280px) {
      font-size: 10px;
      font-weight: 400;
      line-height: 120%;
      gap: 20px;
    }
  }

  // .characteristic__head
  &__head {
  }

  // .characteristic__col
  &__col {
    white-space: nowrap;
  }
}

.composition-list {
  display: flex;
  align-items: center;
  flex-direction: column;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    gap: 24px;
  }

  @media screen and (min-width: 1280px) {
    align-items: flex-start;
  }

  // .composition-list__inner
  &__inner {
    display: flex;
    flex-direction: column;
    width: 100%;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 20px;
    }
  }

  // .composition-list__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    display: none;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 140%;
    }

  }

  // .composition-list__list
  &__list {
    display: flex;
    flex-direction: column;
    gap: extClamp(12);

    @media screen and (min-width: 768px) {
      gap: 24px;
    }

    @media screen and (min-width: 1280px) {
      gap: 12px;
    }

  }

  // .composition-list__item
  &__item {
    width: 100%;

    @media screen and (min-width: 768px) {
    }

    @media screen and (min-width: 1280px) {
    }
  }

  // .composition-list__btn
  &__btn {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: extClamp(12);
    cursor: pointer;
    text-align: center;
    white-space: nowrap;
    color: var(---Primary-Gray, #969696);
    border-radius: extClamp(28);
    background: #f0f0f0;
    background: var(---Primary-LightGray, #f5f5f5);
    gap: extClamp(5);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      font-weight: 600;
      font-style: normal;
      line-height: 100%;
      /* 20px */
      display: flex;
      align-items: center;
      justify-content: center;
      width: auto;
      padding: 16px 32px;
      text-align: center;
      color: var(---Primary-Gray, #969696);
      border-radius: 2000px;
      background: var(---Primary-LightGray, #f5f5f5);
      gap: 24px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      font-weight: 600;
      font-style: normal;
      line-height: 100%;
      margin-right: auto;
      margin-left: auto;
      padding: 10px 16px;
      text-align: center;
      gap: 8px;

    }

    // .composition-list__btn--active
    &--active {
      color: #993ca6;
      background: #f5ecf6;

    }
  }

  // .composition-list__name
  &__name {
    flex-grow: 1;
  }

  // .composition-list__btn-icon
  &__btn-icon {
    width: extClamp(14);
    height: extClamp(14);
    justify-self: flex-end;

    @media screen and (min-width: 768px) {
      width: 18px;
      height: 18px;
    }

    @media screen and (min-width: 1280px) {
      width: 18px;
      height: 18px;
    }

    // .composition-list__btn-icon--active
    &--active {
      transform: rotate(180deg);

    }
  }
}

.composition-item {
  display: flex;
  align-items: center;
  gap: extClamp(8);

  @media screen and (min-width: 768px) {
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {
    gap: 10px;
  }

  // .composition-item__image-wrapper
  &__image-wrapper {
    display: flex;
    align-items: center;
    flex: 0 0 auto;
    justify-content: center;
    width: extClamp(54);
    height: extClamp(54);

    @media screen and (min-width: 768px) {
      width: 200px;
      height: 200px;
    }

    @media screen and (min-width: 1280px) {
      width: 100px;
      height: 100px;
    }
  }

  // .composition-item__image
  &__image {
  }

  // .composition-item__name
  &__name {
    font-size: extClamp(12);
    font-weight: 600;
    line-height: 120%;
    flex-grow: 1;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 20px;
      line-height: normal;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
      line-height: 140%;
    }
  }

  // .composition-item__desc
  &__desc {

    &::v-deep .popup-info__content {
      min-width: extClamp(274);

      @media screen and (min-width: 768px) {
      }

      @media screen and (min-width: 1280px) {
        border-radius: 8px;
      }
    }

  }
}

.allergens {
  display: flex;
  align-items: center;
  gap: extClamp(6);

  @media screen and (min-width: 768px) {
    gap: 8px;
  }

  @media screen and (min-width: 1280px) {
  }

  // .allergens__title
  &__title {
    font-size: extClamp(12);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;

      line-height: 140%;
    }
  }

  // .allergens__text
  &__text {
  }

  // .allergens__select
  &__select {
    font-size: extClamp(10);
    font-weight: 600;
    font-style: normal;
    line-height: 120%;
    margin-top: extClamp(8);
    color: var(---Main-Purple, #993ca6);
    text-decoration-line: underline;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 140%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 12px;
      line-height: 120%;
    }
  }
}
</style>
