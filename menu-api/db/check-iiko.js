/**
 * Проверка ключа iiko: какие организации он видит и совпадают ли они с ресторанами в БД.
 *   node db/check-iiko.js
 */
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import pool from './pool.js';
import { requestIikoToken } from '../lib/iiko-token.js';

const IIKO_URL = 'https://api-ru.iiko.services';

async function main() {
  if (!process.env.IIKO_API_LOGIN || process.env.IIKO_DEMO === 'true') {
    console.log('iiko: ключ не задан — демо-режим, заказы в iiko не уходят');
    return;
  }
  const headers = { Authorization: `Bearer ${await requestIikoToken(process.env.IIKO_API_LOGIN)}` };
  const { data } = await axios.post(`${IIKO_URL}/api/1/organizations`, { returnAdditionalInfo: false, includeDisabled: false }, { headers, timeout: 15000 });
  const orgs = data.organizations || [];
  console.log(`iiko: ключу доступно организаций — ${orgs.length}`);
  for (const o of orgs) console.log(`  ${o.id}  ${o.name}`);

  const { rows } = await pool.query('SELECT slug, name, organization_id FROM restaurants WHERE is_disabled = FALSE ORDER BY sort_order');
  const visible = new Set(orgs.map((o) => o.id));
  console.log('Рестораны меню:');
  for (const r of rows) {
    console.log(`  ${visible.has(r.organization_id) ? '✓' : '✗'} ${r.slug.padEnd(20)} ${r.organization_id}  ${r.name}`);
  }
  if (!rows.some((r) => visible.has(r.organization_id))) {
    console.log('ВНИМАНИЕ: ни один ресторан меню не подключён к ключу — добавьте точки в iiko (Cloud API → интеграция → Подключенные точки)');
  }
}

main()
  .catch((e) => console.log('iiko: проверка не удалась —', e.response?.status || '', e.response?.data?.errorDescription || e.message))
  .finally(() => pool.end());
