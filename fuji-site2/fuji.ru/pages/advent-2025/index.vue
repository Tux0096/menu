<template>
  <div
    :class="{
      'advent-2025-page': true,
      'advent-2025-page--forward': isForward,
      'advent-2025-page--backward': !isForward
    }"
  >
    <!-- Экран с условиями -->
    <transition name="screen-slide">
      <IntroScreen
        v-if="currentScreen === 'intro'"
        key="intro"
        @continue="showCalendar"
      />
    </transition>

    <!-- Экран с календарём -->
    <transition name="screen-slide">
      <CalendarScreen
        v-if="currentScreen === 'calendar'"
        key="calendar"
        :current-day="currentDay"
        :days="days"
        @back="showIntro"
        @legal="showLegal"
        @day-click="showPromoModal"
      />
    </transition>

    <!-- Модальное окно с промокодом -->
    <PromoModal
      v-if="selectedDay"
      :day="selectedDay"
      :promo="selectedPromo"
      :visible="isModalVisible"
      @back="showIntro"
      @close="closeModal"
    />
  </div>
</template>

<script>
import IntroScreen from '~/components/Actions/Advent2025/IntroScreen.vue';
import CalendarScreen from '~/components/Actions/Advent2025/CalendarScreen.vue';
import PromoModal from '~/components/Actions/Advent2025/PromoModal.vue';

const days = [
  {
    date: '2025-12-01',
    productCode: '65432',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY1',
  },
  {
    date: '2025-12-02',
    productCode: '65429',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY2',
  },
  {
    date: '2025-12-03',
    productCode: '66428',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY3',
  },
  {
    date: '2025-12-04',
    productCode: '65434',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY4',
  },
  {
    date: '2025-12-05',
    productCode: '66431',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY5',
  },
  {
    date: '2025-12-06',
    productCode: '65433',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY6',
  },
  {
    date: '2025-12-07',
    productCode: '66434',
    subtitle: 'При покупке от 2 790 рублей',
    promocode: 'HNY7',
  },
  {
    date: '2025-12-08',
    productCode: '65561',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY8',
  },
  {
    date: '2025-12-09',
    productCode: '65438',
    subtitle: 'При покупке от 2 790 рублей',
    promocode: 'HNY9',
  },
  {
    date: '2025-12-10',
    productCode: '65443',
    subtitle: 'При покупке от 2 890 рублей',
    promocode: 'HNY10',
  },
  {
    date: '2025-12-11',
    productCode: '66436',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY11',
  },
  {
    date: '2025-12-12',
    productCode: '685037',
    subtitle: 'При покупке от 2 990 рублей',
    promocode: 'HNY12',
  },
  {
    date: '2025-12-13',
    productCode: '05302',
    subtitle: 'При покупке от 2 890 рублей',
    promocode: 'HNY13',
  },
  {
    date: '2025-12-14',
    productCode: '685038',
    subtitle: 'При покупке от 2 890 рублей',
    promocode: 'HNY14',
  },
  {
    date: '2025-12-15',
    productCode: '65430',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY15',
  },
  {
    date: '2025-12-16',
    productCode: '06424',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY16',
  },
  {
    date: '2025-12-17',
    productCode: '68035',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY17',
  },
  {
    date: '2025-12-18',
    productCode: '65447',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY18',
  },
  {
    date: '2025-12-19',
    productCode: '685039',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY19',
  },
  {
    date: '2025-12-20',
    productCode: '65446',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY20',
  },
  {
    date: '2025-12-21',
    productCode: '65469',
    subtitle: 'При покупке от 2 890 рублей',
    promocode: 'HNY21',
  },
  {
    date: '2025-12-22',
    productCode: '66630',
    subtitle: 'При покупке от 2 890 рублей',
    promocode: 'HNY22',
  },
  {
    date: '2025-12-23',
    productCode: '65451',
    subtitle: 'При покупке от 2 690 рублей',
    promocode: 'HNY23',
  },
  {
    date: '2025-12-24',
    productCode: '66540',
    subtitle: 'При покупке от 2 990 рублей',
    promocode: 'HNY24',
  },
  {
    date: '2025-12-25',
    productCode: '66562',
    subtitle: 'При покупке от 2 890 рублей',
    promocode: 'HNY25',
  },

];

