// Тема Nuxt UI в цветах Фуджи (палитры — tailwind.config.ts).
// primary — фирменный тёмно-синий, gray — нейтральный slate. Главное действие страницы — <UButton color="cta">.
export default defineAppConfig({
  ui: {
    primary: 'brand',
    gray: 'slate',
    notifications: {
      position: 'top-0 bottom-auto',
    },
    notification: {
      rounded: 'rounded-xl',
    },
    button: {
      default: { size: 'md' },
      rounded: 'rounded-lg',
    },
    card: {
      rounded: 'rounded-2xl',
      ring: 'ring-1 ring-brand-100',
      shadow: 'shadow-sm',
    },
    input: {
      rounded: 'rounded-lg',
    },
    select: {
      rounded: 'rounded-lg',
    },
    badge: {
      rounded: 'rounded-full',
    },
    table: {
      th: { color: 'text-slate-500', font: 'font-medium', size: 'text-xs', padding: 'px-4 py-3' },
      td: { color: 'text-brand-500', padding: 'px-4 py-3' },
      tr: { active: 'hover:bg-cream cursor-pointer' },
      divide: 'divide-y divide-brand-50',
      tbody: 'divide-y divide-brand-50',
    },
    tabs: {
      list: {
        background: 'bg-blush/70',
        rounded: 'rounded-xl',
        marker: { rounded: 'rounded-lg' },
        tab: { active: 'text-brand-500', inactive: 'text-slate-500' },
      },
    },
  },
});
