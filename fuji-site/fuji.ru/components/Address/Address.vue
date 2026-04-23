<template>
  <div class="address">
    <div class="address__header">
      <div
        v-if="icon"
        class="address__icon"
      >
        <lord-icon
          :src="`/assets/libs/icon-json/${icon}.json`"
          colors="primary:#ffc1a7,secondary:#ff6523"
          style="width:72px;height:72px"
          trigger="loop"
        />
      </div>

      <div class="address__title">
        {{ title }}
      </div>
    </div>

    <div
      :class="{'address__line--hide': isKeyboardShow}"
      class="address__line"
    />

    <div
      v-show="step === STEPS.STREET"
      id="map"
      ref="map"
      v-touch:swipe.stop
      :class="{'address__map--collapsed': isKeyboardShow}"
      class="address__map"
    />
    <div
      v-if="step === STEPS.STREET"
      class="address__item address-street"
    >
      <div class="address-street__inner">
        <BaseSelect
          v-model="streetModel"
          :items="streets"
          option-name="nameWithCity"
          placeholder="Введите улицу в этом поле и выберите из списка"
          @input="setMapMarker(true)"
        />
        <BaseInput
          key="home"
          v-model="address.home"
          maxlength="10"
          placeholder="Номер дома"
          @input="setMapMarker(true)"
        />
      </div>

      <BaseGradientButton
        class="address-street__btn"
        type="outline"
        @click="setStep(STEPS.APARTMENT)"
      >
        Продолжить
      </BaseGradientButton>
    </div>
    <div
      v-if="step === STEPS.APARTMENT"
      class="address__item address-apartment"
    >
      <div
        class="address-apartment__back"
        @click="setStep(STEPS.STREET)"
      >
        <svg class="address-apartment__back-icon">
          <use xlink:href="~/assets/images/icons/svg/sprite-v2.svg#address-apartment-back-icon" />
        </svg>
        Назад
      </div>

      <div class="address-apartment__inner">
        <BaseInput
          key="housing"
          v-model="address.housing"
          maxlength="10"
          placeholder="Корпус"
        />
        <BaseInput
          key="apartment"
          v-model="address.apartment"
          maxlength="10"
          placeholder="Квартира | офис"
        />

        <BaseInput
          key="entrance"
          v-model="address.entrance"
          maxlength="10"
          placeholder="Подъезд"
        />
        <BaseInput
          key="floor"
          v-model="address.floor"
          maxlength="10"
          placeholder="Этаж"
        />
        <BaseInput
          key="doorphone"
          v-model="address.doorphone"
          maxlength="10"
          placeholder="Домофон"
        />
        <BaseCheckbox v-model="address.isPrivateHouse">
          Частный дом
        </BaseCheckbox>
      </div>

      <BaseGradientButton
        class="address-apartment__btn"
        @click="checkAddress"
      >
        Сохранить
      </BaseGradientButton>
    </div>

    <div
      v-if="step === STEPS.WRONG"
      class="address__item address-wrong"
    >
      <BaseGradientButton
        class="address-wrong__btn"
        color="#FF0D00"
        type="outline"
        @click="setStep(STEPS.STREET)"
      >
        Изменить
      </BaseGradientButton>
    </div>
  </div>
</template>

<script lang="ts">
import { Geolocation } from '@capacitor/geolocation';
import CYandexMap from '@/lib/CYandexMap';
import GeolocationService from '~/modules/geolocation/geolocation.service';
import BaseGradientButton from '~/components/Base/BaseGradientButton.vue';
import { Keyboard } from '@capacitor/keyboard';
import keyboard from 'swiper/src/components/keyboard/keyboard';

enum STEPS {
  STREET = 'street',
  APARTMENT = 'apartment',
  WRONG = 'wrong',
}