export default {
  name: 'Advent2025Page',
  components: {
    IntroScreen,
    CalendarScreen,
    PromoModal,
  },
  data() {
    return {
      currentScreen: 'intro', // 'intro' | 'calendar'
      days,
      isModalVisible: false,
      selectedDay: null,
      selectedPromo: null,
      isForward: true, // направление перехода: true = вперед, false = назад
    };
  },
  head() {
    return {
      title: 'Адвент-календарь 2025 | Fuji',
      meta: [
        {
          hid: 'description',
          name: 'description',
          content: 'Открывайте каждый день новую ячейку адвент-календаря и получайте промокоды на подарки',
        },
        {
          hid: 'og:title',
          property: 'og:title',
          content: 'Адвент-календарь 2025 | Fuji',
        },
        {
          hid: 'og:description',
          property: 'og:description',
          content: 'Открывайте каждый день новую ячейку адвент-календаря и получайте промокоды на подарки',
        },
      ],
    };
  },
  computed: {
    currentDay() {
      // Получаем текущую дату
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth(); // 0 = январь, 11 = декабрь
      const day = now.getDate();

      // Если сейчас декабрь 2025, возвращаем текущий день
      if (year === 2025 && month === 11) {
        return day;
      }
      return null;
    },
  },
  mounted() {
    if (this.$route.query.screen === 'calendar') {
      this.currentScreen = 'calendar';
    }

    // Предзагрузка фоновых изображений для календаря
    this.preloadBackgrounds();
  },
  methods: {
    preloadBackgrounds() {
      // Предзагружаем все варианты фоновых изображений для календаря
      const backgrounds = [
        this.$ipx('/assets/images/content/Advent2025/bg-320.png', { w: 3500, f: 'webp', q: 100 }),
        this.$ipx('/assets/images/content/Advent2025/bg-768.png', { w: 3500, f: 'webp', q: 100 }),
        this.$ipx('/assets/images/content/Advent2025/bg-1280.png', { w: 3500, f: 'webp', q: 100 }),
      ];

      backgrounds.forEach((src) => {
        const img = new Image();
        img.src = src;
      });
    },

    showCalendar() {
      this.isForward = true;
      this.currentScreen = 'calendar';

      if (this.$route.query.screen !== 'calendar') {
        this.$router.replace({
          query: { screen: 'calendar' },
        });
      }
    },

    showIntro() {
      this.closeModal();
      this.isForward = false;
      this.currentScreen = 'intro';

      if (this.$route.query.screen) {
        this.$router.replace({
          query: {},
        });
      }
    },

    showLegal() {
      this.$router.push('/advent-2025/legal?from=calendar');
    },

    showPromoModal(day) {
      this.selectedDay = day;

      if (day) {
        const product = this.$store.getters['catalog/productByCode'](day.productCode);

        this.selectedPromo = {
          code: day.promocode,
          title: product?.name || 'Ваш подарок',
          description: day.subtitle || '',
          image: product?.image || null,
        };
      } else {
        this.selectedPromo = null;
      }

      this.isModalVisible = true;
    },

    closeModal() {
      this.isModalVisible = false;
      this.selectedDay = null;
      this.selectedPromo = null;
    },
  },
};
</script>

<style lang="scss">
// Глобальные стили для страницы адвента
.page:has(.advent-2025-page) .main {
  padding-top: 0;

  @media screen and (min-width: 1280px) {
    padding-top: 0;
  }
}

.page:has(.advent-2025-page) .header-wrapper {
  display: none;

  @media screen and (min-width: 1280px) {
    display: none;
  }
}

.page:has(.advent-2025-page) .footer {
  display: none;
}

.page--advent-2025 {
  margin-top: calc(var(--safe-area-inset-top, 0) * -1);
  margin-bottom: calc(var(--safe-area-inset-bottom, 0) * -1);
  padding-top: 0 !important;
}
</style>

<style lang="scss" scoped>
.advent-2025-page {
  position: relative;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 100vh;
  background: linear-gradient(61deg, rgba(6, 14, 37, 0.00) 9.85%, #060e25 35.36%), var(--Color-Main-Dark-Blue, #002a4d);

  // Делаем экраны абсолютными, чтобы они накладывались друг на друга
  ::v-deep .advent-intro,
  ::v-deep .advent-calendar {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    will-change: transform;
  }

  ::v-deep .advent-intro {
    z-index: 1;
  }

  ::v-deep .advent-calendar {
    z-index: 2;
  }
}

.advent-2025-page--forward {
  overflow-x: hidden;

  .screen-slide-enter-active {
    z-index: 2;
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .screen-slide-leave-active {
    z-index: 1;
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .screen-slide-enter {
    transform: translateX(100%);
  }

  .screen-slide-enter-to {
    transform: translateX(0);
  }

  .screen-slide-leave {
    transform: translateX(0);
  }

  .screen-slide-leave-to {
    transform: translateX(-100%);
  }
}

.advent-2025-page--backward {
  overflow-x: hidden;

  .screen-slide-enter-active {
    z-index: 2;
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .screen-slide-leave-active {
    z-index: 1;
    transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  }

  .screen-slide-enter {
    transform: translateX(-100%);
  }

  .screen-slide-enter-to {
    transform: translateX(0);
  }

  .screen-slide-leave {
    transform: translateX(0);
  }

  .screen-slide-leave-to {
    transform: translateX(100%);
  }
}
</style>
