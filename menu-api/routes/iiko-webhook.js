/** Вебхуки iiko: стоп-листы и статусы заказов на стол (токен — в заголовке Authorization). */
import express from 'express';
import { h, safeEqual } from '../lib/http.js';
import { sessionHasIikoOrderSql, uuidOrNull } from '../lib/uuid.js';
import { demoApply } from '../lib/iiko-demo-orders.js';
import { demoReservesApply } from '../lib/iiko-demo-reserves.js';
import { asBackground, isIikoDemo } from '../iiko-client.js';
import { importOpenOrders, scheduleImport } from '../services/iiko-import.js';
import { scheduleReserveSync, syncReserves } from '../services/iiko-reserves.js';
import { staffAuth } from '../services/staff-auth.js';
import pool from '../db/pool.js';
import { refreshStopLists, webhookToken } from '../services/stoplist.js';
import { invalidateCatalogCache } from '../services/catalog.js';
import { refreshFromIiko } from '../services/table-session.js';

const router = express.Router();
export default router;

// ── Вебхуки iiko: стоп-листы и статусы заказов на стол ──────────────────────
router.post('/api/v1/iiko/webhook', (req, res) => {
  const auth = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!safeEqual(auth, webhookToken())) return res.status(401).json({ error: 'bad token' });
  res.json({ ok: true });
  const events = Array.isArray(req.body) ? req.body : [req.body];
  // Вебхуки на 10 точках в час пик — через общую очередь фоновых запросов к iiko
  asBackground(async () => {
    const stopOrgs = new Set();
    for (const ev of events) {
      if (ev?.eventType === 'StopListUpdate' && ev.organizationId) stopOrgs.add(ev.organizationId);
      // ReserveUpdate / Reserve* (если их включили в iikoWeb): бронь изменилась — перечитываем брони точки вне очереди
      if (/^Reserve/i.test(String(ev?.eventType || '')) && ev.organizationId) scheduleReserveSync(ev.organizationId);
      // TableOrderError — ошибка создания заказа на стол: обновляем визит сразу, не дожидаясь фонового опроса
      if (['TableOrderUpdate', 'TableOrderError'].includes(ev?.eventType) && ev.eventInfo?.id) {
        // Заказ кухни или доп. источника (бар) — ищем по всем заказам визита
        // Формат ID проверяем: чужая строка в запросе по uuid-колонке дала бы ошибку БД
        const orderId = uuidOrNull(String(ev.eventInfo.id).toLowerCase());
        const { rows } = orderId
          ? await pool.query(`SELECT id FROM table_sessions WHERE ${sessionHasIikoOrderSql('$1')}`, [orderId])
          : { rows: [] };
        for (const r of rows) await refreshFromIiko(r.id);
        // Заказа у нас нет: открыли на кассе (или новый заказ на столе с нашим визитом) — подтягиваем открытые заказы точки
        if (!rows.length && ev.eventType === 'TableOrderUpdate') scheduleImport(ev.organizationId);
      }
    }
    if (stopOrgs.size) {
      await refreshStopLists([...stopOrgs]);
      invalidateCatalogCache();
      console.log(`iiko webhook: стоп-лист обновлён (${[...stopOrgs].join(', ')})`);
    }
  }).catch((e) => console.warn('iiko webhook:', e.message));
});


// ── Демо-касса (без ключей iiko): открыть/изменить/удалить блюдо в «заказе на кассе» и сразу получить результат ──
// Только в демо-режиме и только управляющему. Дальше всё как с настоящим iiko: импорт, сверка позиций, закрытие.
router.post('/api/v1/iiko/demo/table-orders', staffAuth('manager'), h(async (req) => {
  if (!isIikoDemo()) throw Object.assign(new Error('Только в демо-режиме'), { status: 404 });
  const result = demoApply(req.body || {});
  const imported = await importOpenOrders();
  const { rows } = await pool.query(
    `SELECT id FROM table_sessions WHERE status = 'open' AND (iiko_order_id IS NOT NULL OR iiko_orders <> '{}'::jsonb) AND sent_to_production_at IS NOT NULL`,
  );
  for (const r of rows) await refreshFromIiko(r.id);
  return { ...result, imported };
}));

// ── Демо-брони (без ключей iiko): завести, изменить, отменить бронь и сразу получить результат ──
// Только в демо-режиме и только управляющему. Дальше всё как с настоящим iiko: загрузка броней, стол ко времени брони, отмена, «не пришли».
router.post('/api/v1/iiko/demo/reserves', staffAuth('manager'), h(async (req) => {
  if (!isIikoDemo()) throw Object.assign(new Error('Только в демо-режиме'), { status: 404 });
  const result = demoReservesApply(req.body || {});
  const synced = await syncReserves();
  return { ...result, synced };
}));
