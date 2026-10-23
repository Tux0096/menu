/**
 * Вебхуки CloudPayments: Check / Pay / Fail / Refund.
 * Подпись — заголовок Content-HMAC (или X-Content-HMAC): base64(HMAC-SHA256(сырое тело, API-секрет сайта)).
 * Поэтому маршрут подключается в app.js ДО express.json() и читает тело как Buffer (express.raw).
 * Ответ на проверенное событие — {"code":0}; неверная подпись — 401.
 */
import express from 'express';
import { findPaymentForWebhook, handleCloudPaymentsEvent, verifyCpSignature, webhookSecrets } from '../services/payments.js';

const router = express.Router();
export default router;

const KINDS = new Set(['check', 'pay', 'fail', 'refund']);

/** Тело события: JSON или application/x-www-form-urlencoded (так CloudPayments шлёт по умолчанию) */
function parseBody(raw, contentType = '') {
  const text = raw.toString('utf8');
  if (/json/i.test(contentType) || /^\s*[{[]/.test(text)) {
    try { return JSON.parse(text); } catch { return null; }
  }
  return Object.fromEntries(new URLSearchParams(text));
}

router.post('/api/v1/payments/cloudpayments/:kind', express.raw({ type: () => true, limit: '256kb' }), async (req, res) => {
  const kind = String(req.params.kind || '').toLowerCase();
  const raw = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  try {
    if (!KINDS.has(kind)) return res.status(404).json({ code: 13 });
    const body = parseBody(raw, req.headers['content-type']);
    if (!body || typeof body !== 'object') return res.status(400).json({ code: 13 });
    const pay = await findPaymentForWebhook(body);
    const signature = req.headers['content-hmac'] || req.headers['x-content-hmac'];
    if (!verifyCpSignature(raw, signature, await webhookSecrets(pay))) return res.status(401).json({ code: 13 });
    await handleCloudPaymentsEvent(kind, body, pay);
    return res.json({ code: 0 });
  } catch (e) {
    // 5xx — CloudPayments повторит событие позже (обработка идемпотентна)
    console.error('CloudPayments webhook', kind, e.stack || e.message);
    return res.status(500).json({ code: 13 });
  }
});
