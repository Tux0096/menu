/**
 * Sync menu from iiko → PostgreSQL.
 * For every restaurant in the DB we fetch nomenclature using its own organization_id
 * and store products tagged to that restaurant.
 *
 * Usage:
 *   node db/sync-iiko.js                       # sync all restaurants
 *   node db/sync-iiko.js leningradskaya        # sync one restaurant by slug
 *
 * Requires in .env:
 *   IIKO_API_LOGIN=<your-api-login>
 */

import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { default as pool } from './pool.js';
import { iikoApiLogin, maskIikoKey, requestIikoToken, requestIikoTokenFor } from '../lib/iiko-token.js';

const IIKO_URL = process.env.IIKO_URL || 'https://api-ru.iiko.services';

// Категории, которые показываем в меню. Эти UUID одинаковые для всех ресторанов
// (брались из общей номенклатуры fuji-api/setting/config/catalogMenu.js).
const CATALOG_MENU = [
  { id: '8d2d0a59-1518-465e-b241-10c425f57a99', name: 'Комбо', slug: 'kombo', order: 1 },
  { id: '7d003f20-bacd-4aee-8c61-c395f3811bb2', name: 'Роллы', slug: 'rolly', order: 2 },
  { id: '7d2df019-f771-47d7-bfbb-9131d4f6322f', name: 'На каждый день', slug: 'na-kazhdyj-den', order: 3, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '0cfa6ce0-72c8-4194-9a46-dd441dc09d3d', name: 'Коллекция бренд-шефа', slug: 'kollekciya-brend-shefa', order: 4, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'da837308-7d79-4d50-8bc1-d2db23d8820a', name: 'Тартар', slug: 'tartar-rolly', order: 5, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'eafbcc67-fa8e-4ea1-9ac4-bc7b92a3814c', name: 'Большие', slug: 'bolshie-rolly', order: 6, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'a304c8ee-fe56-4ace-a07a-e8619792d696', name: 'Размер MAX', slug: 'rolly-razmer-max', order: 7, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '2ee52996-7dc5-4ccf-b072-5e365b904b4e', name: 'Огонь & Гриль', slug: 'rolly-ogon-and-gril', order: 8, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'f4eefc21-f175-4cd0-a2e7-32a1948668b7', name: 'Запеченные', slug: 'zapechennye-rolly', order: 9, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '4a72b94b-c664-4664-babf-5fc073f00b77', name: 'Теплые', slug: 'teplye-rolly', order: 10, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '7f3040b6-7b68-46d9-82f0-a890160ec53c', name: 'Классические', slug: 'klassicheskie-rolly', order: 11, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '3510aae9-ca26-4d02-95ed-90ffde6b5456', name: 'Сладкие', slug: 'sladkie-rolly', order: 12, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'e658fd39-577d-46ec-a2d3-5df8995184b2', name: 'Суши', slug: 'sushi', order: 13, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'f536371d-2801-4c3b-809a-d5c6fb3d1307', name: 'Гунканы', slug: 'gunkany', order: 14, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '42c534bf-6aa3-4128-85e4-3a15195527c9', name: 'Пицца', slug: 'picca', order: 15 },
  { id: '1fb068d0-5a7d-408f-99d5-3a3d63ccb552', name: 'Пицца 2 вкуса', slug: 'picca-dva-vkusa', order: 16, parent: '42c534bf-6aa3-4128-85e4-3a15195527c9' },
  { id: '62fe6060-264a-4bef-9940-0fff074136a0', name: 'Бао', slug: 'bao', order: 17 },
  { id: '34a918c1-489d-421e-aa6d-2e36420e1365', name: 'Бургеры', slug: 'burgery', order: 18 },
  { id: 'b13590f7-9846-40f1-aeb1-f0cb14db4995', name: 'Паста', slug: 'pasta', order: 19 },
  { id: '1c4a35c1-1689-4ed2-8d0a-a96e072b80d9', name: 'Лепешки роти', slug: 'lepeshki-roti', order: 20 },
  { id: 'fcfad280-8795-4940-8fd9-9654c55934fd', name: 'Wok лапша', slug: 'wok-lapsha', order: 21 },
  { id: '284d37ed-bc12-475c-ab48-e1fc2c872cef', name: 'Wok рис', slug: 'wok-ris', order: 22, parent: 'fcfad280-8795-4940-8fd9-9654c55934fd' },
  { id: 'd570a52f-6156-4af2-97fb-48aada4637cd', name: 'Поке', slug: 'poke', order: 23 },
  { id: 'f42ab48f-30e0-43bd-9b2b-c6e35c5624b0', name: 'Закуски', slug: 'zakuski', order: 24 },
  { id: '23cd9f08-6a8c-4041-a7f1-3f362c879e54', name: 'Фудстер', slug: 'fudster', order: 25 },
  { id: 'baf5a5d6-16a6-45f4-af1e-5e80fae833f2', name: 'Супы', slug: 'supy', order: 26 },
  { id: '77b5b79d-6beb-4507-b7ce-d603010d796d', name: 'Салаты', slug: 'salaty', order: 27 },
  { id: '85eabe9a-40d9-4a26-babc-1634a768fd85', name: 'Мидии', slug: 'midii', order: 28 },
  { id: '3ccd102f-7af9-4b12-b0a3-e26f1131e6f3', name: 'Десерты', slug: 'deserty', order: 29 },
  { id: 'dc8d3d03-d59c-4958-ad99-c8d6ca3c319d', name: 'Соусы', slug: 'sousy', order: 30 },
  { id: '67ed0d32-e712-45c8-902e-87e8c84c9a57', name: 'Напитки', slug: 'napitki', order: 31 },
  { id: 'b1016517-1875-457a-b824-c36d85fdb615', name: 'Приборы', slug: 'pribory', order: 32 },
];

