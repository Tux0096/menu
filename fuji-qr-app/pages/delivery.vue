<template>
  <div class="page-content">
    <div class="page-delivery">
      <div class="page-delivery__inner">
        <div class="page-delivery__info delivery-info">
          <div class="delivery-info__header">
            <AppCitySelector class="delivery-info__city-btn" />
          </div>
          <div class="delivery-info__line" />
          <div class="delivery-info__item delivery-info-item">
            <div class="delivery-info-item__title">
              Контактная информация:
            </div>
            <div class="delivery-info-item__inner">
              <svg class="delivery-info-item__icon">
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#phone-2" />
              </svg>
              <div class="delivery-info-item__content">
                <template v-if="isTolyatti">
                  <p><b>{{ phoneDeliveryService }} </b>- коллцентр</p>
                  <p><b>*802</b> - короткий номер коллцентр </p>
                </template>
                <template v-else>
                  <p><b>{{ phoneDeliveryService }}</b> - коллцентр</p>
                  <p><b>*802</b> - короткий номер коллцентр <br></p>
                  <p><b>+7 937 064-3333</b> - отдел франчайзинга <br></p>
                  <p><b>8 846 244-07-77</b> - городской номер отдела франчайзинга <br></p>
                </template>
              </div>
            </div>
          </div>
          <div class="delivery-info__line" />
          <div class="delivery-info__item delivery-info-item">
            <div class="delivery-info-item__title">
              Часы работы:
            </div>
            <div class="delivery-info-item__inner">
              <svg class="delivery-info-item__icon">
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#time" />
              </svg>
              <div class="delivery-info-item__content">
                <span
                  v-if="$store.getters['city/cityData']?.workTime1"
                  class="delivery-info-item__content-work-time"
                  v-html="$store.getters['city/cityData']?.workTime1"
                />
                <span
                  v-if="$store.getters['city/cityData']?.workTime2"
                  class="delivery-info-item__content-work-time"
                  v-html="$store.getters['city/cityData']?.workTime2"
                />
              </div>
            </div>
          </div>
          <div class="delivery-info__line" />
          <div class="delivery-info__item delivery-info-item">
            <div class="delivery-info-item__title">
              Условие заказа
            </div>
            <div class="delivery-info-item__inner">
              <svg class="delivery-info-item__icon">
                <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#address" />
              </svg>
              <div class="delivery-info-item__content">
                Доставка в {{ $store.getters['city/cityIn'] }} <b>- от 590р</b><br>
                Стоимость доставки <b>{{ deliveryCost }}р</b>
                <template v-if="serviceFeeCost">
                  <br>Сервисный сбор <b>{{ serviceFeeCost }}р</b>
                </template>
              </div>
            </div>
          </div>
        </div>
        <div class="page-delivery__map delivery-map">
          <div
            class="delivery-map__map"
            v-html="mapIframe"
          />
        </div>
      </div>

      <div
        v-if="restList.length || selfPoints.length"
        class="page-delivery__list restaurants"
      >
        <AppDeliveryFilter
          :is-rest-show="restList.length > 0"
          :is-self-show="selfPoints.length > 0"
          :mode="filterMode"
          class="restaurants__filter"
          @select="setFilterMode"
        />
        <div class="restaurants__inner">
          <AppRestaurant
            v-for="(item, idx) in deliveryItems"
            :key="idx"
            :number="idx + 1"
            :rest="item"
            class="restaurants__restaurant"
          />
        </div>
      </div>

      <AppMainTextBlock
        v-if="content"
        class="page-delivery__text"
      >
        <template #title>
          {{ content.title }}
        </template>
        <div v-html="content.text " />
      </AppMainTextBlock>
    </div>
  </div>
</template>

<script>

