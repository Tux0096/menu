import type { StaffRole } from '~/types/api';

export type NavGroupKey = 'main' | 'menu' | 'marketing' | 'guests' | 'restaurant' | 'system';

export interface NavItem {
  to: string;
  label: string;
  icon: string;
  roles: StaffRole[];
  group: NavGroupKey;
  /** Подсказка в меню и описание раздела для хлебных крошек */
  hint?: string;
  /** Не показывать в меню (страница есть, права проверяются) */
  hidden?: boolean;
  badge?: 'stopList'; // счётчик в сайдбаре
}

export const NAV_GROUPS: { key: NavGroupKey; title: string }[] = [
  { key: 'main', title: '' },
  { key: 'menu', title: 'Меню' },
  { key: 'marketing', title: 'Маркетинг' },
  { key: 'guests', title: 'Гости' },
  { key: 'restaurant', title: 'Ресторан' },
  { key: 'system', title: 'Система' },
];

// Права — как в menu-api (app.js): администратор — всё; управляющий — сводка зала и отзывы;
// маркетинг — карточки блюд, баннеры и AI-подсказки (без стоп-листа, сотрудников и оплаты).
// Официант работает в приложении на телефоне, в админку не входит.
const ADMIN: StaffRole[] = ['admin'];
const HALL: StaffRole[] = ['admin', 'manager'];
const CONTENT: StaffRole[] = ['admin', 'marketing'];

// Единый источник прав: из него строится сайдбар, хлебные крошки и проверяется доступ в middleware/auth.global.ts
export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Сводка', icon: 'i-heroicons-home', roles: HALL, group: 'main', hint: 'Зал сейчас и цифры дня' },

  { to: '/network-menu', label: 'Меню сети', icon: 'i-heroicons-table-cells', roles: CONTENT, group: 'menu', hint: 'Все позиции всех точек: где есть, цены, стоп' },
  { to: '/menu', label: 'Меню точки', icon: 'i-heroicons-book-open', roles: CONTENT, group: 'menu', badge: 'stopList', hint: 'Карточки и стоп-лист выбранной точки' },
  { to: '/stop-lists', label: 'Стоп-листы iiko', icon: 'i-heroicons-no-symbol', roles: CONTENT, group: 'menu', hint: 'Что сейчас на стопе в iiko по каждой точке' },

  { to: '/banners', label: 'Баннеры', icon: 'i-heroicons-photo', roles: CONTENT, group: 'marketing', hint: 'Карусель над меню, экран AI и заказа' },
  { to: '/ai-chips', label: 'AI-подсказки', icon: 'i-heroicons-sparkles', roles: CONTENT, group: 'marketing', hint: 'Чипы на экране AI-помощника' },

  { to: '/reviews', label: 'Отзывы', icon: 'i-heroicons-chat-bubble-left-right', roles: HALL, group: 'guests', hint: 'Оценки гостей после визита' },

  { to: '/qr', label: 'QR-коды столов', icon: 'i-heroicons-qr-code', roles: ADMIN, group: 'restaurant' },
  { to: '/cashdesks', label: 'Кассы', icon: 'i-heroicons-calculator', roles: ADMIN, group: 'restaurant', hint: 'Какой раздел меню на какую кассу iiko уходит: кухня или бар' },
  { to: '/payments', label: 'Оплата', icon: 'i-heroicons-credit-card', roles: ADMIN, group: 'restaurant', hint: 'Онлайн-оплата CloudPayments и типы оплат iiko' },

  { to: '/staff', label: 'Сотрудники', icon: 'i-heroicons-users', roles: ADMIN, group: 'system', hint: 'Доступы в админку и PIN для приложения официанта' },
  { to: '/audit', label: 'Журнал изменений', icon: 'i-heroicons-clipboard-document-list', roles: ADMIN, group: 'system' },
];

export const ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Администратор',
  manager: 'Управляющий',
  marketing: 'Маркетинг',
  waiter: 'Официант',
};

/** Что может каждая роль — показывается в карточке сотрудника */
export const ROLE_INFO: Record<StaffRole, string> = {
  waiter: 'Столы и заказы гостей в приложении «Фуджи Официант» (вход по PIN). В админку не входит.',
  manager: 'Сводка зала, отзывы гостей. В приложении официанта — всё, что может официант.',
  marketing: 'Контент меню: карточки блюд, фото и видео, метки «Хит/Новинка», баннеры, AI-подсказки. Без стоп-листа, сотрудников и оплаты.',
  admin: 'Всё: сотрудники и доступы, стоп-лист, QR-коды столов, оплата, контент и статистика.',
};

/** Находит пункт меню, к которому относится путь (для проверки доступа и активного пункта) */
export function findNavItem(path: string): NavItem | undefined {
  if (path === '/') return NAV_ITEMS[0];
  return NAV_ITEMS.filter((i) => i.to !== '/')
    .sort((a, b) => b.to.length - a.to.length)
    .find((i) => path === i.to || path.startsWith(`${i.to}/`));
}

export function navGroupTitle(key: NavGroupKey): string {
  return NAV_GROUPS.find((g) => g.key === key)?.title ?? '';
}

export function canAccess(path: string, role: StaffRole | null | undefined): boolean {
  if (!role) return false;
  const item = findNavItem(path);
  return item ? item.roles.includes(role) : true;
}

/** Первый доступный роли раздел — стартовая страница (маркетингу сводка зала недоступна) */
export function homeFor(role: StaffRole | null | undefined): string {
  return NAV_ITEMS.find((i) => !i.hidden && role && i.roles.includes(role))?.to ?? '/';
}
