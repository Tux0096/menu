import type { Config } from 'tailwindcss';

// Палитра админки — из гостевого QR-меню Фуджи (menu-web/guest/app.css):
//   brand  #091027 — фирменный тёмно-синий (сайдбар, основные кнопки, заголовки)
//   cta    #5A52D5 — главное действие страницы, счётчики «надо сделать»
//   accent #C6F9FD — голубой акцент гостевого меню (мягкие подложки)
//   blush  #ECEBF2 — фон полей и чипов, cream #F5F4F9 — фон страницы
export default <Partial<Config>>{
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#F3F4F8',
          100: '#E4E6EF',
          200: '#C5C9DB',
          300: '#9298B6',
          400: '#4C5478',
          500: '#091027',
          600: '#080E22',
          700: '#060B1B',
          800: '#050814',
          900: '#03050D',
          950: '#020307',
        },
        cta: {
          50: '#F1F0FC',
          100: '#E3E1F9',
          200: '#C6C3F2',
          300: '#A29DE8',
          400: '#7E77DE',
          500: '#5A52D5',
          600: '#463EC4',
          700: '#3A33A3',
          800: '#2F2A82',
          900: '#26226A',
          950: '#16143E',
        },
        accent: {
          50: '#F2FEFF',
          100: '#E3FDFE',
          200: '#C6F9FD',
          300: '#97F1FA',
          400: '#5CE2F3',
          500: '#22C6DD',
          600: '#159EB4',
          700: '#167E91',
          800: '#1A6676',
          900: '#1A5463',
          950: '#0A3743',
        },
        blush: { DEFAULT: '#ECEBF2' },
        cream: { DEFAULT: '#F5F4F9' },
      },
    },
  },
};
