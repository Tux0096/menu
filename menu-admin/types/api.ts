// Ответы menu-api (menu-api/app.js, раздел «Персонал» и «Админка»). Деньги — в рублях.

export type StaffRole = 'admin' | 'manager' | 'marketing' | 'waiter';

export interface Staff {
  id: string;
  login: string;
  name: string;
  role: StaffRole;
  restaurantId: string | null;
  isActive?: boolean;
  hasPin?: boolean;
  /** Создан входом по коду из iiko (только чтение) */
  fromIiko?: boolean;
  /** Должность в iiko */
  position?: string | null;
  lastLoginAt?: string | null;
}

export interface LoginResponse {
  token: string;
  staff: Staff;
}

/** Ошибка API: { error, code?, details? } */
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface Restaurant {
  id: string;
  name: string;
  address: string | null;
  slug: string;
  tables_count: number;
  is_disabled: boolean;
  organization_id: string | null;
  terminal_group_id: string | null;
}

export type WorkflowStatus =
  | 'browsing'
  | 'building_cart'
  | 'cart_ready'
  | 'waiter_review'
  | 'in_production'
  | 'reorder_pending'
  | 'bill_requested'
  | 'paid'
  | 'closed';

export interface ActiveSession {
  sessionId: string;
  tableNumber: string;
  status: string;
  workflowStatus: WorkflowStatus;
  workflowLabel?: string;
  guest?: { name?: string | null } | null;
  guests?: { name: string; seat?: number }[];
  total: number;
  waitingMinutes: number | null;
  isOverdue: boolean;
  readyCount?: number;
  pendingCount?: number;
  waiterId?: string | null;
  waiterName?: string | null;
  createdAt?: string;
  /** Заказ открыт на кассе iiko (импорт), а не гостем из меню */
  openedInIiko?: boolean;
  iikoWaiterName?: string | null;
}

export interface Dashboard {
  slaMinutes: number;
  activeTables: number;
  overdueTables: number;
  waitingTables: number;
  openCalls: number;
  today: {
    visits: number;
    orders: number;
    paid: number;
    revenue: number;
    avg_response_min: number;
    paidSum: number;
    tips: number;
    avgCheck: number;
  };
  feedback30d: { count: number; avg: number; low: number };
  waiters: { name: string; tables: number; revenue: number; rating: number; tips: number }[];
  sessions: ActiveSession[];
}

/** Бронь стола из iiko на сегодня (телефон — только в маске) */
export interface Reservation {
  id: string;
  time: string;
  startsAt: string;
  guestName: string;
  guests: number;
  table: string | null;
  tables: string[];
  phoneMasked: string;
  hasPhone: boolean;
  comment: string;
  /** upcoming — стола ещё нет, waiting — ждём, arrived — пришли, no_show — не пришли, cancelled / closed — в iiko */
  state: 'upcoming' | 'waiting' | 'arrived' | 'no_show' | 'cancelled' | 'closed';
  stateLabel: string;
  sessionId: string | null;
  sameName: boolean;
  conflict: boolean;
}

export interface ReservationsResponse {
  restaurant: { slug: string; name: string };
  items: Reservation[];
  sameNames: string[];
  /** Последняя загрузка из iiko (null — с запуска сервера ещё не было) */
  sync: { at: string; ok: boolean; seen: number; sections?: number; error?: string } | null;
}

export type MenuSource = 'main' | 'bar' | string;

export interface AdminProduct {
  id: string;
  iikoId?: string;
  name: string;
  group: string;
  price?: number;
  weight?: string | null;
  image?: string | null;
  description?: string | null;
  energy?: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbs?: number | null;
  allergens?: string[];
  isInStopList?: boolean;
  isRecommended?: boolean;
  badge?: string | null;
  sku?: string | null;
  priority?: number;
  video?: string | null;
  source?: MenuSource;
  isHidden: boolean;
}

export interface MenuOverride {
  id: string;
  product_id: string;
  restaurant_id: string | null;
  scope: 'restaurant' | 'global';
  [key: string]: unknown;
}

export interface AdminMenu {
  source: string;
  fetchedAt: string | null;
  groups: { id: string; name: string; parentGroup: string | null }[];
  products: AdminProduct[];
  overrides: MenuOverride[];
}

export type BannerPlacement = 'menu' | 'ai' | 'order';