export default {
  name: 'AddressIndex',
  components: { BaseGradientButton },
  data() {
    return {
      step: STEPS.STREET,
      STEPS,
      streets: [],
      isFetching: false,
      streetModel: null,

      address: this.getInitialAddress(),

      //
      timerId: null,
      placemark: null,

      mapHeight: null,
      isKeyboardShow: false,
    };
  },
  computed: {
    keyboard() {
      return keyboard;
    },

    icon() {
      return {
        [STEPS.APARTMENT]: 'path',
        [STEPS.WRONG]: 'wrong',
      }[this.step];
    },

    title() {
      return {
        [STEPS.STREET]: 'Адрес доставки',
        [STEPS.APARTMENT]: `${this.address.street}, ${this.address.home}`,
        [STEPS.WRONG]: 'Ваш адрес находится вне зоны доставки',
      }[this.step];
    },
    mapData() {
      return this.$store.getters['setting/ZONES_BY_CITY_ID'];
    },
  },

  watch: {
    streetModel(street) {
      this.address.street = street?.name ?? null;
      this.address.streetId = street?.iikoId ?? null;
    },
    step(value: STEPS) {
      const { modalInstance } = this.$store.state.modal;
      modalInstance.isCloseButtonHideValue = value === STEPS.APARTMENT;
    },

  },
  created() {
    Keyboard.addListener('keyboardWillShow', (info) => {
      this.isKeyboardShow = true;
    });

    Keyboard.addListener('keyboardWillHide', () => {
      this.isKeyboardShow = false;
    });
  },
  beforeDestroy() {
    this.map?.map?.destroy();
  },

  async mounted() {
    this.streets = this.$store.getters['city/cladr'];
    await this.initMap();
  },
  methods: {

    setStep(step) {
      if (this.step === STEPS.STREET) {
        if (!this.address?.street?.trim()?.length || !this.address?.home?.trim()?.length) {
          this.$notify({
            group: 'messages',
            type: 'error',
            text: 'Улицу и дом нужно обязательно заполнить',
          });
          return;
        }
      }
      this.step = step;
    },
    async initMap() {
      const coordinates = this.mapData.mapCenter;
      // try {
      //   const currentPosition = await Geolocation.getCurrentPosition();
      //   coordinates = currentPosition.coords;
      // } catch (e) {
      //   coordinates = this.mapData.mapCenter;
      // }

      await this.setAddressComponentFromCoordinates(coordinates);

      const YANDEX_MAPS_API_KEY = this.$store.getters['setting/YANDEX_MAPS_API_KEY'];
      this.map = new CYandexMap(YANDEX_MAPS_API_KEY);
      await this.map.init(
        'map',
        {
          center: [this.mapData.mapCenter.longitude, this.mapData.mapCenter.latitude],
          zoom: this.mapData.mapZoom,
          controls: [],
        },
        this.mapData.mapZones,
        true,
      );

      // eslint-disable-next-line no-undef
      this.placemark = new ymaps.Placemark(
        [coordinates.longitude, coordinates.latitude],
        {},
        {
          draggable: false,
        },
      );

      this.placemark.events.add('dragend', async (e) => {
        const [longitude, latitude] = e.get('target').geometry.getCoordinates();

        await this.setAddressComponentFromCoordinates({ latitude, longitude });
      });

      // this.map.map.events.add('click', async (e) => {
      //   const clickedCoordinates = e.get('coords');
      //   const [longitude, latitude] = clickedCoordinates;
      //
      //   this.placemark.geometry.setCoordinates([longitude, latitude]);
      //   this.map.map.geoObjects.add(this.placemark);
      //
      //   await this.setAddressComponentFromCoordinates({ latitude, longitude });
      // });

      // this.map.map.geoObjects.add(this.placemark);
      this.map.map.setCenter([coordinates.longitude, coordinates.latitude]);
    },
    async checkAddress() {
      if (!this.address.isPrivateHouse && !this.address.apartment
      ) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Квартира должна быть заполнена',
        });
        return;
      }

      const cityData = this.$store.getters['city/cityData'];

      const rawAddressData = {
        region: cityData.region,
        city: this.streetModel.cityName,
        street: this.address.street,
        home: this.address.home,
      } as { region: string; city: string; street: string; home: string };

      const address = GeolocationService
        .createValidAddressForRequest(rawAddressData);

      const zone = await this.map.getZone(address);

      if (!zone) {
        this.setStep(STEPS.WRONG);
        return;
      }

      const zoneId = this.map.getZoneId(zone);

      if (!zoneId) {
        this.address = this.getInitialAddress();
        this.setStep(STEPS.WRONG);
        return;
      }
      this.address.zoneId = zoneId;
      try {
        await this.$store.dispatch('address/createAddress', this.address);
        this.$notify({
          group: 'messages',
          type: 'success',
          text: 'Адрес входит в зону доставки!',
        });
        this.$store.commit('modal/hideModal');
      } catch (e) {
        this.$notify({
          group: 'messages',
          type: 'error',
          text: 'Произошла ошибка при создании адреса!',
        });
      }
    },
    getInitialAddress() {
      return {
        city: this.$store.getters['city/cityName'],
        // step street
        street: null,
        home: null,

        // step apartment
        apartment: null,
        entrance: null,
        floor: null,
        housing: null,
        doorphone: null,
        isPrivateHouse: false,

        //
        zoneId: null,
      };
    },
    async setAddressComponentFromCoordinates(coordinates) {
      if (!coordinates.latitude || !coordinates.longitude) {
        return;
      }
      const YANDEX_MAPS_API_KEY = this.$store.getters['setting/YANDEX_MAPS_API_KEY'];
      const geoLocationInstance = await GeolocationService.create(coordinates, YANDEX_MAPS_API_KEY);

      return;

      const definedStreet = geoLocationInstance.getStreet();
      const definedHouse = geoLocationInstance.getHouse();

      if (definedStreet) {
        const deletingKindStreetPattern = /(улица|проспект|бульвар|площадь|переулок|набережная|проезд)/gi;
        const cityName = this.$store.getters['city/cityName'];
        const street = this.streets.find((s) => {
          const normalizedDefinedStreet = definedStreet
            .replace(deletingKindStreetPattern, '')
            .trim()
            .toLowerCase();

          const normalizedStreet = s.name
            .replace(deletingKindStreetPattern, '')
            .trim()
            .toLowerCase();

          return normalizedDefinedStreet === normalizedStreet && cityName === s.cityName;
        });

        if (street) {
          this.streetModel = street;
          if (definedHouse) {
            this.address.home = definedHouse;
          } else {
            this.address.home = null;
          }
        }
      } else {
        this.streetModel = null;
        this.address.home = null;
      }
    },

    setMapMarker(isSetCenterMap = false) {
      clearTimeout(this.timerId);

      this.timerId = setTimeout(async () => {
        if (!this.map.map) {
          return;
        }
        if (this.address?.street?.trim()?.length && this.address?.home?.trim()?.length) {
          const cityData = this.$store.getters['city/cityData'];
          const rawAddressData = {
            region: cityData.region,
            city: this.streetModel.cityName,
            street: this.address.street,
            home: this.address.home,
          } as { region: string; city: string; street: string; home: string };

          const address = GeolocationService
            .createValidAddressForRequest(rawAddressData);

          const coordinates = await GeolocationService.getCoordinatesByAddress(address);
          this.placemark.geometry.setCoordinates([coordinates.longitude, coordinates.latitude]);
          this.map.map.geoObjects.add(this.placemark);
          if (isSetCenterMap) {
            this.map.map.setCenter([coordinates.longitude, coordinates.latitude]);
          }
        }
      }, 500);
    },

  },

};
</script>

