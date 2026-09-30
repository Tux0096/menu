/**
 * Проверка ключа iiko: какие организации он видит и совпадают ли они с ресторанами в БД.
 *   node db/check-iiko.js
 */
import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import pool from './pool.js';
import {
  iikoApiLogin, iikoAppId, iikoClientSecret, iikoCredsList, maskIikoKey, requestIikoToken, requestIikoTokenFor,
} from '../lib/iiko-token.js';

const IIKO_URL = process.env.IIKO_URL || 'https://api-ru.iiko.services';

async function main() {
  if (!iikoApiLogin() || process.env.IIKO_DEMO === 'true') {
    console.log('iiko: ключ не задан — демо-режим, заказы в iiko не уходят');
    return;
  }
  console.log(`iiko: ключ ${maskIikoKey()}${iikoAppId() ? ', ID приложения задан' : ', ID приложения нет'}${iikoClientSecret() ? ', секрет клиента задан' : ', секрета клиента нет'}`);
  const headers = { Authorization: `Bearer ${await requestIikoToken()}` };
  const { data } = await axios.post(`${IIKO_URL}/api/1/organizations`, { returnAdditionalInfo: false, includeDisabled: false }, { headers, timeout: 15000 });
  const orgs = data.organizations || [];
  console.log(`iiko: ключу доступно организаций — ${orgs.length}`);
  for (const o of orgs) console.log(`  ${o.id}  ${o.name}`);

  const { rows } = await pool.query('SELECT id, slug, name, organization_id, terminal_group_id FROM restaurants WHERE is_disabled = FALSE ORDER BY sort_order');
  const visible = new Set(orgs.map((o) => o.id));
  console.log('Рестораны меню:');
  for (const r of rows) {
    console.log(`  ${visible.has(r.organization_id) ? '✓' : '✗'} ${r.slug.padEnd(20)} ${r.organization_id}  ${r.name}`);
  }
  try {
    if (process.env.IIKO_EXTERNAL_MENU_ID) console.log(`iiko: ID внешнего меню из настроек ${process.env.IIKO_EXTERNAL_MENU_ID}`);
    const { data: menus } = await axios.post(`${IIKO_URL}/api/2/menu`, {}, { headers, timeout: 15000 });
    const ext = menus.externalMenus || [];
    console.log(`Внешние меню iiko: ${ext.length ? ext.map((m) => `${m.name} [${m.id}]`).join('; ') : 'нет'}`);
    const cats = menus.priceCategories || [];
    if (cats.length) console.log(`Ценовые категории: ${cats.map((c) => `${c.name} [${c.id}]`).join('; ')}`);
  } catch (e) {
    console.log('Внешние меню iiko: не удалось получить —', e.response?.status || '', e.response?.data?.errorDescription || e.message);
  }
  await printPaymentTypes('iiko', headers, rows.filter((r) => visible.has(r.organization_id)).map((r) => r.organization_id));
  for (const r of rows.filter((x) => visible.has(x.organization_id))) await checkTerminalGroups(headers, r);
  await diagnoseOrders(headers, rows.filter((x) => visible.has(x.organization_id)));
  for (const r of rows.filter((x) => visible.has(x.organization_id))) await comparePrices(headers, r);
  if (!rows.some((r) => visible.has(r.organization_id))) {
    console.log('ВНИМАНИЕ: ни один ресторан меню не подключён к ключу — добавьте точки в iiko (Cloud API → интеграция → Подключенные точки)');
  }
  for (const creds of iikoCredsList().filter(Boolean)) await checkExtraKey(creds);
  await pool.query('UPDATE restaurant_sources SET order_creds = NULL, order_organization_id = NULL, order_terminal_group_id = NULL WHERE order_organization_id IS NOT NULL');
  await menuSplit();
}

/** Что приходит из какой iiko: разделы меню по источникам (кухня — iiko Фуджи, бар — iiko с ЕГАИС). */
async function menuSplit() {
  const { rows } = await pool.query(
    `SELECT r.name AS rest, COALESCE(p.source, 'main') AS source, COALESCE(c.name, '—') AS cat, COUNT(*)::int AS n
       FROM products p JOIN restaurants r ON r.id = p.restaurant_id LEFT JOIN categories c ON c.id = p.category_id
      WHERE p.is_published GROUP BY 1, 2, 3 ORDER BY 1, 2, 4 DESC`,
  );
  const by = new Map();
  for (const x of rows) {
    const k = `${x.rest} · ${x.source === 'main' ? 'iiko Фуджи' : `iiko ${x.source}`}`;
    by.set(k, [...(by.get(k) || []), `${x.cat} (${x.n})`]);
  }
  for (const [k, cats] of by) console.log(`разделы меню ${k}: ${cats.join(', ')}`);
}