const CATALOG_IDS = new Set(CATALOG_MENU.map(c => c.id));

async function getToken() {
  const apiLogin = iikoApiLogin();
  if (!apiLogin) {
    throw new Error(
      'IIKO_API_LOGIN не задан в .env\n' +
      'Добавь в menu-api/.env: IIKO_API_LOGIN=<твой-ключ>'
    );
  }
  console.log(`Получаем токен iiko (ключ ${maskIikoKey(apiLogin)})...`);
  return requestIikoToken(apiLogin);
}

async function iikoPostRaw(token, path, body) {
  const res = await axios.post(`${IIKO_URL}${path}`, body, { headers: { Authorization: `Bearer ${token}` }, timeout: 60000 });
  return res.data;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const normOrg = (s) => String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]/g, '');
/** Ключ поиска организации по адресу ресторана: «Ново-Садовая, 24» → «новосад» */
const addressKey = (address) => normOrg(String(address || '').split(/[,\d]/)[0]).slice(0, 7);

/**
 * У ресторана пустая номенклатура в его организации iiko — ищем среди доступных ключу организацию
 * с похожим названием, где меню заведено, и переключаем ресторан на неё (вместе с терминальной группой).
 */
async function findMenuOrganization(token, restaurant, orgs) {
  const key = addressKey(restaurant.address);
  if (key.length < 4) return null;
  const candidates = orgs.filter((o) => o.id !== restaurant.organization_id && normOrg(o.name).includes(key)).slice(0, 3);
  for (const org of candidates) {
    await sleep(Number(process.env.IIKO_PAUSE_MS || 6000));
    try {
      const nom = await getNomenclature(token, org.id);
      const count = (nom.products || []).filter((p) => !p.isDeleted).length;
      console.log(`  кандидат «${org.name}» [${org.id}]: ${count} продуктов`);
      if (!count) continue;
      const tg = await iikoPostRaw(token, '/api/1/terminal_groups', { organizationIds: [org.id], includeDisabled: false });
      const terminalGroupId = tg.terminalGroups?.[0]?.items?.[0]?.id || null;
      await pool.query(
        'UPDATE restaurants SET organization_id = $2, terminal_group_id = COALESCE($3, terminal_group_id) WHERE id = $1',
        [restaurant.id, org.id, terminalGroupId],
      );
      console.log(`  → ресторан переключён на организацию «${org.name}» (терминальная группа ${terminalGroupId || 'не найдена'})`);
      return { org, nomenclature: nom };
    } catch (e) {
      console.log(`  кандидат «${org.name}»: ошибка ${e.response?.status || ''} ${e.response?.data?.errorDescription || e.message}`);
    }
  }
  return null;
}

