<template>
  <div class="advent-calendar">
    <!-- Toolbar -->
    <AdventCalendarToolbar @back="$emit('back')" />

    <!-- Сетка дат -->
    <div
      ref="calendarGrid"
      class="advent-calendar__grid"
    >
      <div class="advent-calendar__grid-inner">
        <!-- Фон с эффектами -->
        <div
          :style="backgroundStyle"
          class="advent-calendar__background"
        >
          <!-- Круги -->
          <div class="advent-calendar__circles" />

          <!-- Звезды из макета -->
          <div
            ref="starsContainer"
            class="advent-calendar__stars"
          >
            <img
              v-for="star in allStars"
              :key="star.id"
              :alt="star.alt"
              :class="[
                'advent-calendar__star',
                `advent-calendar__star--${star.type}`
              ]"
              :src="star.src"
              :style="{
                top: `${star.top}%`,
                left: `${star.left}%`,
                width: `${star.size}px`,
                height: `${star.size}px`,
                animationDelay: star.delay ? `${star.delay}s` : '0s'
              }"
            >
            <!-- Луны и солнца с движением по эллипсу -->
            <img
              v-for="body in celestialBodies"
              :key="body.id"
              :alt="body.alt"
              :class="[
                'advent-calendar__celestial',
                `advent-calendar__celestial--${body.type}`
              ]"
              :src="body.src"
              :style="{
                top: `${body.y}%`,
                left: `${body.x}%`,
                width: `${body.size}px`,
                height: `${body.size}px`
              }"
            >
          </div>
        </div>

        <div class="advent-calendar__grid-inner-inner">
          <!-- Стрелки -->
          <div
            v-for="(arrowNum, idx) in Object.keys(getArrowsLayoutMap())"
            :key="`arrow-${arrowNum}`"
            :class="`advent-calendar__arrow advent-calendar__arrow--${arrowNum}`"
            :style="getArrowStyle(arrowNum)"
          >
            <svg
              :class="[
                'advent-calendar__arrow-svg',
                arrowsSpriteClass,
                {
                  'advent-calendar__arrow-svg--current': processedDays[idx]?.status === 'current',
                }
              ]"
            >
              <use :xlink:href="`${currentArrowsSprite}#arrow-${arrowNum}`" />
            </svg>
          </div>

          <!-- Кнопка Старт -->
          <button
            class="advent-calendar__start-btn"
            @click="$emit('start')"
          >
            <span>Старт</span>
          </button>

          <div
            v-for="day in processedDays"
            :key="day.date"
            :ref="`day-${day.dayNumber}`"
            :class="{
              'advent-calendar__day': true,
              'advent-calendar__day--previous': day.status === 'previous',
              'advent-calendar__day--current': day.status === 'current',
              'advent-calendar__day--future': day.status === 'future',
              'advent-calendar__day--absolute': !!(getLayoutMap()[day.dayNumber]),
            }"
            :style="getDayStyle(day.dayNumber)"
            @click="handleDayClick(day)"
          >
            <template v-if="day.status === 'current'">
              <nuxt-img
                v-if="getPromoForDay(day.dayNumber)?.image"
                :alt="getPromoForDay(day.dayNumber)?.title || 'Подарок'"
                :src="getPromoForDay(day.dayNumber).image"
                class="advent-calendar__day-gift"
                format="webp"
                height="240"
                loading="lazy"
                quality="80"
                width="240"
              />
              <img
                alt=""
                class="advent-calendar__day-star advent-calendar__day-star--1"
                src="~/assets/images/content/Advent2025/star-blue-1.png"
              >
              <img
                alt=""
                class="advent-calendar__day-star advent-calendar__day-star--2"
                src="~/assets/images/content/Advent2025/star-blue-1.png"
              >
            </template>

            <div class="advent-calendar__day-inner">
              <span class="advent-calendar__day-number">{{ day.dayNumber }}</span>
            </div>
          </div>
        </div>
        <BrandHeader class="advent-calendar__brand-header" />
      </div>
    </div>
  </div>
</template>

<script>
import { extClamp } from '~/lib/common';
import advent2025StarsMixin from '~/mixins/advent2025Stars';
import spriteArrows320 from '~/assets/images/content/Advent2025/arrows320.svg?url';
import spriteArrows768 from '~/assets/images/content/Advent2025/arrows768.svg?url';
import spriteArrows1280 from '~/assets/images/content/Advent2025/arrows1280.svg?url';
import BrandHeader from './BrandHeader.vue';
import AdventCalendarToolbar from './AdventCalendarToolbar.vue';