/**
 * Цены: меню гостя (из внешнего меню iiko) против прайса номенклатуры iiko, по которому касса считает заказ.
 * Только чтение.
 */
async function comparePrices(headers, r) {
  try {
    const { data } = await axios.post(`${IIKO_URL}/api/1/nomenclature`, { organizationId: r.organization_id }, { headers, timeout: 60000 });
    const nom = new Map((data.products || []).map((p) => [String(p.id), p]));
    const { rows } = await pool.query(
      "SELECT iiko_id::text AS id, name, price::float AS price FROM products WHERE restaurant_id = $1 AND COALESCE(source, 'main') = 'main' AND is_published",
      [r.id],
    );
    let same = 0; let missing = 0; const diff = [];
    for (const p of rows) {
      const n = nom.get(p.id);
      const cur = n?.sizePrices?.[0]?.price?.currentPrice;
      if (cur == null) { missing += 1; continue; }
      if (Math.abs(cur - p.price) < 0.01) same += 1; else diff.push({ name: p.name, menu: p.price, iiko: cur });
    }
    const ratios = diff.map((d) => d.iiko / d.menu);
    const avg = ratios.length ? ratios.reduce((a, b) => a + b, 0) / ratios.length : 0;
    console.log(`${r.name}: цены меню vs номенклатура iiko — совпадают ${same}, отличаются ${diff.length}, нет в номенклатуре ${missing}`
      + `${diff.length ? `, в среднем iiko ×${avg.toFixed(3)}` : ''}`);
    for (const d of diff.slice(0, 8)) console.log(`  «${d.name}»: меню ${d.menu} ₽, iiko ${d.iiko} ₽`);
    const all = data.products || [];
    console.log(`  номенклатура: продуктов ${all.length}, групп ${(data.groups || []).length}, категорий ${(data.productCategories || []).length}, размеров ${(data.sizes || []).length}`);
    const probe = /сливочн\S* лосос/i;
    for (const n of all.filter((x) => probe.test(x.name || '')).slice(0, 4)) {
      console.log(`  номенклатура «${n.name}» [${n.id}] код ${n.code || '—'} артикул ${n.num || '—'} тип ${n.type} цены ${JSON.stringify(n.sizePrices || null).slice(0, 300)}`);
    }
    const { rows: mine } = await pool.query(
      "SELECT iiko_id::text AS id, name, sku, price::float AS price FROM products WHERE restaurant_id = $1 AND name ~* 'сливочн\\S* лосос' LIMIT 3", [r.id],
    );
    for (const m of mine) console.log(`  меню «${m.name}» [${m.id}] артикул ${m.sku || '—'} цена ${m.price}`);
    const bySku = new Map(all.filter((x) => x.code).map((x) => [String(x.code), x]));
    const { rows: skus } = await pool.query("SELECT sku, price::float AS price FROM products WHERE restaurant_id = $1 AND sku IS NOT NULL AND COALESCE(source, 'main') = 'main'", [r.id]);
    let skuHit = 0; let skuDiff = 0;
    for (const x of skus) {
      const n = bySku.get(String(x.sku));
      if (!n) continue;
      skuHit += 1;
      const cur = n.sizePrices?.[0]?.price?.currentPrice;
      if (cur != null && Math.abs(cur - x.price) >= 0.01) skuDiff += 1;
    }
    console.log(`  по артикулу: найдено ${skuHit} из ${skus.length}, цена отличается у ${skuDiff}`);
  } catch (e) {
    console.log(`${r.name}: сравнение цен не удалось —`, e.response?.status || '', e.response?.data?.errorDescription || e.message);
  }
}

/**
 * Диагностика заказов на стол (только чтение, заказы не создаются): какую версию сервера iiko знает облако
 * и проходит ли запрос заказов стола (он проверяет ту же версию, что и создание заказа).
 */
