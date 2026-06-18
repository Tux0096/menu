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
      days: this.getNextThreeDays(),
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

      const { timeShift } = this.currentDate;
      return this.generateTimeRange(date, endDate, timeShift);
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
    generateTimeRange(currentDate, endDate, timeShift = 120) {
      const result = [];

      const dayOfWeek = currentDate.getDay();
      currentDate.setHours(currentDate.getHours(), 0 + timeShift, 0, 0);
      const newDayOfWeek = currentDate.getDay();
      if (dayOfWeek !== newDayOfWeek) {
        return [];
      }

      while (currentDate <= endDate) {
        const startHours = currentDate.getHours()
          .toString()
          .padStart(2, '0');
        const startMinutes = currentDate.getMinutes()
          .toString()
          .padStart(2, '0');

        currentDate.setMinutes(currentDate.getMinutes() + 30);

        const endHours = currentDate.getHours()
          .toString()
          .padStart(2, '0');
        const endMinutes = currentDate.getMinutes()
          .toString()
          .padStart(2, '0');

        result.push({
          from: `${startHours}:${startMinutes}`,
          to: `${endHours}:${endMinutes}`,
        });
      }

      return result;
    },
    getNextThreeDays() {
      const formatDate = (date) => this.$dateFns.format(date, 'd MMMM');

      const workTimes = this.$store.getters['setting/WORK_TIME'];

      const today = new Date();
      const endDate = new Date();
      const todayDay = today.getDay();
      const todayDayWorkTime = workTimes[todayDay];
      const todayDayWorkTimeOpen = Number.parseInt(todayDayWorkTime.open, 10);
      const todayDayWorkTimeClose = Number.parseInt(todayDayWorkTime.close, 10);
      let todayTimeShift = 120;
      if ([5, 6, 0].includes(todayDay)) {
        todayTimeShift = 150;
      }
      if (todayDayWorkTimeOpen > today.getHours()) {
        today.setHours(todayDayWorkTimeOpen);
        today.setMinutes(0);
        today.setSeconds(0);
        todayTimeShift = 60;
      }

      endDate.setHours(todayDayWorkTimeClose);
      if (todayDayWorkTime.isNextDay) {
        endDate.setDate(endDate.getDate() + 1);
      }
      endDate.setMinutes(0);
      endDate.setSeconds(0);

      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowDay = tomorrow.getDay();
      const tomorrowDayWorkTime = workTimes[tomorrowDay];
      tomorrow.setHours(Number.parseInt(tomorrowDayWorkTime.open, 10));
      tomorrow.setMinutes(0);
      tomorrow.setSeconds(0);
      let tomorrowTimeShift = 60;
      if ([5, 6, 0].includes(tomorrowDay)) {
        tomorrowTimeShift = 90;
      }

      const endTomorrow = new Date();
      endTomorrow.setDate(endTomorrow.getDate() + 1);
      const tomorrowDayWorkTimeClose = Number.parseInt(tomorrowDayWorkTime.close, 10);
      endTomorrow.setHours(tomorrowDayWorkTimeClose);
      if (tomorrowDayWorkTime.isNextDay) {
        endTomorrow.setDate(endTomorrow.getDate() + 1);
      }
      endTomorrow.setMinutes(0);
      endTomorrow.setSeconds(0);

      const dayAfterTomorrow = new Date();
      dayAfterTomorrow.setDate(today.getDate() + 2);
      const dayAfterTomorrowDay = dayAfterTomorrow.getDay();
      const dayAfterTomorrowDayWorkTime = workTimes[dayAfterTomorrowDay];
      dayAfterTomorrow.setHours(Number.parseInt(dayAfterTomorrowDayWorkTime.open, 10));
      dayAfterTomorrow.setMinutes(0);
      dayAfterTomorrow.setSeconds(0);
      let dayAfterTomorrowTimeShift = 60;
      if ([5, 6, 0].includes(dayAfterTomorrowDay)) {
        dayAfterTomorrowTimeShift = 90;
      }

      const endDayAfterTomorrow = new Date();
      endDayAfterTomorrow.setDate(endDayAfterTomorrow.getDate() + 2);
      const endDayAfterTomorrowWorkTimeClose = Number.parseInt(dayAfterTomorrowDayWorkTime.close, 10);
      endDayAfterTomorrow.setHours(endDayAfterTomorrowWorkTimeClose);
      if (dayAfterTomorrowDayWorkTime.isNextDay) {
        endDayAfterTomorrow.setDate(endDayAfterTomorrow.getDate() + 1);
      }
      endDayAfterTomorrow.setMinutes(0);
      endDayAfterTomorrow.setSeconds(0);

      const result = [];

      if ((new Date()).getHours() < 22) {
        result.push({
          date: today,
          endDate,
          formattedDate: 'Сегодня',
          isToday: true,
          timeShift: todayTimeShift,
        });
      }
      result.push({
        date: tomorrow,
        endDate: endTomorrow,
        formattedDate: `${formatDate(tomorrow)}`,
        isToday: false,
        timeShift: tomorrowTimeShift,
      });

      result.push({
        date: dayAfterTomorrow,
        endDate: endDayAfterTomorrow,
        formattedDate: `${formatDate(dayAfterTomorrow)}`,
        isToday: false,
        timeShift: dayAfterTomorrowTimeShift,
      });
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
    padding-bottom: extClamp(12);
    gap: extClamp(6);

    @media screen and (min-width: 768px) {
      gap: 16px;
    }

    @media screen and (min-width: 1280px) {

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
    width: calc(100% / 3 - extClamp(4));
    height: extClamp(27);
    padding: extClamp(10) 0;
    text-align: center;
    color: var(---Main-Purple, #993ca6);
    border: 1px solid var(---Main-Purple, #993ca6);
    border-radius: extClamp(16);
    gap: extClamp(10);

    @media screen and (min-width: 768px) {
      font-size: 16px;
      width: calc(100% / 3 - 11px);
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
