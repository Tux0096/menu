/** Вебхуки iiko: стоп-листы и статусы заказов на стол (токен — в заголовке Authorization). */
import express from 'express';
import { safeEqual } from '../lib/http.js';
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
  (async () => {
    const stopOrgs = new Set();
    for (const ev of events) {
      if (ev?.eventType === 'StopListUpdate' && ev.organizationId) stopOrgs.add(ev.organizationId);
      // TableOrderError — ошибка создания заказа на стол: обновляем визит сразу, не дожидаясь фонового опроса
      if (['TableOrderUpdate', 'TableOrderError'].includes(ev?.eventType) && ev.eventInfo?.id) {
        // Заказ кухни или доп. источника (бар) — ищем по всем заказам визита
        const { rows } = await pool.query(
          `SELECT id FROM table_sessions WHERE iiko_order_id::text = $1
              OR EXISTS (SELECT 1 FROM jsonb_each(iiko_orders) e WHERE e.value->>'orderId' = $1)`,
          [String(ev.eventInfo.id)],
        );
        for (const r of rows) await refreshFromIiko(r.id);
      }
    }
    if (stopOrgs.size) {
      await refreshStopLists([...stopOrgs]);
      invalidateCatalogCache();
      console.log(`iiko webhook: стоп-лист обновлён (${[...stopOrgs].join(', ')})`);
    }
  })().catch((e) => console.warn('iiko webhook:', e.message));
});