export default {
  name: 'CalendarScreen',
  components: {
    BrandHeader,
    AdventCalendarToolbar,
  },
  mixins: [advent2025StarsMixin],
  props: {
    currentDay: {
      type: Number,
      default: new Date().getDate(),
    },
    days: {
      type: Array,
      default: () => [],
    },
  },
  data() {
    return {
      // allStars, containerWidth, containerHeight, viewportWidth, viewportHeight приходят из миксина advent2025StarsMixin
      gridWidth: 3500,
      dateLines: [],
      spriteArrows320,
      spriteArrows768,
      spriteArrows1280,

      arrowsLayout320: {
        1: {
          top: 96, left: 78, width: 30, height: 92.5, rotate: 0,
        },
        2: {
          top: 212, left: 183, width: 113, height: 57, rotate: 0,
        },
        3: {
          top: 113, left: 343, width: 77, height: 141, rotate: 0,
        },
        4: {
          top: 177, left: 470, width: 72, height: 153, rotate: 0,
        },
        5: {
          top: 100, left: 609, width: 57, height: 155, rotate: 0,
        },
        6: {
          top: 155, left: 734, width: 45, height: 186, rotate: 0,
        },
        7: {
          top: 68, left: 850, width: 71, height: 142.5, rotate: 0,
        },
        8: {
          top: 232, left: 973, width: 81, height: 59, rotate: 0,
        },
        9: {
          top: 25, left: 1034, width: 149, height: 58, rotate: 0,
        },
        10: {
          top: 90, left: 1198, width: 119, height: 125, rotate: 0,
        },
        11: {
          top: 280, left: 1298, width: 79.5, height: 70, rotate: 0,
        },
        12: {
          top: 227, left: 1532, width: 64, height: 112, rotate: 0,
        },
        13: {
          top: 28, left: 1476, width: 175, height: 65, rotate: 0,
        },
        14: {
          top: 28, left: 1796, width: 151, height: 76, rotate: 0,
        },
        15: {
          top: 159, left: 1735, width: 119, height: 129.5, rotate: 0,
        },
        16: {
          top: 348, left: 1844, width: 106.5, height: 31, rotate: 0,
        },
        17: {
          top: 275, left: 2094, width: 133, height: 122, rotate: 0,
        },
        18: {
          top: 87, left: 2139, width: 111.5, height: 44, rotate: 0,
        },
        19: {
          top: 88, left: 2395, width: 99, height: 44, rotate: 0,
        },
        20: {
          top: 187, left: 2388, width: 171, height: 74, rotate: 0,
        },
        21: {
          top: 302, left: 2481, width: 140.5, height: 59, rotate: 0,
        },
        22: {
          top: 214, left: 2766, width: 57, height: 127, rotate: 0,
        },
        23: {
          top: 123, left: 2881, width: 82, height: 35, rotate: 0,
        },
        24: {
          top: 177, left: 3045, width: 72, height: 70, rotate: 0,
        },
        25: {
          top: 220, left: 3165, width: 143, height: 105, rotate: 0,
        },
      },
      arrowsLayout768: {
        1: {
          top: 111, left: 100.83, width: 70, height: 148, rotate: 0,
        },
        2: {
          top: 191, left: 153, width: 236, height: 178, rotate: 0,
        },
        3: {
          top: 267, left: 487, width: 85.61, height: 69.5, rotate: 0,
        },
        4: {
          top: 437, left: 168, width: 298, height: 147.1, rotate: 0,
        },
        5: {
          top: 657, left: 278, width: 162, height: 99, rotate: 0,
        },
        6: {
          top: 720, left: 642, width: 149, height: 58.31, rotate: 0,
        },
        7: {
          top: 474, left: 795, width: 57, height: 143, rotate: 0,
        },
        8: {
          top: 152, left: 892, width: 45.73, height: 138.5, rotate: 0,
        },
        9: {
          top: 110, left: 1127, width: 164, height: 103, rotate: 0,
        },
        10: {
          top: 305, left: 1207, width: 144.06, height: 152.5, rotate: 0,
        },
        11: {
          top: 648, left: 1258, width: 47.64, height: 161.5, rotate: 0,
        },
        12: {
          top: 694, left: 1505, width: 199.94, height: 119.73, rotate: 0,
        },
        13: {
          top: 388, left: 1586, width: 86.54, height: 117, rotate: 0,
        },
        14: {
          top: 130, left: 1652, width: 197.7, height: 66.18, rotate: 0,
        },
        15: {
          top: 233, left: 1948.44, width: 52.53, height: 101, rotate: 0,
        },
        16: {
          top: 519, left: 1990, width: 122.23, height: 217, rotate: 0,
        },
        17: {
          top: 613, left: 2312, width: 97.44, height: 172.27, rotate: 0,
        },
        18: {
          top: 283, left: 2288, width: 110.85, height: 139, rotate: 0,
        },
        19: {
          top: 124, left: 2391, width: 163, height: 114, rotate: 0,
        },
        20: {
          top: 218, left: 2628, width: 264, height: 82, rotate: 0,
        },
        21: {
          top: 473, left: 2645, width: 201.59, height: 192.5, rotate: 0,
        },
        22: {
          top: 706, left: 2742, width: 194, height: 61, rotate: 0,
        },
        23: {
          top: 526, left: 3115, width: 122.32, height: 200, rotate: 0,
        },
        24: {
          top: 119, left: 3142.92, width: 113.08, height: 218, rotate: 0,
        },
        25: {
          top: 101, left: 3445, width: 209, height: 196.08, rotate: 0,
        },
      },
      arrowsLayout1280: {
        1: {
          top: 189, left: 115.96, width: 56, height: 172, rotate: 35,
        },
        2: {
          top: 299, left: 147, width: 246, height: 116, rotate: -25,
        },
        3: {
          top: 343, left: 466, width: 144, height: 82, rotate: 0,
        },
        4: {
          top: 334.5, left: 682, width: 131.64, height: 174.52, rotate: 0,
        },
        5: {
          top: 223.78, left: 869, width: 162.85, height: 98.95, rotate: 0,
        },
        6: {
          top: 508, left: 978, width: 72.55, height: 150.5, rotate: 0,
        },
        7: {
          top: 762, left: 777, width: 132, height: 129, rotate: 0,
        },
        8: {
          top: 746, left: 503, width: 99, height: 85, rotate: 0,
        },
        9: {
          top: 670, left: 177, width: 136, height: 128.05, rotate: 0,
        },
        10: {
          top: 993, left: 93, width: 70, height: 80, rotate: 0,
        },
        11: {
          top: 1077, left: 230, width: 217, height: 77, rotate: 0,
        },
        12: {
          top: 1024, left: 634, width: 210, height: 87, rotate: 0,
        },
        13: {
          top: 1106, left: 935, width: 93.91, height: 122, rotate: 0,
        },
        14: {
          top: 1289, left: 705, width: 167, height: 98.37, rotate: 0,
        },
        15: {
          top: 1346, left: 521, width: 108, height: 68, rotate: 0,
        },
        16: {
          top: 1402, left: 87, width: 162, height: 100, rotate: 0,
        },
        17: {
          top: 1683, left: 51, width: 213, height: 122, rotate: 0,
        },
        18: {
          top: 1643, left: 435, width: 138.16, height: 116.52, rotate: 0,
        },
        19: {
          top: 1617, left: 745, width: 109, height: 66.29, rotate: 0,
        },
        20: {
          top: 1729, left: 942, width: 99.35, height: 107.34, rotate: 0,
        },
        21: {
          top: 1904.45, left: 804.5, width: 121, height: 56.93, rotate: 0,
        },
        22: {
          top: 1944, left: 501, width: 129.5, height: 87.23, rotate: 0,
        },
        23: {
          top: 1982, left: 139, width: 182.51, height: 172.46, rotate: 0,
        },
        24: {
          top: 2171.87, left: 273, width: 153, height: 165.20, rotate: 0,
        },
        25: {
          top: 2239, left: 609, width: 184, height: 113, rotate: 0,
        },
      },

      dayLayout320: {
        1: { top: 196, left: 37, rotate: 4 },
        2: { top: 77, left: 206, rotate: 357 },
        3: { top: 272, left: 321, rotate: 358 },
        4: { top: 40, left: 471, rotate: 356 },
        5: { top: 260, left: 591, rotate: 7 },
        6: { top: 13, left: 692, rotate: 351 },
        7: { top: 216, left: 830, rotate: 15 },
        8: { top: 87, left: 979, rotate: 358 },
        9: { top: 4, left: 1198, rotate: 3 },
        10: { top: 222, left: 1157, rotate: 348 },
        11: { top: 275, left: 1388, rotate: 4 },
        12: { top: 103, left: 1434, rotate: 353 },
        13: { top: 10, left: 1660, rotate: 14 },
        14: { top: 95, left: 1865, rotate: 4 },
        15: { top: 297, left: 1707, rotate: 352 },
        16: { top: 310, left: 1960, rotate: 9 },
        17: { top: 136, left: 2092, rotate: 355 },
        18: { top: 29, left: 2260, rotate: 2 },
        19: { top: 50, left: 2497, rotate: 0 },
        20: { top: 271, left: 2345, rotate: 6 },
        21: { top: 275, left: 2627, rotate: 357 },
        22: { top: 78, left: 2749, rotate: 2 },
        23: { top: 42, left: 2962, rotate: 348 },
        24: { top: 253, left: 3020, rotate: 355 },
        25: { top: 85, left: 3201, rotate: 0 },
      },

      dayLayout768: {
        1: { top: 270, left: 69, rotate: 4 },
        2: { top: 97, left: 363, rotate: 348 },
        3: { top: 358, left: 492, rotate: 358 },
        4: { top: 598, left: 99, rotate: 356 },
        5: { top: 669, left: 453, rotate: 7 },
        6: { top: 626, left: 794, rotate: 351 },
        7: { top: 305, left: 802, rotate: 15 },
        8: { top: 80, left: 956, rotate: 358 },
        9: { top: 125, left: 1291, rotate: 3 },
        10: { top: 471, left: 1162, rotate: 348 },
        11: { top: 711, left: 1325, rotate: 4 },
        12: { top: 517, left: 1600, rotate: 353 },
        13: { top: 219, left: 1547, rotate: 14 },
        14: { top: 62, left: 1849, rotate: 4 },
        15: { top: 345, left: 1893, rotate: 352 },
        16: { top: 670, left: 2128, rotate: 9 },
        17: { top: 438, left: 2311, rotate: 355 },
        18: { top: 109, left: 2216, rotate: 2 },
        19: { top: 51, left: 2556, rotate: 0 },
        20: { top: 296, left: 2793, rotate: 6 },
        21: { top: 678, left: 2574, rotate: 357 },
        22: { top: 629, left: 2938, rotate: 2 },
        23: { top: 349, left: 3121, rotate: 348 },
        24: { top: 25, left: 3263, rotate: 355 },
        25: { top: 307, left: 3564, rotate: 0 },
      },

      dayLayout1280: {
        1: { top: 349, left: 6, rotate: 4 },
        2: { top: 164, left: 358, rotate: 348 },
        3: { top: 438, left: 504, rotate: 358 },
        4: { top: 159, left: 683, rotate: 356 },
        5: { top: 335, left: 940, rotate: 7 },
        6: { top: 581, left: 801, rotate: 351 },
        7: { top: 763, left: 610, rotate: 15 },
        8: { top: 666, left: 332, rotate: 358 },
        9: { top: 819, left: 71, rotate: 3 },
        10: { top: 1086, left: 58, rotate: 348 },
        11: { top: 1008, left: 461, rotate: 4 },
        12: { top: 933, left: 852, rotate: 353 },
        13: { top: 1230, left: 880, rotate: 14 },
        14: { top: 1273, left: 534, rotate: 4 },
        15: { top: 1310, left: 251, rotate: 352 },
        16: { top: 1515, left: 14, rotate: 9 },
        17: { top: 1656, left: 275, rotate: 355 },
        18: { top: 1590, left: 567, rotate: 2 },
        19: { top: 1542, left: 865, rotate: 0 },
        20: { top: 1841, left: 940, rotate: 6 },
        21: { top: 1857, left: 636, rotate: 357 },
        22: { top: 1931, left: 332, rotate: 2 },
        23: { top: 2145, left: 95, rotate: 348 },
        24: { top: 2178, left: 435, rotate: 355 },
        25: { top: 2227, left: 806, rotate: 0 },
      },
    };
  },
  computed: {
    processedDays() {
      return this.days.map((day) => {
        const date = new Date(day.date);
        const dayNumber = date.getDate();

        let status = 'future';

        if (dayNumber < this.currentDay) {
          status = 'previous';
        } else if (dayNumber === this.currentDay) {
          status = 'current';
        }

        return {
          ...day,
          dayNumber,
          status,
        };
      });
    },
    currentArrowsSprite() {
      if (this.viewportWidth >= 1280) return this.spriteArrows1280;
      if (this.viewportWidth >= 768) return this.spriteArrows768;
      return this.spriteArrows320;
    },
    arrowsSpriteClass() {
      if (this.viewportWidth >= 1280) return 'advent-calendar__arrow-svg--1280';
      if (this.viewportWidth >= 768) return 'advent-calendar__arrow-svg--768';
      return 'advent-calendar__arrow-svg--320';
    },
    backgroundStyle() {
      let bgImage = this.$ipx('/assets/images/content/Advent2025/bg-320.png', { w: 3500, f: 'webp', q: 100 });

      if (this.viewportWidth >= 1280) {
        bgImage = this.$ipx('/assets/images/content/Advent2025/bg-1280.png', { w: 3500, f: 'webp', q: 100 });
      } else if (this.viewportWidth >= 768) {
        bgImage = this.$ipx('/assets/images/content/Advent2025/bg-768.png', { w: 3500, f: 'webp', q: 100 });
      }

      return {
        backgroundImage: `url(${bgImage})`,
      };
    },
  },
  mounted() {
    // Сначала устанавливаем размер контейнера со звездами
    this.$nextTick(() => {
      this.initViewportSize(this.$refs.starsContainer);
      // Потом генерируем звезды на основе размера
      this.generateStars();
      this.generateCelestialBodies();
      this.startCelestialAnimation();
    });
    this.generateDateLines();
    // Задержка прокрутки после завершения анимации слайда
    setTimeout(() => {
      this.scrollToCurrentDay();
    }, 0);
    window.addEventListener('resize', this.onResize, { passive: true });
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.onResize);
  },
  methods: {
    onResize() {
      const oldWidth = this.viewportWidth;
      const oldContainerHeight = this.containerHeight;

      // Обновляем размеры viewport
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;

      // Обновляем размеры контейнера со звездами
      const container = this.$refs.starsContainer;
      if (container) {
        this.containerWidth = container.clientWidth || container.offsetWidth;
        this.containerHeight = container.clientHeight || container.offsetHeight;
      }

      // Перегенерируем звезды при смене breakpoint или значительном изменении высоты контейнера (>100px)
      const oldBreakpoint = this.getBreakpoint(oldWidth);
      const newBreakpoint = this.getBreakpoint(this.viewportWidth);
      const heightChanged = Math.abs(this.containerHeight - oldContainerHeight) > 100;

      if (oldBreakpoint !== newBreakpoint || heightChanged) {
        this.allStars = [];
        this.generateStars();
        this.celestialBodies = [];
        this.generateCelestialBodies();
      }
    },
    // Методы initViewportSize(), generateStars() и getBreakpoint() приходят из миксина advent2025StarsMixin

    generateDateLines() {
      // Генерируем линии-стрелки между датами
      // Упрощенная версия - нужно будет доработать по макету
      const dayWidth = 160;
      const dayHeight = 200;
      const gap = 40;

      for (let i = 0; i < this.days.length - 1; i += 1) {
        const startX = (i % 20) * (dayWidth + gap) + dayWidth;
        const startY = Math.floor(i / 20) * dayHeight + dayHeight / 2;
        const endX = ((i + 1) % 20) * (dayWidth + gap);
        const endY = Math.floor((i + 1) / 20) * dayHeight + dayHeight / 2;

        this.dateLines.push({
          path: `M ${startX} ${startY} L ${endX} ${endY}`,
          active: i < this.currentDay - 1,
        });
      }
    },

    getPromoForDay(dayNumber) {
      // Находим данные дня из prop days
      const dayData = this.days.find((d) => {
        const date = new Date(d.date);
        return date.getDate() === dayNumber;
      });

      if (!dayData) {
        return null;
      }

      // Получаем товар из store по productCode
      const product = this.$store.getters['catalog/productByCode'](dayData.productCode);

      return {
        code: dayData.promocode,
        title: product?.name || '',
        description: dayData.subtitle || '',
        image: product?.image || null,
      };
    },

    scrollToCurrentDay() {
      this.$nextTick(() => {
        const currentDayEl = this.$refs[`day-${this.currentDay}`];
        if (currentDayEl && currentDayEl[0]) {
          const targetElement = currentDayEl[0];
          const scrollContainer = this.$refs.calendarGrid;

          if (!scrollContainer) return;

          // Получаем координаты элемента и контейнера
          const targetRect = targetElement.getBoundingClientRect();
          const containerRect = scrollContainer.getBoundingClientRect();

          // Вычисляем целевую позицию для центрирования
          const targetScrollLeft = scrollContainer.scrollLeft
            + targetRect.left - containerRect.left
            - (containerRect.width / 2) + (targetRect.width / 2);

          const targetScrollTop = scrollContainer.scrollTop
            + targetRect.top - containerRect.top
            - (containerRect.height / 2) + (targetRect.height / 2);

          // Плавная анимация прокрутки
          const duration = 1200;
          const startTime = performance.now();
          const startScrollLeft = scrollContainer.scrollLeft;
          const startScrollTop = scrollContainer.scrollTop;
          const distanceLeft = targetScrollLeft - startScrollLeft;
          const distanceTop = targetScrollTop - startScrollTop;

          const easeInOutCubic = (t) => (t < 0.5
            ? 4 * t * t * t
            : 1 - (-2 * t + 2) ** 3 / 2);

          const animateScroll = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = easeInOutCubic(progress);

            scrollContainer.scrollLeft = startScrollLeft + (distanceLeft * easeProgress);
            scrollContainer.scrollTop = startScrollTop + (distanceTop * easeProgress);

            if (progress < 1) {
              requestAnimationFrame(animateScroll);
            }
          };

          requestAnimationFrame(animateScroll);
        }
      });
    },

    handleDayClick(day) {
      if (day.status === 'current') {
        this.$emit('day-click', day);
      }
    },
    getLayoutMap() {
      if (this.viewportWidth >= 1280) return this.dayLayout1280;
      if (this.viewportWidth >= 768) return this.dayLayout768;
      return this.dayLayout320;
    },
    getDayStyle(date) {
      const layout = this.getLayoutMap()[date];
      if (!layout) return {};

      // Для разрешения < 768 используем extClamp для адаптивности
      if (this.viewportWidth < 768) {
        return {
          position: 'absolute',
          top: extClamp(layout.top),
          left: extClamp(layout.left),
          transform: `rotate(${layout.rotate}deg)`,
        };
      }

      // Для >= 768 используем фиксированные значения
      return {
        position: 'absolute',
        top: `${layout.top}px`,
        left: `${layout.left}px`,
        transform: `rotate(${layout.rotate}deg)`,
      };
    },
    getArrowsLayoutMap() {
      if (this.viewportWidth >= 1280) return this.arrowsLayout1280;
      if (this.viewportWidth >= 768) return this.arrowsLayout768;
      return this.arrowsLayout320;
    },
    getArrowStyle(arrowNum) {
      const layout = this.getArrowsLayoutMap()[arrowNum];
      if (!layout) return {};

      // Для разрешения < 768 используем extClamp для адаптивности
      if (this.viewportWidth < 768) {
        return {
          top: extClamp(layout.top),
          left: extClamp(layout.left),
          width: extClamp(layout.width),
          height: extClamp(layout.height),
          transform: `rotate(${layout.rotate}deg)`,
        };
      }

      // Для >= 768 используем фиксированные значения
      return {
        top: `${layout.top}px`,
        left: `${layout.left}px`,
        width: `${layout.width}px`,
        height: `${layout.height}px`,
        transform: `rotate(${layout.rotate}deg)`,
      };
    },
  },
};
</script>