export interface Banner {
  id?: number | string;
  title: string;
  text: string | null;
  image_url: string | null;
  product_id: string | null;
  category_id: string | null;
  link_url: string | null;
  placement: BannerPlacement;
  restaurant_id: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AiChip {
  id?: number | string;
  label: string;
  query: string;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface TableQr {
  table: string;
  url: string;
  qr: string;
}

export interface PaySettings {
  onlineEnabled: boolean;
  publicId: string | null;
  hasSecret: boolean;
  ready: boolean;
  iikoPaymentTypeId: string | null;
  iikoCashTypeId: string | null;
  iikoCardTypeId: string | null;
}

/** Правила продажи алкоголя точки (GET/POST /admin/alcohol) */
export interface AlcoholRules {
  enabled: boolean;
  from: string;
  to: string;
  tz: string;
  text: string;
  requireAgeConfirm: boolean;
  requireDocCheck: boolean;
  preview: { open: boolean; rulesText: string; closedMessage: string | null };
}

/** Лист списка с курсором (menu-api/lib/paging.js): ?limit=N&before=<nextCursor> */
export interface Paged<T> {
  items: T[];
  hasMore: boolean;
  nextCursor: string | null;
  total: number | null;
}

export interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  table_number: string;
  total: number;
  guest_name: string | null;
  guest_phone: string | null;
  waiter_name: string | null;
}

export interface AuditRow {
  id: string;
  created_at: string;
  staff_id: string | null;
  staff_name: string | null;
  action: string;
  entity: string | null;
  entity_id: string | null;
  payload: Record<string, unknown> | null;
}

/** Публичный каталог ресторана — для выбора блюда / раздела в баннере */
export interface PublicCatalog {
  groups: { id: string; name: string }[];
  products: { id: string; name: string; price: number; parentGroup: string }[];
}

/** Точка сети: подключение к iiko, меню и стоп-лист */
export interface NetworkPoint {
  id: string;
  slug: string;
  name: string;
  isDisabled: boolean;
  /** Подключена к API-ключу iiko — меню и стоп-лист обновляются; иначе показана последняя выгрузка */
  connected: boolean;
  /** Бар: none — нет, same — касса в той же iiko, separate — отдельная iiko */
  barMode?: 'none' | 'same' | 'separate';
  menuSource: string;
  menuUpdatedAt: string | null;
  products: number;
  stopCount: number;
  stopListRows: number;
  stopUpdatedAt: string | null;
}

/** Позиция на точке: есть в iiko точки; hidden — скрыта в админке; stop — в стоп-листе iiko */
export interface NetworkCell {
  productId: string;
  price: number;
  stop: boolean;
  hidden: boolean;
  hiddenEverywhere?: boolean;
  source?: string;
}

export interface NetworkItem {
  key: string;
  name: string;
  /** Название в iiko (без служебных пометок) — то, что видит гость, если своё не задано */
  iikoName?: string;
  /** Блюда нет в iiko ни на одной точке — карточка админки сохранена */
  gone?: boolean;
  group: string | null;
  image: string | null;
  description: string | null;
  badge: string | null;
  /** 'big' — большая карточка в списке гостя */
  cardSize?: string | null;
  // Содержимое карточки, как его видит гость сейчас (своё или из iiko)
  video?: string | null;
  weight?: string | null;
  energy?: number | null;
  proteins?: number | null;
  fats?: number | null;
  carbs?: number | null;
  allergens?: string | null;
  recommended?: boolean | null;
  /** Что гость выбирает в блюде: «Размер, Соус» */
  choices?: string | null;
  points: Record<string, NetworkCell>;
}

export interface NetworkMenu {
  points: NetworkPoint[];
  items: NetworkItem[];
}

export interface StopListItem {
  restaurantId: string;
  productId: string;
  name: string | null;
  type: string | null;
  inMenu: boolean;
  price: number | null;
  balance: number;
  stopped: boolean;
  source: string;
  sku: string | null;
  dateAdd: string | null;
  updatedAt: string | null;
}

export interface StopListPoint extends NetworkPoint {
  items: StopListItem[];
}

/** Кассы точки: кухня (ИП) и бар (ООО, крепкий алкоголь) — /admin/cashdesks */
export interface CashTerminal {
  id: string;
  name: string;
  alive: boolean | null;
  /** Открыта для облака iiko (иначе заказы через API на неё не пройдут) */
  enabled: boolean;
  role: string | null;
}
export interface CashSection {
  id: string;
  name: string;
  products: number;
  /** Сколько позиций раздела сейчас уходит на каждую кассу */
  current: Record<string, number>;
  auto: string;
  manual: string | null;
  target: string;
}
export interface Cashdesks {
  restaurant: { id: string; slug: string; name: string };
  connected: boolean;
  error: string | null;
  terminals: CashTerminal[];
  kitchen: { terminalGroupId: string | null };
  bars: { code: string; name: string; terminalGroupId: string | null; enabled: boolean; manual: boolean }[];
  sections: CashSection[];
}

/** Сколько iiko на точке: одна (кухня и бар в одной iiko) или две (бар в отдельной iiko) */
export interface IikoSetup {
  restaurant: { id: string; slug: string; name: string; organizationId: string | null };
  mode: 'one' | 'two';
  bar: { creds: string; organizationId: string; externalMenuId: string | null; enabled: boolean } | null;
  sameIikoBar: { terminalGroupId: string } | null;
  creds: { code: string; label: string }[];
}

export interface MenuCategory {
  key: string;
  name: string;
  image: string | null;
  /** Картинка раздела из iiko — гость видит её, пока своей нет */
  iikoImage?: string | null;
  /** Своё название для гостей (пусто — как в iiko) */
  title: string;
  /** Вкладка у гостя: '' — авто, kitchen, bar */
  tab: string;
  /** Раздел скрыт у гостей и официанта */
  hidden: boolean;
  /** Показывать раздел с этого времени («ЧЧ:ММ», по времени точки); пусто — без ограничения */
  showFrom?: string;
  /** Показывать раздел до этого времени («ЧЧ:ММ»); пусто — без ограничения */
  showUntil?: string;
  sortOrder: number | null;
  /** Раздел целиком со второй кассы (бар): настраивается отдельно от одноимённого раздела кухни */
  bar?: boolean;
  isBar: boolean;
  points: number;
  items: number;
}

export interface PointInfo {
  name: string;
  address: string;
  workHours: string;
}

/** База сотрудников «Фуджи Тим» (вход на of. по табельному) */
export interface FujiTeamStatus {
  configured: boolean;
  host: string;
  connected: boolean;
  error: string | null;
  query: string;
  queryFromEnv: boolean;
  enabled: boolean;
}
export interface FujiTeamSchema {
  tables: { schema: string; name: string; columns: { name: string; type: string }[] }[];
  suggestion: { table: string; query: string; note: string } | null;
}
export interface FujiTeamTest {
  total: number;
  active: number;
  duplicates: number;
  roles: Record<'waiter' | 'manager' | 'none', number>;
  points: { name: string; count: number }[];
  sample: { code: string; name: string; position: string; restaurant: string }[];
}
