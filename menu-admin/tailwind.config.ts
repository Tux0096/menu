import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

// Дизайн-токены админки (полное описание — docs/DESIGN_SYSTEM.md, часть 2 «Рабочие интерфейсы»).
// Админка и терминал официанта (menu-web/staff) — один визуальный язык: шрифт Inter, главное действие #5A52D5.
//   brand  #091027 — фирменный тёмно-синий (сайдбар, тёмные кнопки, заголовки, текст)
//   cta    #5A52D5 — главное действие страницы, счётчики «надо сделать»
//   accent #C6F9FD — голубой акцент (мягкие подложки)
//   blush  #ECEBF2 — фон полей и чипов, cream #F5F4F9 — фон страницы
//   ok / warn / danger — статусы: это штатные палитры Tailwind green / amber / red
//     (text-amber-700, text-red-600, bg-red-50 … остаются как есть — это и есть токены статусов);
//     алиасы ok-* / warn-* / danger-* — для нового кода. info = cta.
//   tag-* — цвета меток блюд (те же, что в гостевом меню, --tag-* в menu-web/guest/app.css)
//   text-2xs (11px) / text-3xs (10px) / text-nano (9px) — мелкие размеры шкалы вместо text-[11px] и т. п.

export default <Partial<Config>>{
  theme: {
    extend: {
      fontSize: {
        // без line-height — как произвольные text-[Npx]
        '2xs': '11px',
        '3xs': '10px',
        nano: '9px',
      },
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
        // статусы (алиасы штатных палитр Tailwind)
        ok: colors.green,
        warn: colors.amber,
        danger: colors.red,
        // метки блюд: DEFAULT — фон, ink — текст (bg-tag-hit text-tag-hit-ink)
        tag: {
          mild: { DEFAULT: '#C7EA98', ink: '#2B5D21' },
          spicy: { DEFAULT: '#FFB9CA', ink: '#76122B' },
          new: { DEFAULT: '#FFC9AC', ink: '#CB4700' },
          hit: { DEFAULT: '#DFC0FF', ink: '#6000C7' },
          kids: { DEFAULT: '#FFCEEE', ink: '#710049' },
          gift: { DEFAULT: '#93C9EA', ink: '#0C4F79' },
          nosugar: { DEFAULT: '#B0D77D', ink: '#456E0F' },
        },
        // рамка телефона в превью карточки блюда
        bezel: '#2B2523',
      },
    },
  },
};
