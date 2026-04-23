<template>
  <div class="select">
    <div class="select__inner">
      <multiselect
        v-model="selectedStreet"
        :allow-empty="false"
        :label="optionName"
        :max-height="150"
        :options="items"
        :placeholder="placeholder"
        :searchable="true"
        :track-by="trackBy"
        class="custom-multiselect"
        deselect-label=""
        select-label=""
        selected-label=""
        @close="handleClose"
        @open="handleOpen"
        v-on="$listeners"
      >
        <template
          slot="option"
          slot-scope="{option}"
        >
          {{ option[optionName] }}
        </template>
        <span slot="noResult">Ничего не найдено</span>
        <span slot="noOptions">Начните вводить название.</span>
      </multiselect>
    </div>
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import Multiselect from 'vue-multiselect';

interface Item {
  id?: string;
  iikoId?: string;
  name?: string;

  [key: string]: any;
}

export default Vue.extend({
  name: 'BaseSelect',
  components: { Multiselect },
  props: {
    items: {
      type: Array as () => Item[],
      default: () => ([]),
    },
    value: {
      type: Object as () => Item | null,
      default: null,
    },
    placeholder: {
      type: String,
      default: 'Начните вводить',
    },
    optionName: {
      type: String,
      default: 'name',
    },
    trackBy: {
      type: String,
      default: 'iikoId',
    },

  },
  data() {
    return {
      selectedStreet: null,
      touchStartHandler: null,
      touchMoveHandler: null,
      touchEndHandler: null,
    };
  },
  computed: {},
  watch: {
    value: {
      handler(newValue) {
        this.selectedStreet = newValue;
      },
      immediate: true,
    },
    selectedStreet(value) {
      this.$emit('input', value);
    },
  },
  methods: {
    handleOpen() {
      this.$nextTick(() => {
        this.attachTouchHandler();
      });
    },

    handleClose() {
      this.removeTouchHandler();
    },

    attachTouchHandler() {
      const contentWrapper = document.querySelector('.multiselect__content-wrapper') as HTMLElement;
      if (contentWrapper) {
        let startY: number | null = null;

        this.touchStartHandler = (event: TouchEvent) => {
          startY = event.touches[0].clientY;
        };

        this.touchMoveHandler = (event: TouchEvent) => {
          if (startY !== null) {
            const currentY = event.touches[0].clientY;
            const deltaY = currentY - startY;
            startY = currentY;

            contentWrapper.scrollTop -= deltaY;
            event.preventDefault();
          }
        };

        this.touchEndHandler = () => {
          startY = null;
        };

        contentWrapper.addEventListener('touchstart', this.touchStartHandler);
        contentWrapper.addEventListener('touchmove', this.touchMoveHandler);
        contentWrapper.addEventListener('touchend', this.touchEndHandler);
      }
    },

    removeTouchHandler() {
      const contentWrapper = document.querySelector('.multiselect__content-wrapper') as HTMLElement;
      if (contentWrapper) {
        contentWrapper.removeEventListener('touchstart', this.touchStartHandler);
        contentWrapper.removeEventListener('touchmove', this.touchMoveHandler);
        contentWrapper.removeEventListener('touchend', this.touchEndHandler);
      }
    },
  },
});
</script>

<style lang="scss"
       scoped