<style lang="scss" scoped>
.advent-calendar {
  position: relative;
  display: flex;
  overflow: hidden;
  flex-direction: column;
  min-height: 100vh;

  // .advent-calendar__background
  &__background {
    position: absolute;
    left: 0;
    overflow: hidden;
    width: 100%;
    height: 100%;
    background-repeat: no-repeat;
    background-position: center;
    background-size: cover;
  }

  // Круги на фоне
  &__circles {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle at 50% 50%, rgba(0, 70, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(0, 50, 200, 0.15) 0%, transparent 40%);
  }

  // Звезды
  &__stars {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  &__star {
    position: absolute;
    mix-blend-mode: color-dodge;

    &--mini {

    }

    // Анимация для animated звезд встроена в SVG файлы

    &--glare-small {
      animation: glarePulse 4s ease-in-out infinite;
    }

    &--glare-large {
      animation: glarePulse 5s ease-in-out infinite;
    }

    &--shooting {
      transform: rotate(-90deg);
      animation: shootingStarFly 0.5s linear infinite;
    }
  }

  // Небесные тела (луны и солнца)
  &__celestial {
    position: absolute;
    transition: top 0.05s linear, left 0.05s linear;
    transform: translate(-50%, -50%);
    pointer-events: none;

    &--moon {
      opacity: 0.7;
      mix-blend-mode: screen;
      filter: blur(0.5px);
    }

    &--sun {
      animation: celestialGlow 8s ease-in-out infinite;
      opacity: 0.6;
      mix-blend-mode: screen;
      filter: blur(1px);
    }
  }

  // .advent-calendar__grid
  &__grid {
    position: relative;
    z-index: 1;
    overflow-x: auto;
    overflow-y: hidden;
    flex: 1;

    @media screen and (min-width: 768px) {

    }

    @media screen and (min-width: 1280px) {
      overflow-x: hidden;
      overflow-y: auto;
    }

    // Скрываем скроллбар
    &::-webkit-scrollbar {
      display: none;
    }

    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  // .advent-calendar__grid-inner
  &__grid-inner {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-width: extClamp(3500);
    min-height: 100%;

    @media screen and (min-width: 768px) {
      display: block;
      min-width: 4000px;
    }

    @media screen and (min-width: 1280px) {
      min-width: auto;
      height: auto;
      min-height: 2900px;
      margin: 0 auto;
      padding: 0;
    }
  }

  // .advent-calendar__grid-inner-inner
  &__grid-inner-inner {
    position: relative;
    height: extClamp(400);

    @media screen and (min-width: 768px) {
      top: 100px;
      height: auto;
    }

    @media screen and (min-width: 1280px) {
      top: 0;
      max-width: 1152px;
      margin: 0 auto;
    }
  }

  // Линии соединения между карточками
  &__connection-lines {
    position: absolute;
    top: extClamp(27);
    left: extClamp(70);
    width: extClamp(2143);
    height: extClamp(373);
    opacity: 0.6;

    @media screen and (min-width: 768px) {
      top: 35px;
      left: 90px;
      width: 2300px;
      height: 400px;
    }

    @media screen and (min-width: 1280px) {
      top: 150px;
      left: 60px;
      width: 900px;
      height: 2000px;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  // .advent-calendar__arrow
  &__arrow {
    position: absolute;
    z-index: 0;

  }

  &__arrow-svg {
    display: block;
    width: 100%;
    height: 100%;
    color: #2558a4;

    // .advent-calendar__arrow-svg--current
    &--current {
      color: #fff;
      filter: drop-shadow(0 0 8px #fff) drop-shadow(0 0 1px #fff);
    }
  }

  // Старые линии (оставляем для совместимости)
  &__lines {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;

  }

  &__line {
    stroke: rgba(255, 255, 255, 0.2);
    stroke-width: 1;
    stroke-dasharray: 4 4;
    fill: none;

    &--active {
      stroke: rgba(255, 255, 255, 0.6);
      filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.8));
    }
  }

  // .advent-calendar__day--previous
  &__day {
    position: relative;
    z-index: 2;
    display: flex;
    align-items: end;
    justify-content: end;
    width: extClamp(128);
    height: extClamp(128);
    padding: extClamp(10) extClamp(8);

    transition: all 0.3s ease;
    border-radius: extClamp(16);
    background: linear-gradient(180deg, rgba(16, 21, 33, 0.75) 0%, rgba(20, 30, 56, 0.75) 100%);
    box-shadow: 0 0 90.6px 0 #000924 inset;
    backdrop-filter: blur(4px);

    @media screen and (min-width: 768px) {
      width: 165px;
      height: 165px;
      padding: 10px 15px;
      border-radius: 16px;
    }

    @media screen and (min-width: 1280px) {

    }

    &:last-child {
      margin-right: extClamp(118);

      @media screen and (min-width: 768px) {
        margin-right: 225px;
      }

      @media screen and (min-width: 1280px) {

      }
    }

    // Прошедшая дата
    &--previous {
      border: extClamp(0.5) solid transparent;
      background: linear-gradient(180deg, #0d1730 0%, #0b1225 100%) padding-box,
      linear-gradient(224deg, #fff 3%, #001838 50%, #999 98%) border-box;
      background-clip: padding-box, border-box;
      background-origin: border-box;
      backdrop-filter: blur(4px);

      .advent-calendar__day-number {
        opacity: 0.5;
      }
    }

    // Будущая дата
    &--future {
      cursor: default;

      border-image: linear-gradient(224deg, rgba(255, 255, 255, 1) 3%, rgba(0, 24, 56, 1) 50%, rgba(153, 153, 153, 1) 98%) 1;
      background: linear-gradient(180deg, rgba(13, 23, 48, 1) 0%, rgba(11, 18, 37, 1) 100%);
      box-shadow: inset 0px 0px 2px rgba(255, 255, 255, 1);
    }

    // Текущая дата
    &--current {
      cursor: pointer;
      animation: currentDayPulse 3s ease-in-out infinite;
      border-image: linear-gradient(224deg, rgba(255, 255, 255, 1) 3%, rgba(0, 24, 56, 1) 50%, rgba(153, 153, 153, 1) 98%) 1;
      background: linear-gradient(180deg, rgba(13, 23, 48, 1) 0%, rgba(11, 18, 37, 1) 100%);
      box-shadow: 0px 0px 6.4px rgba(255, 255, 255, 1),
      inset 0px 0px 2px rgba(255, 255, 255, 1),
      inset 0px 0px 16px rgba(0, 70, 255, 1);

      @media screen and (min-width: 1280px) {
        &:hover {
          border-image: linear-gradient(224deg, rgba(255, 255, 255, 1) 3%, rgba(255, 255, 255, 1) 50%, rgba(255, 255, 255, 1) 98%) 1;
          box-shadow: 0px 0px 8px rgba(255, 255, 255, 1),
          inset 0px 0px 4px rgba(255, 255, 255, 1),
          inset 0px 0px 20px rgba(0, 70, 255, 1);
        }
      }
    }
  }

  // .advent-calendar__day-inner
  &__day-inner {
    position: relative;
    z-index: 1;

  }

  // .advent-calendar__brand-header
  &__brand-header {
    position: absolute;
    z-index: 2;
    right: extClamp(20);
    bottom: extClamp(70);

    @media screen and (min-width: 768px) {
      right: 100px;
      bottom: 120px;
    }

    @media screen and (min-width: 1280px) {
      right: auto;
      bottom: 130px;
      left: 50%;
      transform: translateX(-50%);
    }
  }

  // .advent-calendar__start-btn
  &__start-btn {
    font-family: 'GG Kizhich', sans-serif;
    font-size: extClamp(24);
    font-weight: 700;
    line-height: 1;
    position: absolute;
    z-index: 2;
    top: extClamp(26);
    left: extClamp(17);
    min-width: auto;
    padding: extClamp(16) extClamp(48) extClamp(18);
    cursor: pointer;
    transition: transform 0.2s ease, box-shadow 0.2s ease;
    transform: rotate(-10deg);
    pointer-events: none;
    color: #e3eeff;
    border: extClamp(0.5) solid rgba(255, 255, 255, 0.8);
    border-radius: extClamp(8);
    background: linear-gradient(180deg, rgba(13, 23, 48, 0.75) 0%, rgba(11, 18, 37, 0.75) 100%);
    box-shadow: 0 8px 18px rgba(0, 0, 0, 0.45),
    inset 0 0 2px rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(4px);

    @media screen and (min-width: 768px) {
      font-size: 32px;
      top: 38px;
      left: 51px;
      padding: 10px 48px 16px 48px;
      border-radius: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 32px;
      top: 118px;
      left: 63px;
      padding: 10px 48px 16px;
    }

    & > span {
      background: linear-gradient(
          90deg,
          #fff 0%,
          #dae7ff 48%,
          #afdbff 100%
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }

  }

  // .advent-calendar__day-number
  &__day-number {
    font-family: NauryzRedKeds, sans-serif;
    font-size: extClamp(72);
    font-weight: 700;
    font-style: normal;
    line-height: 1;
    position: relative;
    bottom: -10px;
    text-align: right;
    color: #fff;
    background: linear-gradient(
        90deg,
        #fff 0%,
        #dae7ff 48%,
        #afdbff 100%
    );
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;

    @media screen and (min-width: 768px) {
      font-size: 96px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 6496;
    }
  }

  // Изображение подарка на текущей дате
  &__day-gift {
    position: absolute;
    top: extClamp(-40);
    left: extClamp(-22);
    width: extClamp(120);
    height: extClamp(120);

    @media screen and (min-width: 768px) {
      top: -44px;
      left: -22px;
      width: 148px;
      height: 148px;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  }

  // Анимированные звезды на текущей дате
  &__day-star {
    position: absolute;
    animation: dayStarFloat 3s ease-in-out infinite;
    pointer-events: none;

    &--1 {
      top: extClamp(-35);
      left: extClamp(90);
      width: extClamp(58);
      height: extClamp(58);
      transform: rotate(20deg);

      @media screen and (min-width: 768px) {
        top: -35px;
        left: 90px;
        width: 58px;
        height: 58px;
      }
    }

    &--2 {
      top: extClamp(70);
      left: extClamp(-21);
      width: extClamp(34);
      height: extClamp(34);
      transform: rotate(343.399deg);
      animation-delay: 1s;

      @media screen and (min-width: 768px) {
        top: 70px;
        left: -21px;
        width: 34px;
        height: 34px;
      }
    }
  }
}

// Анимация падающих звезд (полет под 45 градусов с плавным появлением/исчезанием)
@keyframes shootingStarFly {
  0% {
    top: -10%;
    left: 110%;
    opacity: 0;
  }
  30% {
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  80% {
    opacity: 0;
  }

  100% {
    top: 110%;
    left: -10%;
    opacity: 0;
  }
}

@keyframes northernLightsMove {
  0%, 100% {
    transform: translateX(0) translateY(0);
  }
  50% {
    transform: translateX(30px) translateY(-20px);
  }
}

@keyframes glarePulse {
  0%, 100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.2);
  }
}

@keyframes currentDayPulse {
  0%, 100% {
    box-shadow: 0px 0px 6.4px rgba(255, 255, 255, 1),
    inset 0px 0px 2px rgba(255, 255, 255, 1),
    inset 0px 0px 16px rgba(0, 70, 255, 1);
  }
  50% {
    box-shadow: 0px 0px 10px rgba(255, 255, 255, 1),
    inset 0px 0px 4px rgba(255, 255, 255, 1),
    inset 0px 0px 20px rgba(0, 70, 255, 1);
  }
}

@keyframes dayStarFloat {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-10px) rotate(10deg);
  }
}

// Анимация свечения для небесных тел
@keyframes celestialGlow {
  0%, 100% {
    opacity: 0.6;
    filter: blur(1px);
  }
  50% {
    opacity: 0.8;
    filter: blur(1.5px);
  }
}
</style>
