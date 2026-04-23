<template>
  <div class="time-selection">
    <div class="time-selection__days">
      <div
        v-for="(day, idx) in days"
        :key="`day-${idx}`"
        :class="{'time-selection__day--active' : currentDate === day}"
        class="time-selection__day"
        @click="setCurrentDay(day)"
      >
        {{ day.formattedDate }}
      </div>
    </div>
    <div
      v-if="times.length > 0"
      :key="currentDate.date.toString()"
      class="time-selection__inner"
    >
      <BaseTimeSelectionItem
        v-for="time in times"
        :key="`${time.from} - ${time.to}`"
        :is-active="selectedTime?.from === time.from && selectedTime?.to === time.to"
        :prop-time-data="time"
        class="time-selection__line"
        @click="setTime(time)"
      />
    </div>
    <div
      v-else
      class="time-selection__message"
    >
      Нет доступных интервалов доставки.
    </div>
  </div>
</template>

<script>

export default {
  name: 'BaseTimeSelection',
  props: {
    propSelectedTime: {
      type: [Object, String],
      default: '',
    },
  },

  data() {
    return {
      selectedTime: null,
      days: this.getNextSevenDays(),
      currentDate: null,
    };
  },
  computed: {
    times() {
      if (!this.currentDate?.date) {
        return [];
      }
      const date = new Date(this.currentDate.date);

      let endDate = new Date(this.currentDate.date);
      endDate.setHours(23, 30, 0, 0);
      if (this.currentDate.endDate) {
        endDate = new Date(this.currentDate.endDate);
      }

      const { timeShift, intervalMinutes, maxEndTime } = this.currentDate;
      return this.generateTimeRange(
        date,
        endDate,
        timeShift,
        intervalMinutes || 30,
        maxEndTime || null,
      );
    },
  },
  created() {
    this.setInitialTime();
    [this.currentDate] = this.days;
  },
  methods: {
    setInitialTime() {
      if (this.propSelectedTime) {
        this.selectedTime = this.propSelectedTime;
      } else {
        this.$nextTick(() => {
          const [firstTime] = this.times;
          this.selectedTime = firstTime;
          /// ///
          this.selectedTime = firstTime;
          const fn = this.$store.state.modal.callback;
          if (typeof fn === 'function') {
            const result = {
              ...firstTime,
              ...this.currentDate,
            };

            fn(result);
          }
        });
      }
    },

    setTime(time) {
      this.selectedTime = time;
      const fn = this.$store.state.modal.callback;
      if (typeof fn === 'function') {
        const result = {
          ...time,
          ...this.currentDate,
        };

        fn(result);
      }
      this.$store.commit('modal/hideModal');
    },
    setCurrentDay(day) {
      this.currentDate = day;
    },
    generateTimeRange(currentDate, endDate, timeShift = 120, intervalMinutes = 30, maxEndTime = null) {
      const result = [];

      // Сохраняем исходную дату для проверки 31 декабря
      const originalDate = new Date(currentDate);
      const isDecember31 = originalDate.getMonth() === 11 && originalDate.getDate() === 31;

      const dayOfWeek = currentDate.getDay();
      currentDate.setHours(currentDate.getHours(), 0 + timeShift, 0, 0);
      const newDayOfWeek = currentDate.getDay();
      if (dayOfWeek !== newDayOfWeek) {
        return [];
      }

      // Для 31 декабря устанавливаем специальную логику
      if (isDecember31 && maxEndTime) {
        const lastIntervalStart = new Date(currentDate);
        lastIntervalStart.setHours(17, 0, 0, 0);

        // Генерируем интервалы по 2 часа до 17:00
        while (currentDate < lastIntervalStart) {
          const nextTime = new Date(currentDate);
          nextTime.setMinutes(nextTime.getMinutes() + intervalMinutes);

          // Если следующий интервал превышает 17:00, останавливаемся
          if (nextTime > lastIntervalStart) {
            break;
          }

          const startHours = currentDate.getHours()
            .toString()
            .padStart(2, '0');
          const startMinutes = currentDate.getMinutes()
            .toString()
            .padStart(2, '0');

          const endHours = nextTime.getHours()
            .toString()
            .padStart(2, '0');
          const endMinutes = nextTime.getMinutes()
            .toString()
            .padStart(2, '0');

          result.push({
            from: `${startHours}:${startMinutes}`,
            to: `${endHours}:${endMinutes}`,
          });

          currentDate = nextTime;
        }

        // Добавляем последний интервал 17:00-19:00
        result.push({
          from: '17:00',
          to: '19:00',
        });
      } else {
        // Обычная логика для остальных дней
        while (currentDate <= endDate) {
          const startHours = currentDate.getHours()
            .toString()
            .padStart(2, '0');
          const startMinutes = currentDate.getMinutes()
            .toString()
            .padStart(2, '0');

          const nextTime = new Date(currentDate);
          nextTime.setMinutes(nextTime.getMinutes() + intervalMinutes);

          if (nextTime > endDate) {
            break;
          }

          const endHours = nextTime.getHours()
            .toString()
            .padStart(2, '0');
          const endMinutes = nextTime.getMinutes()
            .toString()
            .padStart(2, '0');

          result.push({
            from: `${startHours}:${startMinutes}`,
            to: `${endHours}:${endMinutes}`,
          });

          currentDate = nextTime;
        }
      }

      return result;
    },
    getNextSevenDays() {
      const formatDate = (date) => this.$dateFns.format(date, 'd MMMM');

      const workTimes = this.$store.getters['setting/WORK_TIME'];
      const today = new Date();
      const result = [];

      // Обрабатываем сегодняшний день
      if (today.getHours() < 22) {
        const todayCopy = new Date(today);
        const endDate = new Date(today);
        const todayDay = todayCopy.getDay();
        const todayDayWorkTime = workTimes[todayDay];
        const todayDayWorkTimeOpen = Number.parseInt(todayDayWorkTime.open, 10);
        const todayDayWorkTimeClose = Number.parseInt(todayDayWorkTime.close, 10);
        let todayTimeShift = 120;
        if ([5, 6, 0].includes(todayDay)) {
          todayTimeShift = 150;
        }
        if (todayDayWorkTimeOpen > todayCopy.getHours()) {
          todayCopy.setHours(todayDayWorkTimeOpen);
          todayCopy.setMinutes(0);
          todayCopy.setSeconds(0);
          todayTimeShift = 60;
        }

        endDate.setHours(todayDayWorkTimeClose);
        if (todayDayWorkTime.isNextDay) {
          endDate.setDate(endDate.getDate() + 1);
        }
        endDate.setMinutes(0);
        endDate.setSeconds(0);

        result.push({
          date: todayCopy,
          endDate,
          formattedDate: 'Сегодня',
          isToday: true,
          timeShift: todayTimeShift,
        });
      }

      const daysToShow = 7;
      for (let i = 1; i <= daysToShow; i += 1) {
        const dayDate = new Date(today);
        dayDate.setDate(today.getDate() + i);
        const dayOfWeek = dayDate.getDay();
        const dayWorkTime = workTimes[dayOfWeek];
        const dayWorkTimeOpen = Number.parseInt(dayWorkTime.open, 10);
        const dayWorkTimeClose = Number.parseInt(dayWorkTime.close, 10);

        dayDate.setHours(dayWorkTimeOpen);
        dayDate.setMinutes(0);
        dayDate.setSeconds(0);

        let dayTimeShift = 60;
        if ([5, 6, 0].includes(dayOfWeek)) {
          dayTimeShift = 90;
        }

        const endDayDate = new Date(dayDate);
        endDayDate.setHours(dayWorkTimeClose);
        if (dayWorkTime.isNextDay) {
          endDayDate.setDate(endDayDate.getDate() + 1);
        }
        endDayDate.setMinutes(0);
        endDayDate.setSeconds(0);

        // Проверяем, является ли это 31 декабря
        const isDecember31 = dayDate.getMonth() === 11 && dayDate.getDate() === 31;

        const dayConfig = {
          date: dayDate,
          endDate: endDayDate,
          formattedDate: formatDate(dayDate),
          isToday: false,
          timeShift: dayTimeShift,
        };

        // Для 31 декабря устанавливаем специальные параметры
        if (isDecember31) {
          dayConfig.intervalMinutes = 120; // 2 часа вместо 30 минут
          dayConfig.maxEndTime = '19:00'; // Ограничение до 17:00-19:00
        }

        result.push(dayConfig);
      }

      return result;
    },
  },
};
</script>