>
.select {
  position: relative;

  &::v-deep {

    .multiselect {

      position: relative;
      display: block;
      box-sizing: content-box;
      width: 100%;
      height: auto;
      text-align: left;
      color: #292929;

    }

    .multiselect__placeholder {
      font-size: extClamp(10);
      font-weight: 500;
      font-style: normal;
      line-height: 100%;
      margin-bottom: 0;
      color: var(---Primary-Gray, #969696);

      @media screen and (min-width: 768px) {

      }

      @media screen and (min-width: 1280px) {
        font-size: 16px;
        font-weight: 500;
        line-height: 120%;
      }
    }

    .multiselect__select {

    }

    input.multiselect__input {
      font-size: extClamp(10);
      font-weight: 500;
      line-height: 100%;
      min-height: auto;
      margin: 0;
      padding: 0;
      color: var(---Primary-Gray, #969696);
      background: none;

      @media screen and (min-width: 768px) {
        font-size: 16px;
        font-weight: 500;
        line-height: 120%;
      }

      @media screen and (min-width: 1280px) {
        font-size: 14px;
        font-weight: 500;
        line-height: 100%;
      }
    }

    .multiselect__tags {
      font-size: extClamp(10);
      font-weight: 500;
      font-style: normal;
      line-height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      min-height: extClamp(42);
      padding: extClamp(12) extClamp(16);
      color: var(---Main-Purple, #993ca6);
      border: 1px solid var(---Extra-LightGray, #e8e8e8);
      border-radius: extClamp(8);
      outline: none;
      background: var(---Main-White, #fff);

      @media screen and (min-width: 768px) {
        font-size: 16px;
        line-height: 120%;
        min-height: 52px;
        padding: 16px 16px;
        border-radius: 8px;
      }

      @media screen and (min-width: 1280px) {
        font-size: 14px;
        line-height: 100%;
        min-height: 52px;
        padding: 16px 16px;
        border-radius: 8px;
      }

    }

    .multiselect__single {
      font-size: extClamp(10);
      font-weight: 500;
      line-height: 100%;
      min-height: auto;
      margin: 0;
      padding: 0;
      color: var(---Main-Purple, #993ca6);
      background: none;

      @media screen and (min-width: 768px) {
        font-size: 16px;
      }

      @media screen and (min-width: 1280px) {
        font-size: 14px;
        line-height: 140%;
      }
    }

    .multiselect__select {
      position: absolute;
      top: 50%;
      right: extClamp(4);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      transition: transform .2s ease;
      transform: translateY(-50%);
      text-align: center;

      @media screen and (min-width: 768px) {
        right: 20px;
      }

      @media screen and (min-width: 1280px) {

      }

      &:before {
        position: relative;
        top: initial;
        right: initial;
        width: extClamp(14);
        height: extClamp(14);
        margin-top: 0;
        content: "";
        transition: all 0.3s;
        color: initial;
        border: none;
        background-image: url('~assets/images/icons/svg/arrow-down.svg');
        background-repeat: no-repeat;
        background-size: contain;

        @media screen and (min-width: 768px) {
          width: 24px;
          height: 24px;
        }

        @media screen and (min-width: 1280px) {

        }
      }
    }

    .multiselect__content-wrapper {
      margin-bottom: 0;
      padding: 0 0;
      border: 1px solid var(---Extra-LightGray, #e8e8e8);
      border-radius: extClamp(6);
      background: #f6f6f6;
      background: var(---Main-White, #fff);
      box-shadow: 0 extClamp(5) extClamp(23) 0 rgba(84, 84, 84, 0.08);

      @media screen and (min-width: 768px) {
        padding: 20px 0;
        border-radius: 20px;
        box-shadow: 0 6px 20px 0 rgba(84, 84, 84, 0.22);
      }

      @media screen and (min-width: 1280px) {
        border-radius: 10px;
      }
    }

    .multiselect__content {
      background: none;
    }

    .multiselect__option {
      font-size: extClamp(11);
      font-weight: 400;
      font-style: normal;
      line-height: 140%;
      white-space: normal;
      color: #d0d0d0;

      @media screen and (min-width: 768px) {
        font-size: 16px;
      }

      @media screen and (min-width: 1280px) {
        font-size: 14px;
        padding: 10px;
      }
    }

    .multiselect__option--highlight {
      font-size: extClamp(11);
      font-weight: 400;
      font-style: normal;
      line-height: 140%;
      padding: extClamp(10);
      color: #993ca6;
      background: #f5ecf6;

      @media screen and (min-width: 768px) {
        font-size: 16px;
        padding: 20px 10px;
      }

      @media screen and (min-width: 1280px) {
        font-size: 14px;
        padding: 10px;
      }
    }

    .multiselect--active {

      .multiselect__select {

        &:before {
          transform: rotate(180deg)
        }
      }

    }

  }

}

</style>