async function diagnoseOrders(headers, rests) {
  const post = (path, body) => axios.post(`${IIKO_URL}${path}`, body, { headers, timeout: 15000 }).then((x) => x.data);
  try {
    const { organizations = [] } = await post('/api/1/organizations', { returnAdditionalInfo: true, includeDisabled: true });
    for (const o of organizations) {
      const extra = Object.entries(o).filter(([k, v]) => !['id', 'name'].includes(k) && v != null && typeof v !== 'object')
        .map(([k, v]) => `${k}=${v}`).join(', ');
      console.log(`iiko организация ${o.name} [${o.id}]: ${extra}`);
    }
  } catch (e) { console.log('iiko: сведения об организации не получены —', e.response?.data?.errorDescription || e.message); }
  for (const r of rests) {
    try {
      const { rows } = await pool.query(
        "SELECT iiko_table_id FROM restaurant_table_cache WHERE restaurant_id = $1 AND table_number NOT LIKE '%:%' AND iiko_table_id IS NOT NULL LIMIT 3",
        [r.id],
      );
      if (!rows.length) { console.log(`${r.name}: проверка заказов стола — нет известных столов`); continue; }
      const data = await post('/api/1/order/by_table', {
        organizationIds: [r.organization_id], tableIds: rows.map((x) => x.iiko_table_id), statuses: ['New', 'Bill'],
      });
      console.log(`${r.name}: запрос заказов стола в iiko проходит (заказов: ${(data.orders || []).length})`);
    } catch (e) {
      console.log(`${r.name}: запрос заказов стола — ОШИБКА iiko ${e.response?.status || ''}: ${e.response?.data?.errorDescription || e.message}`);
    }
  }
}

/**
 * Кассы (терминальные группы) ресторана: заказ на стол принимает только живая группа (iikoFront на связи, ≥ 7.1.5).
 * Если выбранная группа не на связи, а другая — да, переключаем ресторан на живую.
 */
async function checkTerminalGroups(headers, r) {
  try {
    const post = (path, body) => axios.post(`${IIKO_URL}${path}`, body, { headers, timeout: 15000 }).then((x) => x.data);
    const tg = await post('/api/1/terminal_groups', { organizationIds: [r.organization_id], includeDisabled: true });
    const list = (tg.terminalGroups || []).flatMap((g) => g.items || []);
    let alive = new Map();
    if (list.length) {
      try {
        const st = await post('/api/1/terminal_groups/is_alive', { organizationIds: [r.organization_id], terminalGroupIds: list.map((t) => t.id) });
        alive = new Map((st.isAliveStatus || []).map((x) => [x.terminalGroupId, Boolean(x.isAlive)]));
      } catch (e) { console.log(`  ${r.slug}: статус касс не получен —`, e.response?.data?.errorDescription || e.message); }
    }
    const mark = (id) => (alive.get(id) === true ? 'на связи' : alive.get(id) === false ? 'НЕ на связи' : 'статус неизвестен');
    console.log(`${r.name}: кассы iiko — ${list.map((t) => `${t.name} [${t.id}] ${mark(t.id)}${t.id === r.terminal_group_id ? ' ← выбрана' : ''}`).join('; ') || 'нет'}`);
    if (!list.some((t) => t.id === r.terminal_group_id) || alive.get(r.terminal_group_id) === false) {
      const live = list.find((t) => alive.get(t.id) === true);
      if (live) {
        await pool.query('UPDATE restaurants SET terminal_group_id = $2 WHERE id = $1', [r.id, live.id]);
        await pool.query("DELETE FROM restaurant_table_cache WHERE restaurant_id = $1 AND table_number NOT LIKE '%:%'", [r.id]);
        console.log(`${r.name}: касса переключена на «${live.name}» [${live.id}]`);
      } else {
        console.log(`${r.name}: ВНИМАНИЕ — ни одна касса не на связи с iiko Cloud: заказы на стол не пройдут. Включите главную кассу iikoFront (≥ 7.1.5)`);
      }
    }
  } catch (e) {
    console.log(`${r.name}: кассы iiko не получены —`, e.response?.status || '', e.response?.data?.errorDescription || e.message);
  }
}

/** Типы оплат организаций — какой взять для онлайн-оплаты (IIKO_PAYMENT_TYPE_ID или название «Онлайн»). */
async function printPaymentTypes(label, headers, orgIds) {
  if (!orgIds.length) return;
  try {
    const { data } = await axios.post(`${IIKO_URL}/api/1/payment_types`, { organizationIds: orgIds }, { headers, timeout: 15000 });
    const list = (data.paymentTypes || []).filter((t) => !t.isDeleted);
    const online = list.find((t) => /онлайн|online|qr|cloud|интернет/i.test(t.name));
    console.log(`${label}: типы оплат — ${list.map((t) => `${t.name} (${t.paymentTypeKind}) [${t.id}]`).join('; ') || 'нет'}`);
    console.log(`${label}: для онлайн-оплаты ${online ? `возьмётся «${online.name}»` : 'нет типа «Онлайн» — создайте его в iiko или задайте секрет с ID'}`);
  } catch (e) {
    console.log(`${label}: типы оплат не получены —`, e.response?.status || '', e.response?.data?.errorDescription || e.message);
  }
}