<style lang="scss"
       scoped
>
.address {
  display: flex;
  flex-direction: column;
  gap: extClamp(12);

  @media screen and (min-width: 768px) {
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {

  }

  // .address__header
  &__header {
    display: flex;
    align-items: center;
    flex-direction: column;
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      gap: 20px;
    }

    @media screen and (min-width: 1280px) {
      gap: 16px;
    }
  }

  // .address__icon
  &__icon {

  }

  // .address__line
  &__line {
    flex-shrink: 0;
    height: 1px;
    background: #e8e8e8;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {

    }

    // .address__line--hide
    &--hide {
      display: none;

      @media screen and (min-width: 768px) {
        display: block;
      }

      @media screen and (min-width: 1280px) {
        display: block;
      }
    }
  }

  // .address__title
  &__title {
    font-size: extClamp(16);
    font-weight: 500;
    line-height: 120%;
    text-align: center;
    color: var(---Main-Black, #292929);

    @media screen and (min-width: 768px) {
      font-size: 24px;
      font-weight: 500;
    }

    @media screen and (min-width: 1280px) {
      font-size: 24px;
      line-height: 100%;
    }
  }

  // .address__map
  &__map {
    overflow: hidden;
    min-height: 250px;
    transition: all 0.1s;
    border-radius: 20px;
    @media screen and (min-width: 768px) {

      min-height: 250px;
    }

    @media screen and (min-width: 1280px) {
      min-height: 250px;
    }

    &--collapsed {
      height: 100px;
      min-height: 100px;

      @media screen and (min-width: 768px) {
        height: 250px;
        min-height: 250px;
      }

      @media screen and (min-width: 1280px) {
        height: 250px;
        min-height: 250px;
      }
    }

  }

  // .address__item
  &__item {
  }

}

.address-street {
  display: flex;
  flex-direction: column;
  gap: extClamp(10);

  @media screen and (min-width: 768px) {
    gap: 16px;
  }

  @media screen and (min-width: 1280px) {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
  }

  // .address-street__inner
  &__inner {
    display: flex;
    flex-direction: column;
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .address-street__btn
  &__btn {
    width: 100%;
  }
}

.address-apartment {
  display: flex;
  flex-direction: column;
  gap: extClamp(20);

  @media screen and (min-width: 768px) {
    gap: 20px;
  }

  @media screen and (min-width: 1280px) {
    width: 100%;
    margin-right: auto;
    margin-left: auto;
  }

  // .address-apartment__back
  &__back {
    font-size: extClamp(12);
    font-weight: 400;
    line-height: 140%;
    position: absolute;
    top: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #993ca6;
    gap: extClamp(4);

    @media screen and (min-width: 768px) {
      font-size: 0;
      gap: 10px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 16px;
    }

  }

  // .address-apartment__back-icon
  &__back-icon {
    width: extClamp(20);
    height: extClamp(20);

    @media screen and (min-width: 768px) {
      width: 18px;
      height: 18px;
    }

    @media screen and (min-width: 1280px) {
      width: 20px;
      height: 20px;
    }

  }

  // .address-apartment__inner
  &__inner {
    display: grid;
    align-items: center;
    gap: extClamp(10);
    grid-template-columns: repeat(2, 1fr);

    @media screen and (min-width: 768px) {
      gap: 8px;
    }

    @media screen and (min-width: 1280px) {
      gap: 10px;
    }
  }

  // .address-apartment__btn
  &__btn {
    width: 100%;
  }
}

.address-wrong {
  // .address-wrong__inner
  &__inner {

  }

  // .address-wrong__icon-wrapper
  &__icon-wrapper {

  }

  // .address-wrong__text
  &__text {

  }

  // .address-wrong__btn
  &__btn {
    width: 100%;
  }
}
</style>
