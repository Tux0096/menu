<template>
  <div
    :class="[
      'advent-day',
      {
        'advent-day--past': isPast,
        'advent-day--current': isCurrent,
        'advent-day--future': isFuture,
      }
    ]"
    @click="handleClick"
  >
    <!-- Анимированные звёздочки для текущей даты -->
    <div 
      v-if="isCurrent"
      class="advent-day__stars"
    >
      <div
        v-for="star in 6"
        :key="star"
        :class="`advent-day__float-star advent-day__float-star--${star}`"
      />
    </div>

    <!-- Градиентный фон -->
    <div class="advent-day__gradient" />

    <!-- Номер дня -->
    <div class="advent-day__number">
      {{ dayNumber }}
    </div>

    <!-- Декабрь -->
    <div class="advent-day__month">
      дек
    </div>
  </div>
</template>

<script>
export default {
  name: 'DayItem',
  props: {
    day: {
      type: Object,
      required: true,
    },
    currentDate: {
      type: String,
      required: true,
    },
  },
  computed: {
    dayNumber() {
      const date = new Date(this.day.date);
      return date.getDate();
    },
    isPast() {
      return this.day.date < this.currentDate;
    },
    isCurrent() {
      return this.day.date === this.currentDate;
    },
    isFuture() {
      return this.day.date > this.currentDate;
    },
  },
  methods: {
    handleClick() {
      if (this.isCurrent) {
        this.$emit('click');
      }
    },
  },
};
</script>

<style lang="scss" scoped>
.advent-day {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: extClamp(100);
  height: extClamp(120);
  overflow: hidden;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: extClamp(16);
  background: rgba(255, 255, 255, 0.05);
  transition: all 0.3s ease;

  @media screen and (min-width: 768px) {
    width: 120px;
    height: 140px;
    border-radius: 20px;
  }

  @media screen and (min-width: 1280px) {
    width: 140px;
    height: 160px;
    border-radius: 24px;
  }

  // Прошедшая дата
  &--past {
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
    opacity: 0.5;

    .advent-day__number,
    .advent-day__month {
      color: rgba(255, 255, 255, 0.4);
    }
  }

  // Текущая дата
  &--current {
    cursor: pointer;
    border-width: 2px;
    border-color: rgba(255, 215, 0, 0.8);
    background: rgba(255, 215, 0, 0.15);
    animation: currentDayPulse 2s ease-in-out infinite;

    .advent-day__gradient {
      opacity: 1;
      background: linear-gradient(135deg, 
        rgba(255, 215, 0, 0.3) 0%, 
        rgba(255, 237, 78, 0.2) 100%
      );
    }

    .advent-day__number,
    .advent-day__month {
      color: #ffd700;
      text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }

    // Hover только для десктопа
    @media screen and (min-width: 1280px) {
      &:hover {
        border-width: 2px;
        border-color: #fff;
        transform: scale(1.05);
        box-shadow: 0 10px 30px rgba(255, 215, 0, 0.4);

        .advent-day__gradient {
          background: linear-gradient(135deg, 
            rgba(255, 255, 255, 0.3) 0%, 
            rgba(255, 255, 255, 0.2) 100%
          );
        }
      }
    }
  }

  // Будущая дата
  &--future {
    border-color: rgba(255, 255, 255, 0.15);
    background: rgba(255, 255, 255, 0.03);

    .advent-day__number,
    .advent-day__month {
      color: rgba(255, 255, 255, 0.5);
    }
  }

  // Плавающие звёздочки
  &__stars {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  &__float-star {
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: #ffd700;
    box-shadow: 0 0 8px #ffd700;
    animation: floatStar 3s ease-in-out infinite;

    &--1 {
      top: 20%;
      left: 15%;
      animation-delay: 0s;
    }

    &--2 {
      top: 30%;
      right: 20%;
      animation-delay: 0.5s;
    }

    &--3 {
      bottom: 30%;
      left: 25%;
      animation-delay: 1s;
    }

    &--4 {
      bottom: 25%;
      right: 15%;
      animation-delay: 1.5s;
    }

    &--5 {
      top: 50%;
      left: 10%;
      animation-delay: 2s;
    }

    &--6 {
      top: 60%;
      right: 10%;
      animation-delay: 2.5s;
    }
  }

  // Градиент
  &__gradient {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    transition: all 0.3s ease;
  }

  // Номер дня
  &__number {
    @include MobHeadline1;
    position: relative;
    z-index: 1;
    margin-bottom: extClamp(4);
    color: #fff;
    transition: all 0.3s ease;

    @media screen and (min-width: 768px) {
      @include WebHeadline2;
      margin-bottom: 8px;
    }

    @media screen and (min-width: 1280px) {
      font-size: 56px;
    }
  }

  // Месяц
  &__month {
    @include MobCaption;
    position: relative;
    z-index: 1;
    color: rgba(255, 255, 255, 0.7);
    text-transform: uppercase;
    letter-spacing: 1px;
    transition: all 0.3s ease;

    @media screen and (min-width: 768px) {
      @include WebCaption;
      font-size: 14px;
    }
  }
}

// Анимация пульсации текущего дня
@keyframes currentDayPulse {
  0%, 100% {
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(255, 215, 0, 0.6);
  }
}

// Анимация плавающих звёздочек
@keyframes floatStar {
  0%, 100% {
    transform: translateY(0) scale(1);
    opacity: 0.6;
  }
  50% {
    transform: translateY(-10px) scale(1.2);
    opacity: 1;
  }
}
</style>