/**
 * Второй ключ iiko (например, IIKO_BAR_API_LOGIN — бар с алкоголем): что он видит, и — если источник ещё
 * не настроен и организация одна — подключаем его к ресторану QR-меню автоматически (дальше правится в админке).
 */
async function checkExtraKey(creds) {
  const code = creds.toLowerCase();
  const label = code === 'bar' ? 'Бар' : `iiko ${creds}`;
  try {
    console.log(`iiko ${creds}: ключ ${maskIikoKey(iikoApiLogin(creds))}`);
    const headers = { Authorization: `Bearer ${await requestIikoTokenFor(creds)}` };
    const { data } = await axios.post(`${IIKO_URL}/api/1/organizations`, { returnAdditionalInfo: true, includeDisabled: false }, { headers, timeout: 15000 });
    const orgs = data.organizations || [];
    console.log(`iiko ${creds}: доступно организаций — ${orgs.length}`);
    for (const o of orgs) console.log(`  ${o.id}  ${o.name}${o.version ? ` · версия сервера iiko ${o.version}` : ''}`);
    let menus = [];
    try {
      menus = (await axios.post(`${IIKO_URL}/api/2/menu`, {}, { headers, timeout: 15000 })).data.externalMenus || [];
    } catch { /* нет внешних меню */ }
    console.log(`iiko ${creds}: внешние меню — ${menus.length ? menus.map((m) => `${m.name} [${m.id}]`).join('; ') : 'нет'}`);
    await printPaymentTypes(`iiko ${creds}`, headers, orgs.map((o) => o.id));

    const slug = process.env.QR_RESTAURANT_SLUG || 'novo-sadovaya';
    const { rows: rest } = await pool.query('SELECT id, name FROM restaurants WHERE slug = $1', [slug]);
    if (!rest[0]) return;
    // Организация бара: явно (IIKO_BAR_ORGANIZATION_ID), по названию («Сакура», «бар») или единственная
    const wantOrg = process.env[`IIKO_${creds}_ORGANIZATION_ID`];
    const org = orgs.find((o) => o.id === wantOrg) || orgs.find((o) => /сакур|бар|bar/i.test(o.name))
      || (orgs.length === 1 ? orgs[0] : null);
    const { rows: existing } = await pool.query(
      'SELECT code, organization_id FROM restaurant_sources WHERE restaurant_id = $1 AND creds = $2', [rest[0].id, creds],
    );
    // Диагностика бара: кассы организации, выбранная касса источника, заказы на известных столах (только чтение)
    try {
      const { rows: srcRows } = await pool.query(
        'SELECT organization_id, terminal_group_id FROM restaurant_sources WHERE restaurant_id = $1 AND creds = $2', [rest[0].id, creds],
      );
      const srcOrg = srcRows[0]?.organization_id || orgs[0]?.id;
      const tg = (await axios.post(`${IIKO_URL}/api/1/terminal_groups`, { organizationIds: [srcOrg], includeDisabled: true }, { headers, timeout: 15000 })).data;
      const groups = (tg.terminalGroups || []).flatMap((g) => (g.items || []).map((t) => ({ ...t, org: g.organizationId })));
      let alive = new Map();
      try {
        const st = (await axios.post(`${IIKO_URL}/api/1/terminal_groups/is_alive`, { organizationIds: [srcOrg], terminalGroupIds: groups.map((t) => t.id) }, { headers, timeout: 15000 })).data;
        alive = new Map((st.isAliveStatus || []).map((x) => [x.terminalGroupId, Boolean(x.isAlive)]));
      } catch (e) { console.log(`iiko ${creds}: статус касс не получен —`, e.response?.data?.errorDescription || e.message); }
      console.log(`iiko ${creds}: кассы — ${groups.map((t) => `${t.name} [${t.id}] ${alive.get(t.id) === true ? 'на связи' : alive.get(t.id) === false ? 'НЕ на связи' : 'статус неизвестен'}${t.id === srcRows[0]?.terminal_group_id ? ' ← выбрана' : ''}`).join('; ') || 'нет'}`);
      const { rows: tables } = await pool.query(
        'SELECT table_number, iiko_table_id FROM restaurant_table_cache WHERE restaurant_id = $1 AND table_number LIKE $2 AND iiko_table_id IS NOT NULL LIMIT 5',
        [rest[0].id, `${code}:%`],
      );
      console.log(`iiko ${creds}: известные столы — ${tables.map((t) => t.table_number).join(', ') || 'нет'}`);
      if (tables.length) {
        const ord = (await axios.post(`${IIKO_URL}/api/1/order/by_table`, { organizationIds: [srcOrg], tableIds: tables.map((t) => t.iiko_table_id), statuses: ['New', 'Bill'] }, { headers, timeout: 15000 })).data;
        console.log(`iiko ${creds}: открытых заказов на этих столах — ${(ord.orders || []).length}`);
      }
      const { rows: sess } = await pool.query(
        `SELECT table_number, iiko_orders, iiko_last_error FROM table_sessions
         WHERE restaurant_id = $1 AND status = 'open' AND (iiko_orders ? $2 OR iiko_last_error IS NOT NULL) ORDER BY updated_at DESC LIMIT 5`,
        [rest[0].id, code],
      );
      for (const x of sess) {
        console.log(`iiko ${creds}: стол №${x.table_number} — заказ бара ${x.iiko_orders?.[code]?.orderId || 'нет'}${x.iiko_last_error ? `; ошибка: ${x.iiko_last_error}` : ''}`);
        const oid = x.iiko_orders?.[code]?.orderId;
        if (oid) {
          const o = (await axios.post(`${IIKO_URL}/api/1/order/by_id`, { organizationIds: [srcOrg], orderIds: [oid] }, { headers, timeout: 15000 })).data;
          const info = (o.orders || [])[0];
          console.log(`  заказ бара в iiko: статус ${info?.creationStatus || '—'} / ${info?.order?.status || '—'}${info?.errorInfo ? `, ошибка ${JSON.stringify(info.errorInfo).slice(0, 300)}` : ''}, касса ${info?.terminalGroupId || '—'}`);
        }
      }
    } catch (e) {
      console.log(`iiko ${creds}: диагностика бара не удалась —`, e.response?.status || '', e.response?.data?.errorDescription || e.message);
    }
    if (existing.length && (!org || existing[0].organization_id === org.id || orgs.length === 1)) {
      console.log(`iiko ${creds}: источник уже подключён к «${rest[0].name}» (организация ${orgs.find((o) => o.id === existing[0].organization_id)?.name || existing[0].organization_id})`);
      return;
    }
    if (!org) {
      console.log(`iiko ${creds}: организаций ${orgs.length} — выберите нужную в админке: Меню → Источники iiko → «Добавить бар / другой iiko»`
        + ` или задайте секрет IIKO_${creds}_ORGANIZATION_ID`);
      return;
    }
    orgs.splice(0, orgs.length, org);
    const wantMenu = process.env[`IIKO_${creds}_EXTERNAL_MENU_ID`];
    const menu = menus.find((m) => String(m.id) === String(wantMenu))
      || menus.find((m) => /бар|напит|алко|вин/i.test(m.name)) || (menus.length === 1 ? menus[0] : null);
    let terminalGroupId = null;
    try {
      const tg = (await axios.post(`${IIKO_URL}/api/1/terminal_groups`, { organizationIds: [orgs[0].id], includeDisabled: false }, { headers, timeout: 15000 })).data;
      terminalGroupId = tg?.terminalGroups?.[0]?.items?.[0]?.id || null;
    } catch { /* группу выберет выгрузка стола */ }
    await pool.query(
      `INSERT INTO restaurant_sources (restaurant_id, code, name, organization_id, terminal_group_id, creds, external_menu_id, is_enabled, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,TRUE,10)
       ON CONFLICT (restaurant_id, code) DO UPDATE SET organization_id = EXCLUDED.organization_id,
         terminal_group_id = EXCLUDED.terminal_group_id, external_menu_id = EXCLUDED.external_menu_id`,
      [rest[0].id, code, label, orgs[0].id, terminalGroupId, creds, menu ? String(menu.id) : null],
    );
    console.log(`iiko ${creds}: подключён источник «${label}» к «${rest[0].name}» — организация ${orgs[0].name}`
      + `${menu ? `, меню «${menu.name}»` : ', внешнего меню нет — выберите его в админке'}`);
  } catch (e) {
    console.log(`iiko ${creds}: проверка не удалась —`, e.response?.status || '', e.response?.data?.errorDescription || e.message);
  }
}

main()
  .catch((e) => console.log('iiko: проверка не удалась —', e.response?.status || '', e.response?.data?.errorDescription || e.message))
  .finally(() => pool.end());