<style lang="scss"
       scoped
>
.time-selection {

  // .time-selection__inner
  &__inner {
    position: relative;
    display: flex;
    overflow: auto;
    flex-direction: column;
    max-height: extClamp(250);
    padding-top: extClamp(8);
    padding-bottom: extClamp(8);
    border-radius: extClamp(12);
    background: var(---Primary-LightGray, #f5f5f5);
    gap: extClamp(4);

    @media screen and (min-width: 768px) {
      height: 324px;
      padding-top: 8px;
      padding-bottom: 8px;
    }

    @media screen and (min-width: 1280px) {

    }

    &::-webkit-scrollbar {
      display: none;
    }

    &::after {
      position: fixed;
      top: extClamp(86);
      bottom: extClamp(41);
      left: 50%;
      width: 1px;
      content: '';
      background-color: var(---Extra-LightGray, #e8e8e8);

      @media screen and (min-width: 768px) {
        top: 114px;
        bottom: 46px;
      }

      @media screen and (min-width: 1280px) {

      }
    }
  }

  // .time-selection__message
  &__message {
    font-size: extClamp(14);
    font-weight: 500;
    text-align: center;

    @media screen and (min-width: 768px) {
      font-size: 16px;
    }

    @media screen and (min-width: 1280px) {

    }
  }

  // .time-selection__days
  &__days {
    display: flex;
    overflow-x: auto;
    margin-bottom: extClamp(6);
    padding-bottom: extClamp(6);
    gap: extClamp(6);
    scrollbar-width: none;
    -ms-overflow-style: none;

    &::-webkit-scrollbar {
      display: none;
    }

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {
      scrollbar-width: thin;
      scrollbar-color: var(---Main-Purple, #993ca6) transparent;

      &::-webkit-scrollbar {
        display: block;
      }

      &::-webkit-scrollbar-track {
        background: transparent;
      }

      &::-webkit-scrollbar-thumb {
        border-radius: 2px;
        background-color: var(---Main-Purple, #993ca6);
      }

      &::-webkit-scrollbar-thumb:hover {
        background-color: var(---Main-Purple, #993ca6);
      }
    }
  }

  // .time-selection__day
  &__day {
    font-size: extClamp(10);
    font-weight: 500;
    line-height: 62%;
    display: flex;
    align-items: center;
    flex-shrink: 0;
    justify-content: center;
    width: 28%;
    height: extClamp(27);
    padding: extClamp(10) 0;
    text-align: center;
    color: var(---Main-Purple, #993ca6);
    border: 1px solid var(---Main-Purple, #993ca6);
    border-radius: extClamp(16);
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      width: 28%;
      height: 35px;
      padding: 12px 0;
      border-radius: 16px;

    }

    @media screen and (min-width: 1280px) {

    }

    // .time-selection__day--active
    &--active {
      color: var(---Main-White, #fff);
      background: var(---Main-Purple, #993ca6);
    }
  }
}

</style>
