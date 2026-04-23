// Миксин для генерации звезд на фоне (Advent 2025)
export default {
  data() {
    return {
      allStars: [],
      containerWidth: 320, // Ширина контейнера со звездами
      containerHeight: 568, // Высота контейнера со звездами
      viewportWidth: 320, // Реальная ширина viewport (для брейкпоинтов)
      viewportHeight: 568, // Реальная высота viewport
      celestialBodies: [], // Луны и солнца с движением по эллипсу
      animationFrameId: null,
    };
  },
  methods: {
    initViewportSize(containerRef) {
      // Реальные размеры viewport (для брейкпоинтов и макетов)
      this.viewportWidth = window.innerWidth;
      this.viewportHeight = window.innerHeight;

      if (containerRef) {
        // Размеры контейнера со звездами
        this.containerWidth = containerRef.clientWidth
          || containerRef.offsetWidth;
        this.containerHeight = containerRef.clientHeight
          || containerRef.offsetHeight;
      } else {
        // Fallback - используем размеры окна
        this.containerWidth = this.viewportWidth;
        this.containerHeight = this.viewportHeight;
      }
    },
    generateStars() {
      // Варианты анимированных звезд с разными задержками
      const animatedVariants = [
        require('~/assets/images/content/Advent2025/star-animated.svg'),
        require('~/assets/images/content/Advent2025/star-animated-1.svg'),
        require('~/assets/images/content/Advent2025/star-animated-2.svg'),
        require('~/assets/images/content/Advent2025/star-animated-3.svg'),
      ];

      // Типы звезд из макета с их характеристиками
      const starTypes = [
        {
          type: 'mini',
          src: require('~/assets/images/content/Advent2025/star-mini.svg'),
          size: 10,
          frequency: 0.60, // 60% - самые частые
          alt: '',
        },
        {
          type: 'animated',
          src: null, // Будет выбран случайно из вариантов
          size: 24,
          frequency: 0.25, // 25%
          alt: '',
        },
        {
          type: 'glare-small',
          src: require('~/assets/images/content/Advent2025/glare-small.svg'),
          size: 24,
          frequency: 0.10, // 10%
          alt: '',
        },
        {
          type: 'glare-large',
          src: require('~/assets/images/content/Advent2025/glare-large.svg'),
          size: 72,
          frequency: 0.05, // 5% - самые редкие
          alt: '',
        },
      ];

      // Количество звезд пропорционально площади контейнера
      const densityCoefficient = 15000;
      const totalStars = Math.floor(
        (this.containerWidth * this.containerHeight) / densityCoefficient,
      );

      for (let i = 0; i < totalStars; i += 1) {
        const rand = Math.random();
        let cumulativeFrequency = 0;
        let selectedType = starTypes[0];

        // Выбираем тип звезды на основе частоты
        for (const starType of starTypes) {
          cumulativeFrequency += starType.frequency;
          if (rand <= cumulativeFrequency) {
            selectedType = starType;
            break;
          }
        }

        // Для animated звезд выбираем случайный вариант с разной задержкой
        const starSrc = selectedType.type === 'animated'
          ? animatedVariants[Math.floor(Math.random()
            * animatedVariants.length)]
          : selectedType.src;

        this.allStars.push({
          id: `star-${i}`,
          type: selectedType.type,
          src: starSrc,
          size: selectedType.size,
          top: Math.random() * 100,
          left: Math.random() * 100,
          // Задержка только для glare (animated имеет встроенные задержки в SVG)
          delay: selectedType.type.includes('glare') ? Math.random() * 3 : 0,
          alt: selectedType.alt,
        });
      }

      // Добавляем падающие звезды (меньше на мобильных)
      // const shootingCount = 1;
      // for (let i = 0; i < shootingCount; i += 1) {
      //   this.allStars.push({
      //     id: `shooting-${i}`,
      //     type: 'shooting',
      //     src: require('~/assets/images/content/Advent2025/star-shooting.svg'),
      //     size: 100, // Ширина включая хвост
      //     top: -10, // Начинаем за пределами экрана
      //     left: Math.random() * 100,
      //     delay: Math.random() * 10 + i * 5,
      //     alt: '',
      //   });
      // }
    },
    generateCelestialBodies() {
      // Генерируем луны (2-3 штуки)
      const moonCount = 2;
      for (let i = 0; i < moonCount; i += 1) {
        const size = 48 + Math.random() * 64; // От 48 до 112px
        const centerX = 20 + Math.random() * 60; // Центр эллипса по X (в %)
        const centerY = 20 + Math.random() * 60; // Центр эллипса по Y (в %)
        const radiusX = 10 + Math.random() * 20; // Горизонтальный радиус (в %)
        const radiusY = 10 + Math.random() * 20; // Вертикальный радиус (в %)
        const speed = 0.0003 + Math.random() * 0.0002; // Очень медленная скорость
        const startAngle = Math.random() * Math.PI * 2; // Случайный начальный угол

        this.celestialBodies.push({
          id: `moon-${i}`,
          type: 'moon',
          src: require('~/assets/images/content/Advent2025/moon.svg'),
          size,
          centerX,
          centerY,
          radiusX,
          radiusY,
          speed,
          angle: startAngle,
          x: 0,
          y: 0,
          alt: '',
        });
      }

      // Генерируем солнца (2-3 штуки)
      const sunCount = 1;
      for (let i = 0; i < sunCount; i += 1) {
        const size = 40 + Math.random() * 48; // От 40 до 88px
        const centerX = 20 + Math.random() * 60;
        const centerY = 20 + Math.random() * 60;
        const radiusX = 15 + Math.random() * 25;
        const radiusY = 15 + Math.random() * 25;
        const speed = 0.0002 + Math.random() * 0.0003; // Очень медленная скорость
        const startAngle = Math.random() * Math.PI * 2;

        this.celestialBodies.push({
          id: `sun-${i}`,
          type: 'sun',
          src: require('~/assets/images/content/Advent2025/sun.svg'),
          size,
          centerX,
          centerY,
          radiusX,
          radiusY,
          speed,
          angle: startAngle,
          x: 0,
          y: 0,
          alt: '',
        });
      }

      // Вычисляем начальные позиции
      this.celestialBodies.forEach((body) => {
        body.x = body.centerX + body.radiusX * Math.cos(body.angle);
        body.y = body.centerY + body.radiusY * Math.sin(body.angle);
      });
    },
    animateCelestialBodies(timestamp) {
      this.celestialBodies.forEach((body) => {
        // Увеличиваем угол для движения по эллипсу
        body.angle += body.speed;

        // Вычисляем новую позицию на эллипсе
        body.x = body.centerX + body.radiusX * Math.cos(body.angle);
        body.y = body.centerY + body.radiusY * Math.sin(body.angle);
      });

      // Продолжаем анимацию
      this.animationFrameId = requestAnimationFrame(this.animateCelestialBodies);
    },
    startCelestialAnimation() {
      if (this.animationFrameId === null) {
        this.animationFrameId = requestAnimationFrame(this.animateCelestialBodies);
      }
    },
    stopCelestialAnimation() {
      if (this.animationFrameId !== null) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
    },
    getBreakpoint(width) {
      if (width >= 1280) return 'desktop';
      if (width >= 768) return 'tablet';
      return 'mobile';
    },
  },
  mounted() {
    // Запускаем анимацию небесных тел после монтирования
    if (this.celestialBodies.length > 0) {
      this.startCelestialAnimation();
    }
  },
  beforeDestroy() {
    // Останавливаем анимацию при уничтожении компонента
    this.stopCelestialAnimation();
  },
};
