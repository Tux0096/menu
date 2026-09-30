/**
 * Разовая диагностика: какие поля заказа в зал iiko Cloud API связаны с официантом/сотрудником.
 * Качает спецификацию с api-ru.iiko.services (только чтение), печатает найденное.
 *   node db/iiko-spec-probe.js
 */
import axios from 'axios';

const BASE = process.env.IIKO_URL || 'https://api-ru.iiko.services';
const RE = /waiter|operator|employee|author|cashier/i;

async function get(url) {
  const r = await axios.get(url, { timeout: 20000, responseType: 'text', transformResponse: (x) => x });
  return String(r.data || '');
}

async function main() {
  const html = await get(`${BASE}/docs`);
  const urls = new Set([...html.matchAll(/(?:src|href|url|spec-url)\s*[=:]\s*["']([^"']+)["']/gi)].map((m) => m[1]));
  const candidates = [...urls].filter((u) => /json|yaml|swagger|openapi|api-docs|\.js$/i.test(u)).map((u) => new URL(u, `${BASE}/docs`).href);
  candidates.push(`${BASE}/api-docs/docs`, `${BASE}/swagger/v1/swagger.json`, `${BASE}/api-docs/v1/swagger.json`, `${BASE}/docs/swagger.json`);
  console.log(`iiko spec: ссылки на странице — ${candidates.slice(0, 12).join(' ')}`);
  for (const url of [...new Set(candidates)]) {
    let text;
    try { text = await get(url); } catch { continue; }
    if (!/order\/create|"paths"|operationId/i.test(text)) continue;
    console.log(`iiko spec: найдена спецификация ${url} (${Math.round(text.length / 1024)} КБ)`);
    let spec = null;
    try { spec = JSON.parse(text); } catch { /* не JSON */ }
    if (spec?.paths) {
      const op = spec.paths['/api/1/order/create']?.post;
      console.log(`iiko spec: /api/1/order/create — ${op ? 'есть' : 'нет'}`);
      const hits = new Set();
      const walk = (node, path, depth) => {
        if (!node || typeof node !== 'object' || depth > 12) return;
        if (node.$ref) {
          const name = node.$ref.split('/').pop();
          if (hits.has(`ref:${name}`)) return;
          hits.add(`ref:${name}`);
          walk(spec.components?.schemas?.[name] || spec.definitions?.[name], `${path}<${name}>`, depth + 1);
          return;
        }
        for (const [k, v] of Object.entries(node.properties || {})) {
          if (RE.test(k)) console.log(`  поле ${path}.${k}: ${String(v?.description || v?.$ref || v?.type || '').replace(/\s+/g, ' ').slice(0, 300)}`);
          walk(v, `${path}.${k}`, depth + 1);
        }
        for (const key of ['items', 'allOf', 'oneOf', 'anyOf', 'schema']) {
          const x = node[key];
          if (Array.isArray(x)) x.forEach((y) => walk(y, path, depth + 1)); else if (x) walk(x, path, depth + 1);
        }
        if (node.content) for (const c of Object.values(node.content)) walk(c.schema, path, depth + 1);
      };
      if (op) walk(op.requestBody || { schema: op.parameters?.find((p) => p.in === 'body')?.schema }, 'body', 0);
      const empPaths = Object.keys(spec.paths).filter((p) => /employee|waiter/i.test(p));
      console.log(`iiko spec: методы сотрудников — ${empPaths.join(', ') || 'нет'}`);
      return;
    }
    // Не JSON (например, собранный JS): печатаем фрагменты вокруг совпадений рядом с order/create
    const i = text.indexOf('order/create');
    const around = text.slice(Math.max(0, i - 200), i + 4000);
    const found = [...new Set([...around.matchAll(/"?(\w*(?:waiter|operator|employee)\w*)"?\s*:/gi)].map((m) => m[1]))];
    console.log(`iiko spec: поля рядом с order/create — ${found.join(', ') || 'не найдены'}`);
    return;
  }
  console.log('iiko spec: спецификацию найти не удалось');
}

main().catch((e) => console.log('iiko spec: ошибка —', e.response?.status || '', e.message));