export default {
  name: 'PageDelivery',
  data() {
    return {
      filterMode: null,
      content: null,
    };
  },
  async fetch() {
    const cityId = this.$store.getters['city/cityIikoId'];
    this.content = await this.$axios.$get(`${this.$config.FRONT_API_URL}/api/v1/page/delivery/${cityId}`);
  },
  head() {
    return {
      title: `Условия доставки и оплаты в ${this.$store.getters['city/cityIn']} Фуджи Суши Friends`,
      meta: [
        {
          hid: 'description',
          name: 'description',
          // eslint-disable-next-line max-len,vue/max-len
          content: `Здесь вы можете ознакомиться с условиями доставки и оплаты в ${this.$store.getters['city/cityIn']}, районам доставки, минимальными суммами для бесплатной доставки.`,
        },
      ],
    };
  },
  computed: {

    mapIframe() {
      return this.$store.getters['city/cityData'].mapIframe;
    },

    isTolyatti() {
      return this.$store.getters['city/isTolyatti'];
    },
    restList() {
      return this.$store.getters['city/cityData'].restList;
    },
    selfPoints() {
      const restaurants = this.$store.getters['setting/RESTAURANT_LIST'];
      const filteredRests = restaurants.filter((rest) => rest.isRestHide !== true);

      return filteredRests.map((r) => ({
        colorClass: '',
        address: r.address,
        phone: '',
        times: r.times?.length ? r.times : [],
      }));
    },
    deliveryCost() {
      return this.$store.getters['city/deliveryCost'];
    },
    deliveryItems() {
      if (this.filterMode === 'rest') {
        return this.restList;
      }
      if (this.filterMode === 'self') {
        return this.selfPoints;
      }
      return [];
    },
    phoneDeliveryService() {
      return this.$store.getters['setting/phoneDeliveryService'];
    },
    serviceFeeCost() {
      return this.$store.getters['city/serviceFeeCost'];
    },
  },
  watch: {
    '$store.state.city.city': function () {
      this.filterMode = this.restList.length > 0 ? 'rest' : 'self';
      this.$fetch();
    },
  },
  created() {
    this.filterMode = this.restList.length > 0 ? 'rest' : 'self';
  },

  methods: {
    setFilterMode(mode) {
      this.filterMode = mode;
    },
  },
};
</script>

<style lang="scss"
       scoped
>

