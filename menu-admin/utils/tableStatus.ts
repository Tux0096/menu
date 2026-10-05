import type { WorkflowStatus } from '~/types/api';

type Color = 'brand' | 'cta' | 'amber' | 'green' | 'sky' | 'red' | 'gray';

// Статусы стола — как у официанта (menu-api/services/table-session.js, WORKFLOW)
export const TABLE_STATUS: Record<WorkflowStatus, { label: string; color: Color }> = {
  browsing: { label: 'Изучает меню', color: 'gray' },
  building_cart: { label: 'Выбирает блюда', color: 'gray' },
  cart_ready: { label: 'Ждёт официанта', color: 'amber' },
  waiter_review: { label: 'Уточняется', color: 'sky' },
  in_production: { label: 'На кухне', color: 'sky' },
  reorder_pending: { label: 'Дозаказ', color: 'amber' },
  bill_requested: { label: 'Просит счёт', color: 'cta' },
  paid: { label: 'Оплачено', color: 'green' },
  closed: { label: 'Закрыт', color: 'green' },
};

/** Неизвестный статус рисуем нейтрально, не падаем */
export function tableStatus(s: string | null | undefined) {
  return TABLE_STATUS[s as WorkflowStatus] ?? { label: s || '—', color: 'gray' as Color };
}

/** Столы, которые ждут официанта: новый заказ/дозаказ, счёт */
export const WAITING_STATUSES: WorkflowStatus[] = ['cart_ready', 'reorder_pending', 'bill_requested'];
