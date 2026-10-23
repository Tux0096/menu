/**
 * Мок CloudPayments API для локальных e2e (к настоящему CloudPayments тесты не обращаются):
 *   node test/mock-cloudpayments.mjs            # слушает :3199
 *   CLOUDPAYMENTS_API_URL=http://127.0.0.1:3199 node app.js   # API ходит за payments/find сюда
 * POST /payments/find { InvoiceId } → Model из состояния (по умолчанию «не найден», Success:false).
 * POST /__set { InvoiceId, Status, Amount, TransactionId } — задать ответ для счёта (e2e: Declined → Completed).
 */
import http from 'node:http';

const PORT = Number(process.env.MOCK_CP_PORT || 3199);
const state = new Map();

http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    let body = {};
    try { body = JSON.parse(raw || '{}'); } catch { /* пустое тело */ }
    res.setHeader('Content-Type', 'application/json');
    if (req.url === '/__set') {
      state.set(String(body.InvoiceId), body);
      return res.end('{"ok":true}');
    }
    if (req.url === '/payments/find') {
      const m = state.get(String(body.InvoiceId));
      if (!m) return res.end(JSON.stringify({ Success: false, Message: 'Not found', Model: null }));
      return res.end(JSON.stringify({ Success: m.Status === 'Completed', Model: { Currency: 'RUB', ...m } }));
    }
    res.statusCode = 404;
    return res.end('{}');
  });
}).listen(PORT, () => console.log(`mock CloudPayments :${PORT}`));