.page-delivery {

  // .page-delivery__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(20);

    @media screen and (min-width: 768px) {
      gap: 40px;
    }

    @media screen and (min-width: 1280px) {
      position: relative;
      flex-direction: row;
    }

  }

  // .page-delivery__info
  &__info {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      position: relative;
      z-index: 1;
      margin-top: 30px;
      margin-bottom: 30px;
      margin-left: 30px;
    }

  }

  // .page-delivery__map
  &__map {

  }

  // .page-delivery__list
  &__list {
    margin-top: extClamp(20);

    @media screen and (min-width: 768px) {
      margin-top: 36px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .page-delivery__text
  &__text {
    margin-top: extClamp(12);
    padding-bottom: 0;

    @media screen and (min-width: 768px) {
      margin-top: 60px;
    }

    @media screen and (min-width: 1280px) {

    }

    &::v-deep {

      h4 {
        font-weight: 500;
        margin: extClamp(12) 0;
        color: #993ca6;

        @media screen and (min-width: 768px) {
          margin: 16px 0;
        }

        @media screen and (min-width: 1280px) {

        }
      }

      h5 {
        margin: extClamp(12) 0;
        color: #993ca6;

        @media screen and (min-width: 768px) {
          margin: 16px 0;
        }

        @media screen and (min-width: 1280px) {

        }
      }

      img {
        display: inline-block;
        width: auto;
        margin: extClamp(12) 0;

        @media screen and (min-width: 768px) {
          margin: 16px 0;
        }

        @media screen and (min-width: 1280px) {

        }
      }

      p {

      }

      .main-text-block__text {
        font-size: extClamp(13);
        font-weight: 400;
        line-height: 120%;
        color: var(---Main-Black, #292929);

        @media screen and (min-width: 768px) {
          font-size: 14px;
        }

        @media screen and (min-width: 1280px) {

        }
      }
    }
  }
}

.delivery-info {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  padding: extClamp(20) extClamp(10);
  border-radius: extClamp(20);
  background-color: #f6f6f6;
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    padding: 24px 16px;
    border-radius: extClamp(16);
    gap: 24px;
  }

  @media screen and (min-width: 1280px) {
    padding: 16px;
    border-radius: 16px;
    gap: 20px;
  }

  // .delivery-info__line
  &__line {
    width: 100%;
    height: 1px;
    background-color: #e8e8e8;

  }

  // .delivery-info__header
  &__header {
    width: 100%;
  }

  // .delivery-info__city-btn
  &__city-btn {
    width: 100%;
  }

  // .delivery-info__item
  &__item {
  }
}

.delivery-info-item {
  display: flex;
  align-items: flex-start;
  flex-direction: column;
  gap: extClamp(20);

  @media screen and (min-width: 768px) {

    gap: 20px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .delivery-info-item__title
  &__title {
    font-size: extClamp(12);
    font-weight: 400;
    line-height: normal;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;

    }

    @media screen and (min-width: 1280px) {

    }

  }

  // .delivery-info-item__inner
  &__inner {
    display: flex;
    align-items: flex-start;
    width: extClamp(280);
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      width: 100%;
      gap: 24px;
    }

    @media screen and (min-width: 1280px) {
      gap: 16px;
    }

  }

  // .delivery-info-item__icon
  &__icon {
    flex-shrink: 0;
    width: extClamp(24);
    height: extClamp(24);
    color: #993ca6;

    @media screen and (min-width: 768px) {
      width: 32px;
      height: 32px;
    }

    @media screen and (min-width: 1280px) {
      width: 24px;
      height: 24px;
    }
  }

  // .delivery-info-item__content
  &__content {
    font-size: extClamp(11);
    font-weight: 400;
    line-height: 140%;
    color: #292929;

    @media screen and (min-width: 768px) {
      font-size: 16px;
      font-weight: 600;
      line-height: 140%;
    }

    @media screen and (min-width: 1280px) {
      font-size: 14px;
    }

    &::v-deep b,
    b {
      font-weight: 600;
      color: #993ca6;

      @media screen and (min-width: 768px) {
        font-weight: 700;
      }

      @media screen and (min-width: 1280px) {
        font-weight: 600;
      }

    }

    > p {
      margin: 0;

      @media screen and (min-width: 768px) {
        margin-bottom: 5px;
      }

      @media screen and (min-width: 1280px) {
        margin-bottom: 5px;
      }
    }

    > p:not(:first-child) {

    }
  }

  // .delivery-info-item__content-work-time
  &__content-work-time {
    display: block;
  }
}

.delivery-map {
  overflow: hidden;
  width: 100%;
  border-radius: extClamp(20);

  @media screen and (min-width: 768px) {
    border-radius: 20px;
  }

  @media screen and (min-width: 1280px) {
    border-radius: 40px;
  }

  // .delivery-map__map
  &__map {
    height: extClamp(350);

    @media screen and (min-width: 768px) {
      height: 350px;
    }

    @media screen and (min-width: 1280px) {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      overflow: hidden;
      height: 100%;
      border-radius: 40px;
    }

    &::v-deep > iframe {
      width: 100%;
      height: 100%;
    }
  }
}

.restaurants {
  display: flex;
  flex-direction: column;
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    gap: 36px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .restaurants__title
  &__title {

  }

  // .restaurants__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      flex-direction: row;
      flex-wrap: wrap;
    }
  }

  // .restaurants__filter
  &__filter {

  }

  // .restaurants__restaurant
  &__restaurant {
    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      width: calc(100% / 3 - 20px);
    }
  }
}

</style>