async function getNomenclature(token, organizationId) {
  const res = await axios.post(
    `${IIKO_URL}/api/1/nomenclature`,
    { organizationId },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

async function ensureCategoriesMerged(client, iikoGroupMap) {
  const categoriesToInsert = CATALOG_MENU.map((cat) => {
    const iikoGroup = iikoGroupMap.get(cat.id);
    const imageUrl = iikoGroup?.imageLinks?.[0] ?? null;
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent || null,
      sort_order: cat.order,
      image_url: imageUrl,
    };
  });

  const parents = categoriesToInsert.filter((c) => !c.parent_id);
  const children = categoriesToInsert.filter((c) => c.parent_id);

  for (const cat of [...parents, ...children]) {
    await client.query(
      `INSERT INTO categories (id, name, slug, parent_id, sort_order, image_url, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         slug = EXCLUDED.slug,
         parent_id = EXCLUDED.parent_id,
         sort_order = EXCLUDED.sort_order,
         image_url = COALESCE(EXCLUDED.image_url, categories.image_url)`,
      [cat.id, cat.name, cat.slug, cat.parent_id, cat.sort_order, cat.image_url]
    );
  }
}

/** Категории из групп iiko (только те, где есть блюда, + их родители). */
async function upsertIikoGroups(client, groups, products) {
  const byId = new Map(groups.map((g) => [g.id, g]));
  const needed = new Set();
  for (const p of products) {
    let g = byId.get(p.parentGroup);
    while (g && !needed.has(g.id)) {
      needed.add(g.id);
      g = g.parentGroup ? byId.get(g.parentGroup) : null;
    }
  }
  const ordered = [...needed].map((id) => byId.get(id))
    .sort((a, b) => (a.parentGroup ? 1 : 0) - (b.parentGroup ? 1 : 0));
  for (const g of ordered) {
    const parent = g.parentGroup && needed.has(g.parentGroup) ? g.parentGroup : null;
    await client.query(
      `INSERT INTO categories (id, name, slug, parent_id, sort_order, image_url, is_visible)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order,
         image_url = COALESCE(EXCLUDED.image_url, categories.image_url)`,
      [g.id, g.name, g.seoText || g.id, null, g.order ?? 0, g.imageLinks?.[0] ?? null],
    );
    if (parent) await client.query('UPDATE categories SET parent_id = $2 WHERE id = $1', [g.id, parent]);
  }
}

/**
 * Внешнее меню iiko. IIKO_EXTERNAL_MENU_ID — брать меню по ID напрямую;
 * иначе из списка меню ключа: IIKO_EXTERNAL_MENU (id/часть названия), «ресторан/зал/qr» или единственное.
 */
async function pickExternalMenu(token, { directId: forcedId = null, prefer = /ресторан|зал|qr/i, fromEnv = true } = {}) {
  const directId = String(forcedId || (fromEnv ? process.env.IIKO_EXTERNAL_MENU_ID : '') || '').trim();
  let menus = [];
  try {
    const data = await iikoPostRaw(token, '/api/2/menu', {});
    menus = data.externalMenus || [];
    console.log(`Внешние меню iiko: ${menus.length ? menus.map((m) => `${m.name} [${m.id}]`).join('; ') : 'нет'}`
      + ` · ценовых категорий: ${(data.priceCategories || []).length} · поля ответа: ${Object.keys(data || {}).join(', ')}`);
  } catch (e) {
    console.log('Внешние меню iiko: не удалось получить —', e.response?.status || '', JSON.stringify(e.response?.data || e.message).slice(0, 300));
  }
  if (directId) {
    const m = menus.find((x) => String(x.id) === directId) || { id: directId, name: `#${directId}` };
    console.log(`Используем внешнее меню по ID из настроек: «${m.name}» [${m.id}]`);
    return m;
  }
  const want = String((fromEnv && process.env.IIKO_EXTERNAL_MENU) || '').toLowerCase();
  const menu = want
    ? menus.find((m) => String(m.id) === want || String(m.name).toLowerCase().includes(want))
    : menus.find((m) => prefer.test(m.name)) || (menus.length === 1 ? menus[0] : null);
  if (menu) console.log(`Используем внешнее меню «${menu.name}» [${menu.id}]`);
  else {
    console.log('ВНИМАНИЕ: внешнее меню не найдено. Проверьте, что меню подключено к этому API-логину'
      + ' в iikoWeb (Настройки Cloud API → API-логин → внешние меню) или задайте IIKO_EXTERNAL_MENU_ID');
  }
  return menu || null;
}

async function requestExternalMenu(token, menu, organizationIds) {
  return iikoPostRaw(token, '/api/2/menu/by_id', {
    externalMenuId: String(menu.id),
    organizationIds,
    version: 2,
    language: 'ru',
  });
}

/** Цена позиции для организации: prices[] бывает с organizationId или со списком organizations. */
function priceForOrg(prices, organizationId) {
  const list = prices || [];
  for (const p of list) {
    // Пустой список организаций — цена для всех (так бывает в меню агрегаторов, например OrderMaster)
    const orgsOf = p.organizations?.length ? p.organizations : (p.organizationId ? [p.organizationId] : null);
    if (orgsOf && !orgsOf.includes(organizationId)) continue;
    if (!orgsOf && list.length > 1) continue;
    const v = Number(p.price ?? p.currentPrice ?? 0);
    if (v > 0) return v;
  }
  return 0;
}

/** Меню ресторана из внешнего меню iiko: цены и доступность — для организации ресторана. */
async function syncFromExternalMenu(restaurant, token, menu, organizationId, preloaded = null, source = 'main') {
  const data = preloaded || await requestExternalMenu(token, menu, [organizationId]);
  const categories = data.itemCategories || data.categories || [];
  const rows = [];
  // Во внешних меню агрегаторов (OrderMaster) все разделы бывают помечены скрытыми — тогда пометка ничего не значит
  const allHidden = categories.length > 0 && categories.every((c) => c.isHidden);
  for (const [ci, cat] of categories.entries()) {
    if (cat.isHidden && !allHidden) continue;
    for (const [ii, item] of (cat.items || []).entries()) {
      if (item.isHidden) continue;
      const size = (item.itemSizes || []).find((z) => z.isDefault) || (item.itemSizes || [])[0];
      if (!size) continue;
      const price = priceForOrg(size.prices, organizationId);
      if (!(price > 0)) continue; // блюдо не продаётся в этом ресторане
      // КБЖУ на 100 г — массив по организациям (NutritionInfoDto.organizations); берём запись этого ресторана
      const nutr = [].concat(size.nutritionPerHundredGrams || [], size.nutritions || []).filter((x) => x && typeof x === 'object');
      const n = nutr.find((x) => (x.organizations || []).includes(organizationId))
        || nutr.find((x) => !(x.organizations || []).length) || nutr[0] || {};
      rows.push({
        category: { id: cat.id, name: cat.name, order: ci },
        id: item.itemId || item.id,
        name: item.name,
        sku: item.sku || null,
        description: item.description || null,
        price,
        weight: size.portionWeightGrams ? `${Math.round(size.portionWeightGrams)} г` : null,
        image: size.buttonImageUrl || item.imageUrl || (item.imageUrls || [])[0] || null,
        energy: n.energy ?? null,
        proteins: n.proteins ?? null,
        fats: n.fats ?? null,
        carbs: n.carbs ?? null,
        order: ci * 1000 + ii,
      });
    }
  }
  console.log(`  внешнее меню «${menu.name}»: ${rows.length} блюд с ценой для ресторана`);
  if (!rows.length) {
    // Разбор, почему пусто: сколько разделов и позиций, как в меню записаны цены (без ключей и токенов)
    const all = categories.flatMap((c) => c.items || []);
    const sample = all.find((i) => (i.itemSizes || []).length);
    console.log(`  разбор меню: разделов ${categories.length} (скрытых ${categories.filter((c) => c.isHidden).length}),`
      + ` позиций ${all.length} (скрытых ${all.filter((i) => i.isHidden).length}, без размеров ${all.filter((i) => !(i.itemSizes || []).length).length});`
      + ` поля ответа: ${Object.keys(data || {}).join(', ')}`);
    if (sample) {
      console.log(`  пример «${sample.name}»: цены ${JSON.stringify(sample.itemSizes[0].prices || null).slice(0, 400)};`
        + ` организация источника ${organizationId}`);
    }
    return 0;
  }

  // Раздел основного меню → касса: крепкий алкоголь (ООО) — на свою кассу в той же iiko, остальное — на кухонную
  const splits = source === 'main' ? (await pool.query(
    'SELECT code, name, split_regex FROM restaurant_sources WHERE restaurant_id = $1 AND is_enabled AND split_regex IS NOT NULL',
    [restaurant.id],
  )).rows : [];
  for (const r of rows) {
    r.source = source;
    for (const sp of splits) {
      let re;
      try { re = new RegExp(sp.split_regex, 'i'); } catch { continue; }
      if (re.test(r.category.name || '') && !/безалког|молочн|детск/i.test(r.category.name || '')) { r.source = sp.code; break; }
    }
  }
  if (splits.length) {
    for (const sp of splits) {
      const cats = [...new Set(rows.filter((x) => x.source === sp.code).map((x) => x.category.name))];
      console.log(`  → на кассу «${sp.name}»: ${rows.filter((x) => x.source === sp.code).length} поз. (${cats.join(', ') || 'разделов нет'})`);
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const seen = new Set();
    for (const r of rows) {
      if (seen.has(r.category.id)) continue;
      seen.add(r.category.id);
      await client.query(
        `INSERT INTO categories (id, name, slug, parent_id, sort_order, is_visible)
         VALUES ($1, $2, $3, NULL, $4, TRUE)
         ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, sort_order = EXCLUDED.sort_order, parent_id = NULL, is_visible = TRUE`,
        [r.category.id, r.category.name, r.category.id, r.category.order],
      );
    }
    // Меню каждого источника (кухня, бар…) перезаписывается отдельно
    await client.query('DELETE FROM products WHERE restaurant_id = $1 AND source = ANY($2::text[])', [restaurant.id, [source, ...splits.map((x) => x.code)]]);
    for (const r of rows) {
      await client.query(
        `INSERT INTO products
           (iiko_id, restaurant_id, name, slug, description, price, weight, image_url,
            category_id, sort_order, is_published, energy, proteins, fats, carbs, source, sku)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,TRUE,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (restaurant_id, iiko_id) DO NOTHING`,
        [r.id, restaurant.id, r.name, r.name, r.description, r.price, r.weight, r.image,
          r.category.id, (source === 'main' ? 0 : 100000) + r.order, r.energy, r.proteins, r.fats, r.carbs, r.source || source,
          r.sku ? String(r.sku).slice(0, 50) : null],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  console.log(`  ✓ записано ${rows.length} продуктов (внешнее меню)`);
  return rows.length;
}

async function syncRestaurant(restaurant, token, orgs = [], externalMenu = null, menuToken = token, menuData = null) {
  const { id: restaurantId, slug, name } = restaurant;
  let organizationId = restaurant.organization_id;

  if (!organizationId) {
    console.log(`  ! ${slug}: organization_id не задан, пропускаем`);
    return { products: 0 };
  }

  console.log(`→ ${name} (${slug})`);
  console.log(`  organizationId: ${organizationId}`);

  // Источник меню — внешнее меню iiko. Номенклатура — только если внешнее меню не подключено.
  if (externalMenu) {
    try {
      const n = await syncFromExternalMenu(restaurant, menuToken, externalMenu, organizationId, menuData);
      if (n) return { products: n };
      console.log('  ! во внешнем меню нет блюд с ценой для этого ресторана — оставляем прежнюю выгрузку'
        + ' (проверьте ценовую категорию/организацию во внешнем меню)');
      return { products: 0, error: 'external menu empty' };
    } catch (e) {
      console.log(`  ! внешнее меню: ${e.response?.status || ''} ${JSON.stringify(e.response?.data?.errorDescription || e.response?.data || e.message).slice(0, 300)}`);
      return { products: 0, error: e.message };
    }
  }

  let nomenclature;
  try {
    nomenclature = await getNomenclature(token, organizationId);
  } catch (e) {
    const status = e.response?.status;
    const data = e.response?.data;
    console.log(`  ! ошибка iiko (${status}): ${JSON.stringify(data) || e.message}`);
    return { products: 0, error: e.message };
  }

  let { groups = [], products = [] } = nomenclature;
  console.log(`  iiko вернул: ${groups.length} групп, ${products.length} продуктов`);
  if (!products.length && orgs.length) {
    const found = await findMenuOrganization(token, restaurant, orgs);
    if (found) {
      organizationId = found.org.id;
      ({ groups = [], products = [] } = found.nomenclature);
    }
  }

  const iikoGroupMap = new Map(groups.map((g) => [g.id, g]));

  const relevantProducts = products.filter((p) => {
    if (!CATALOG_IDS.has(p.parentGroup)) return false;
    if (p.isDeleted) return false;
    if (p.isIncludedInMenu === false) return false;
    const price = p.sizePrices?.[0]?.price?.currentPrice ?? 0;
    if (price <= 0) return false;
    return true;
  });

  console.log(`  релевантных продуктов: ${relevantProducts.length}`);

  // Группы сайта не совпали с группами организации — берём меню из групп самого iiko
  let useIikoGroups = false;
  if (!relevantProducts.length) {
    const menuGroups = new Set(groups.filter((g) => !g.isDeleted && g.isIncludedInMenu !== false && !g.isGroupModifier).map((g) => g.id));
    for (const p of products) {
      if (p.isDeleted || p.isIncludedInMenu === false) continue;
      if (p.type && !['Dish', 'Goods'].includes(p.type)) continue;
      if (!menuGroups.has(p.parentGroup)) continue;
      if ((p.sizePrices?.[0]?.price?.currentPrice ?? 0) <= 0) continue;
      relevantProducts.push(p);
    }
    useIikoGroups = relevantProducts.length > 0;
    console.log(`  по группам iiko: ${relevantProducts.length} продуктов`);
  }

  if (!relevantProducts.length) {
    console.log('  ! iiko не вернул блюд для меню — оставляем прежнюю выгрузку');
    return { products: 0, error: 'empty nomenclature' };
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await ensureCategoriesMerged(client, iikoGroupMap);
    if (useIikoGroups) await upsertIikoGroups(client, groups, relevantProducts);

    await client.query(`DELETE FROM products WHERE restaurant_id = $1 AND source = 'main'`, [restaurantId]);

    let inserted = 0;
    for (const [i, p] of relevantProducts.entries()) {
      const imageUrl = p.imageLinks?.[0] ?? null;
      const price = p.sizePrices?.[0]?.price?.currentPrice ?? 0;
      const weight = p.weight ? String(p.weight) : null;

      await client.query(
        `INSERT INTO products
           (iiko_id, restaurant_id, name, slug, description, price, weight, image_url,
            category_id, sort_order, is_published, energy, proteins, fats, carbs, sku)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
         ON CONFLICT (restaurant_id, iiko_id) DO UPDATE SET
           name = EXCLUDED.name,
           sku = EXCLUDED.sku,
           description = EXCLUDED.description,
           price = EXCLUDED.price,
           weight = EXCLUDED.weight,
           image_url = EXCLUDED.image_url,
           category_id = EXCLUDED.category_id,
           sort_order = EXCLUDED.sort_order,
           energy = EXCLUDED.energy,
           proteins = EXCLUDED.proteins,
           fats = EXCLUDED.fats,
           carbs = EXCLUDED.carbs`,
        [
          p.id,
          restaurantId,
          p.name,
          p.name,
          p.description ?? null,
          price,
          weight,
          imageUrl,
          p.parentGroup,
          p.order ?? i,
          true,
          p.energyAmount ?? null,
          p.fiberAmount ?? p.proteinsAmount ?? null,
          p.fatAmount ?? null,
          p.carbohydrateAmount ?? p.carbohydratesAmount ?? null,
          p.code ? String(p.code).slice(0, 50) : null,
        ]
      );
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`  ✓ записано ${inserted} продуктов`);
    return { products: inserted };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

async function getRestaurants(slugFilter) {
  const slugs = slugFilter ? [].concat(slugFilter) : null;
  const sql = slugs
    ? `SELECT id, slug, name, address, organization_id FROM restaurants WHERE slug = ANY($1) ORDER BY sort_order, name`
    : `SELECT id, slug, name, address, organization_id FROM restaurants WHERE is_disabled = FALSE ORDER BY sort_order, name`;
  const args = slugs ? [slugs] : [];
  const { rows } = await pool.query(sql, args);
  return rows;
}

/** Выгрузка меню из iiko по всем (или одному) ресторанам. Используется скриптом и сервером по таймеру. */
export async function syncAllRestaurants(slugArg = null) {
  const restaurants = await getRestaurants(slugArg);
  if (restaurants.length === 0) {
    console.log(`Нет ресторанов${slugArg ? ` со slug=${slugArg}` : ''}.`);
    return { restaurants: 0, products: 0, failed: 0 };
  }
  const token = await getToken();
  let orgs = [];
  try {
    orgs = (await iikoPostRaw(token, '/api/1/organizations', { returnAdditionalInfo: false, includeDisabled: false })).organizations || [];
  } catch (e) {
    console.log('  ! не удалось получить список организаций:', e.message);
  }
  const menuToken = token;
  const externalMenu = await pickExternalMenu(menuToken);
  // Внешнее меню — одним запросом на все рестораны (цены в нём по организациям): меньше запросов, нет 429
  let menuData = null;
  if (externalMenu) {
    // Только организации, подключённые к ключу (иначе iiko отвечает 403 на весь запрос)
    const visible = new Set(orgs.map((o) => o.id));
    const orgIds = [...new Set(restaurants.map((r) => r.organization_id).filter((id) => id && (!visible.size || visible.has(id))))];
    try {
      menuData = await requestExternalMenu(menuToken, externalMenu, orgIds);
      const cats = menuData.itemCategories || menuData.categories || [];
      console.log(`Внешнее меню «${externalMenu.name}»: категорий ${cats.length}, позиций ${cats.reduce((n, c) => n + (c.items || []).length, 0)}`);
    } catch (e) {
      console.log('  ! внешнее меню одним запросом не получено, запрашиваем по ресторанам:',
        e.response?.status || '', JSON.stringify(e.response?.data?.errorDescription || e.message).slice(0, 200));
    }
  }
  let totalProducts = 0;
  let failed = 0;
  const visibleOrgs = new Set(orgs.map((o) => o.id));
  for (const [idx, r] of restaurants.entries()) {
    if (visibleOrgs.size && r.organization_id && !visibleOrgs.has(r.organization_id)) {
      console.log(`→ ${r.name} (${r.slug}): точка не подключена к API-логину iiko — пропускаем (прежняя выгрузка сохраняется)`);
      continue;
    }
    if (idx && !menuData) await new Promise((res) => setTimeout(res, 6000)); // iiko ограничивает частоту запросов (429)
    try {
      const res = await syncRestaurant(r, token, orgs, externalMenu, menuToken, menuData);
      totalProducts += res.products || 0;
      if (res.error) failed++;
    } catch (e) {
      failed++;
      console.error(`  ! ошибка по ${r.slug}: ${e.message}`);
    }
  }
  const extra = await syncExtraSources(restaurants);
  totalProducts += extra.products;
  failed += extra.failed;
  console.log(`✓ Готово. Ресторанов: ${restaurants.length}, всего продуктов: ${totalProducts}, ошибок: ${failed}`);
  return { restaurants: restaurants.length, products: totalProducts, failed };
}

/** Дополнительные источники (например, бар с алкоголем в другой организации/аккаунте iiko). */
async function syncExtraSources(restaurants) {
  const ids = restaurants.map((r) => r.id);
  const { rows: sources } = await pool.query(
    `SELECT * FROM restaurant_sources WHERE is_enabled AND split_regex IS NULL AND restaurant_id = ANY($1::uuid[]) ORDER BY sort_order`,
    [ids],
  );
  let products = 0;
  let failed = 0;
  for (const src of sources) {
    const r = restaurants.find((x) => x.id === src.restaurant_id);
    console.log(`→ ${r.name} · источник «${src.name}» (${src.code}, org ${src.organization_id}${src.creds ? `, ключ ${src.creds}` : ''})`);
    try {
      const token = await requestIikoTokenFor(src.creds);
      const menu = await pickExternalMenu(token, { directId: src.external_menu_id, prefer: /бар|алко|напит/i, fromEnv: false });
      if (!menu) { failed++; continue; }
      const data = await requestExternalMenu(token, menu, [src.organization_id]);
      const n = await syncFromExternalMenu(r, token, menu, src.organization_id, data, src.code);
      if (!n) console.log('  ! во внешнем меню нет блюд с ценой для этой организации — прежняя выгрузка сохраняется');
      products += n || 0;
    } catch (e) {
      failed++;
      console.log(`  ! источник «${src.name}»: ${e.response?.status || ''} ${JSON.stringify(e.response?.data?.errorDescription || e.message).slice(0, 300)}`);
    }
  }
  return { products, failed };
}

if (process.argv[1] && process.argv[1].endsWith('sync-iiko.js')) {
  syncAllRestaurants(process.argv[2] || null)
    .then(() => pool.end())
    .catch((e) => {
      console.error('Sync failed:', e.message);
      process.exit(1);
    });
}
