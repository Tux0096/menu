/** Админка: меню и стоп-лист, загрузка медиа, оплата, источники iiko, баннеры, подсказки, сотрудники, QR. */
import express from 'express';
import { MEDIA_DIR } from '../lib/paths.js';
import { join } from 'path';
import { mkdirSync, writeFileSync } from 'fs';
import { randomUUID } from 'crypto';
import { h, httpError, requireBody } from '../lib/http.js';
import pool from '../db/pool.js';
import { isIikoDemo, accessibleOrgs, iikoRequest, withIikoCreds } from '../iiko-client.js';
import { iikoCredsList, iikoCredsLabel, iikoApiLogin, maskIikoKey } from '../lib/iiko-token.js';
import { listSources } from '../services/sources.js';
import { paySettingsForAdmin, savePaySettings } from '../services/payments.js';
import { listStopLists, refreshStopLists } from '../services/stoplist.js';
import { getRestaurantCatalog, invalidateCatalogCache } from '../services/catalog.js';
import { bumpCatalogVersion } from '../lib/catalog-version.js';
import { audit, listStaff, saveStaff, staffAuth } from '../services/staff-auth.js';
import { iikoStaffLoginEnabled } from '../services/iiko-staff.js';
import { fujiTeamEnabled, saveStaffQuery, teamSchema, teamStatus, testStaffQuery } from '../services/fuji-team.js';
import {
  deleteOverride, deleteRow, getAdminMenu, listAudit, listFeedback, listRestaurants, listRows, saveOverride, saveRow,
  tableQrSvg, tableUrl, updateRestaurant,
} from '../services/admin.js';
import { staffRestaurant } from '../lib/staff-scope.js';
import {
  getCategoryList, getModifierList, getNetworkMenu, getNetworkMenuPoints, saveCategorySettings, saveModifierTitles, setCategoryImage, setModifierImage,
} from '../services/network-menu.js';
import { getLunchAdmin, saveLunchSettings } from '../services/business-lunch.js';
import { syncIikoMenu } from '../services/background-jobs.js';
import { getCashdesks, getIikoSetup, setCashdesk, setIikoSetup, setSectionRoute } from '../services/cashdesks.js';
import { alcoPublic, normalizeAlcoRules, validateAlcoRules } from '../lib/alco-rules.js';
import { QR_SIGNED_REQUIRED, qrSignedRequired, setQrSignedRequired } from '../lib/qr-config.js';

const router = express.Router();
export default router;

// ── Админка ─────────────────────────────────────────────────────────────────

const admin = express.Router();
// Роли админки: администратор — всё (сотрудники и доступы, iiko, QR); маркетинг — только контент меню:
// карточки блюд, фото, метки, баннеры, подсказки AI; управляющий — статистика (/api/v1/manager/*)
const CONTENT_ROUTES = [['GET', /^\/menu$/], ['*', /^\/network-menu/], ['*', /^\/business-lunch/], ['GET', /^\/stop-lists$/], ['POST', /^\/upload$/], ['*', /^\/menu\/override/], ['*', /^\/chips/],
  ['*', /^\/promos/], ['GET', /^\/restaurants$/]];
admin.use((req, res, next) => {
  const content = CONTENT_ROUTES.some(([m, re]) => (m === '*' || m === req.method) && re.test(req.path));
  return staffAuth('admin', content ? ['marketing'] : [])(req, res, next);
});
// Любая успешная правка в админке может менять то, что видит гость, — сбрасываем готовый каталог
admin.use((req, res, next) => {
  if (req.method !== 'GET') res.on('finish', () => { if (res.statusCode < 400) bumpCatalogVersion(); });
  next();
});
admin.get('/menu', h(async (req) => getAdminMenu(await staffRestaurant(req), { force: req.query.refresh === '1' })));

// ── Меню сети: позиции всех точек и где каждая есть ─────────────────────────
/** Рестораны, доступные сотруднику: привязанному — только свой */
async function staffRestaurants(req) {
  const list = await listRestaurants();
  return req.staff.restaurantId ? list.filter((r) => r.id === req.staff.restaurantId) : list;
}
async function staffRestaurantBySlug(req, slug) {
  const r = (await staffRestaurants(req)).find((x) => x.slug === slug || x.id === slug);
  if (!r) throw httpError(403, 'Нет доступа к этому ресторану');
  return r;
}
admin.get('/network-menu', h(async (req) => getNetworkMenu(await staffRestaurants(req))));
// Есть ли позиция на точке: скрыть / вернуть (только среди блюд, которые есть в iiko этой точки)
// Картинки разделов меню (шторка «Меню» у гостя): общие для всех точек
admin.get('/network-menu/categories', h(async (req) => getCategoryList(await staffRestaurants(req))));
admin.post('/network-menu/categories', h(async (req) => {
  // Картинка раздела одна на всю сеть — меняет только сотрудник без привязки к точке
  if (req.staff.restaurantId) throw httpError(403, 'Картинки разделов общие для сети — их меняет сотрудник без привязки к точке');
  requireBody(req.body, 'name');
  const image = req.body.image ? String(req.body.image) : null;
  if (image && !/^(\/media\/|https:\/\/)/.test(image)) throw httpError(400, 'Картинка — загруженный файл или ссылка https://');
  const res = await setCategoryImage(String(req.body.name), image, req.body.bar === true);
  if (!res) throw httpError(400, 'Нет названия раздела');
  audit(req.staff, 'menu.category.image', 'category', String(req.body.name), { image, bar: req.body.bar === true });
  return res;
}));
// Разделы меню: порядок, своё название, вкладка «Кухня/Бар», скрытие — одним списком
admin.put('/network-menu/categories', h(async (req) => {
  if (req.staff.restaurantId) throw httpError(403, 'Разделы меню общие для сети — их настраивает сотрудник без привязки к точке');
  if (!Array.isArray(req.body?.items)) throw httpError(400, 'Нет списка разделов');
  const res = await saveCategorySettings(req.body.items);
  audit(req.staff, 'menu.categories', 'category', '', { count: res.saved });
  return res;
}));
// Модификаторы: свои названия групп и вариантов, картинки вариантов — общие для сети
admin.get('/network-menu/modifiers', h(async (req) => getModifierList(await staffRestaurants(req))));
admin.put('/network-menu/modifiers', h(async (req) => {
  if (req.staff.restaurantId) throw httpError(403, 'Модификаторы общие для сети — их настраивает сотрудник без привязки к точке');
  const res = await saveModifierTitles(req.body || {});
  audit(req.staff, 'menu.modifiers', 'modifier', '', { count: res.saved });
  return res;
}));
admin.post('/network-menu/modifiers/image', h(async (req) => {
  if (req.staff.restaurantId) throw httpError(403, 'Модификаторы общие для сети — их настраивает сотрудник без привязки к точке');
  requireBody(req.body, 'name');
  const image = req.body.image ? String(req.body.image) : null;
  if (image && !/^(\/media\/|https:\/\/)/.test(image)) throw httpError(400, 'Картинка — загруженный файл или ссылка https://');
  const res = await setModifierImage(String(req.body.name), image);
  if (!res) throw httpError(400, 'Нет названия варианта');
  audit(req.staff, 'menu.modifier.image', 'modifier', String(req.body.name), { image });
  return res;
}));
// Конструктор бизнес-ланча: время действия, наборы, варианты шагов, напитки — общие для сети (расписание можно переопределить для точки)
admin.get('/business-lunch', h(async (req) => {
  const restaurants = await staffRestaurants(req);
  const data = await getLunchAdmin(restaurants, (r) => getRestaurantCatalog(r));
  // Разделы меню — для выбора места карточки ланча (кухня/бар, раздел)
  const categories = (await getCategoryList(restaurants)).filter((c) => !c.hidden)
    .map((c) => ({ key: c.key, name: c.title || c.name, tab: c.tab === 'bar' || (!c.tab && c.isBar) ? 'bar' : 'kitchen' }));
  return { ...data, categories };
}));
admin.put('/business-lunch', h(async (req) => {
  if (req.staff.restaurantId) throw httpError(403, 'Бизнес-ланч общий для сети — его настраивает сотрудник без привязки к точке');
  const restaurants = await staffRestaurants(req);
  const res = await saveLunchSettings(req.body || {}, restaurants);
  audit(req.staff, 'menu.business-lunch', 'settings', '', { schedule: req.body?.schedule || null, overrides: Object.keys(req.body?.overrides || {}), placement: req.body?.placement ?? undefined, content: Array.isArray(req.body?.content) ? req.body.content.length : undefined });
  return res;
}));
// Отчёт выгрузки iiko: какие разделы и позиции внешнего меню не попали к гостям и почему (скрыты, нет цены для точки)
admin.get('/network-menu/sync-report', h(async (req) => {
  const restaurants = await staffRestaurants(req);
  const { rows } = await pool.query(
    `SELECT restaurant_id, source, menu_name, report, created_at FROM menu_sync_reports WHERE restaurant_id = ANY($1::uuid[])`,
    [restaurants.map((r) => r.id)],
  );
  return rows.map((x) => {
    const r = restaurants.find((y) => y.id === x.restaurant_id);
    return {
      restaurant: r?.name || '', slug: r?.slug || '', source: x.source, menuName: x.menu_name, at: x.created_at,
      sections: (x.report || []).filter((c) => c.hidden || c.noPrice || c.hiddenItems || !c.shown),
    };
  }).sort((a, b) => a.restaurant.localeCompare(b.restaurant, 'ru'));
}));
admin.post('/network-menu/availability', h(async (req) => {
  requireBody(req.body, 'restaurant', 'productId');
  const r = await staffRestaurantBySlug(req, req.body.restaurant);
  const available = req.body.available !== false;
  await saveOverride(r.id, String(req.body.productId), { is_hidden: !available, product_name: req.body.productName });
  audit(req.staff, 'menu.availability', 'product', req.body.productId, { restaurant: r.slug, available, name: req.body.productName });
  return { ok: true };
}));
// Бизнес-ланч во внешних меню iiko — как он пришёл при последней выгрузке (разделы, позиции, цены, группы выбора)
admin.get('/business-lunch/iiko', h(async (req) => {
  const restaurants = await staffRestaurants(req);
  const { rows } = await pool.query(
    `SELECT restaurant_id, source, menu_name, lunch, created_at FROM menu_sync_reports WHERE restaurant_id = ANY($1::uuid[])`,
    [restaurants.map((r) => r.id)],
  );
  return rows.map((x) => ({
    restaurant: restaurants.find((y) => y.id === x.restaurant_id)?.name || '', source: x.source, menuName: x.menu_name, at: x.created_at,
    lunch: x.lunch, // null — выгрузки с разбором ещё не было
  })).sort((a, b) => a.restaurant.localeCompare(b.restaurant, 'ru') || a.source.localeCompare(b.source));
}));
// Массово: показать или скрыть отмеченные блюда (каждое — на точках, где оно есть). Одним запросом, до 300 позиций
admin.post('/network-menu/availability/batch', h(async (req) => {
  const list = Array.isArray(req.body?.items) ? req.body.items.slice(0, 300) : [];
  if (!list.length) throw httpError(400, 'Отметьте блюда');
  const available = req.body.available !== false;
  const byPoint = new Map();
  let updated = 0;
  for (const x of list) {
    if (!x?.restaurant || !x?.productId) continue;
    if (!byPoint.has(x.restaurant)) byPoint.set(x.restaurant, await staffRestaurantBySlug(req, x.restaurant));
    const r = byPoint.get(x.restaurant);
    await saveOverride(r.id, String(x.productId), { is_hidden: !available, product_name: x.productName });
    updated++;
  }
  audit(req.staff, 'menu.availability', 'product', 'batch', { available, count: updated, points: [...byPoint.keys()] });
  return { ok: true, updated };
}));
// Карточка позиции сразу на нескольких точках: у каждой точки свой ID блюда в iiko
admin.post('/network-menu/card', h(async (req) => {
  requireBody(req.body, 'targets');
  const targets = Array.isArray(req.body.targets) ? req.body.targets.slice(0, 50) : [];
  if (!targets.length) throw httpError(400, 'Выберите точки');
  const fields = { ...(req.body.fields || {}) };
  delete fields.is_stopped; // стоп-лист — в iiko и в меню точки, не из карточки сети
  delete fields.is_hidden; // где есть позиция — переключателем по точкам
  for (const t of targets) {
    const r = await staffRestaurantBySlug(req, t.restaurant);
    await saveOverride(r.id, String(t.productId), { ...fields, product_name: req.body.productName });
  }
  audit(req.staff, 'menu.card.network', 'product', req.body.productName || '', { points: targets.map((t) => t.restaurant), fields });
  return { ok: true, updated: targets.length };
}));
// Стоп-листы iiko как есть, по точкам (только чтение)
admin.get('/stop-lists', h(async (req) => {
  const restaurants = await staffRestaurants(req);
  const { points } = await getNetworkMenuPoints(restaurants);
  const rows = await listStopLists(restaurants.map((r) => r.id));
  return Promise.all(points.map(async (p) => {
    // Позиция из меню точки — название и цена как у гостя (каталог: выгрузка iiko + правки админки)
    const catalog = await getRestaurantCatalog(restaurants.find((r) => r.id === p.id));
    const byId = new Map((catalog.products || []).flatMap((x) => [[String(x.id), x], [String(x.iikoId || x.id), x]]));
    const items = rows.filter((x) => x.restaurantId === p.id).map((x) => {
      const m = byId.get(x.productId);
      return m ? { ...x, name: m.name, price: Number(m.price) || x.price, inMenu: true } : x;
    });
    return { ...p, items };
  }));
}));
// Загрузка фото блюда: тело запроса — сам файл (image/jpeg|png|webp), до 8 МБ
// Фото (в том числе анимированные WebP/GIF) и короткие видео для «живого» меню
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const VIDEO_TYPES = { 'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov' };
const MEDIA_TYPES = { ...IMAGE_TYPES, ...VIDEO_TYPES };
/** Содержимое файла совпадает с заявленным типом (по сигнатуре), а не только по заголовку Content-Type */
function matchesSignature(buf, ext) {
  const at = (offset, text) => buf.subarray(offset, offset + text.length).toString('latin1') === text;
  switch (ext) {
    case 'jpg': return buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
    case 'png': return buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'gif': return at(0, 'GIF87a') || at(0, 'GIF89a');
    case 'webp': return at(0, 'RIFF') && at(8, 'WEBP');
    case 'mp4': case 'mov': return at(4, 'ftyp') || at(4, 'moov') || at(4, 'wide') || at(4, 'mdat');
    case 'webm': return buf.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default: return false;
  }
}
// ── Кассы точки: кухня (ИП) и бар (ООО, крепкий алкоголь) — какой раздел на какую кассу ─────────
admin.get('/cashdesks', h(async (req) => getCashdesks(await staffRestaurant(req))));
admin.post('/cashdesks/terminal', h(async (req) => {
  const r = await staffRestaurant(req);
  const role = String(req.body?.role || '');
  const terminalGroupId = req.body?.terminalGroupId ? String(req.body.terminalGroupId) : null;
  await setCashdesk(r, { role, terminalGroupId });
  audit(req.staff, 'cashdesk.terminal', 'restaurant', r.slug, { role, terminalGroupId });
  return getCashdesks(await staffRestaurant(req));
}));
// Сколько iiko на точке: одна (кухня и бар в одной iiko) или две (бар в отдельной iiko со своим ключом)
const credsOptions = () => iikoCredsList().map((c) => ({ code: c, label: iikoCredsLabel(c) }));
admin.get('/iiko-setup', h(async (req) => ({ ...(await getIikoSetup(await staffRestaurant(req))), creds: credsOptions() })));
admin.post('/iiko-setup', h(async (req) => {
  const r = await staffRestaurant(req);
  const mode = String(req.body?.mode || '');
  const creds = String(req.body?.creds || '');
  if (creds && !iikoCredsList().includes(creds)) throw httpError(400, `Ключ ${creds} не задан на сервере`);
  const setup = await setIikoSetup(r, {
    mode, creds,
    organizationId: req.body?.organizationId ? String(req.body.organizationId) : null,
    externalMenuId: req.body?.externalMenuId ? String(req.body.externalMenuId) : null,
  });
  audit(req.staff, 'restaurant.iiko_setup', 'restaurant', r.slug, { mode, creds, organizationId: req.body?.organizationId || null });
  // Сразу перевыгружаем меню точки: бар приходит своим меню или возвращается в меню кухни
  await syncIikoMenu({ slugs: [r.slug] }).catch((e) => console.warn('iiko-setup sync:', e.message));
  invalidateCatalogCache(r.id);
  return { ...setup, creds: credsOptions() };
}));
// Карточка точки для гостя: адрес и время работы (в выборе ресторана)
admin.get('/point-info', h(async (req) => {
  const r = await staffRestaurant(req);
  return { name: r.name, address: r.address || '', workHours: r.hours_text || '' };
}));
admin.post('/point-info', h(async (req) => {
  const r = await staffRestaurant(req);
  // Не переданное поле не меняется; адрес гостю нужен — пустым не сохраняем
  const address = String(req.body?.address ?? r.address ?? '').trim().slice(0, 300);
  const workHours = String(req.body?.workHours ?? r.hours_text ?? '').trim().slice(0, 60);
  if (!address) throw httpError(400, 'Укажите адрес точки');
  const { rows } = await pool.query(
    'UPDATE restaurants SET address = $2, hours_text = $3 WHERE id = $1 RETURNING name, address, hours_text',
    [r.id, address, workHours || null],
  );
  audit(req.staff, 'restaurant.info', 'restaurant', r.slug, { address, workHours });
  return { name: rows[0].name, address: rows[0].address || '', workHours: rows[0].hours_text || '' };
}));
// База сотрудников «Фуджи Тим» (вход на of. по табельному): подключение, структура базы (без данных),
// запрос сотрудников — проверка и сохранение. Строка подключения — только на сервере (GitHub Secret FUJI_TEAM_DATABASE_URL)
admin.get('/fuji-team', h(async () => teamStatus()));
admin.get('/fuji-team/schema', h(async () => teamSchema()));
admin.post('/fuji-team/test', h(async (req) => testStaffQuery(req.body?.query)));
admin.put('/fuji-team', h(async (req) => {
  const out = await saveStaffQuery(req.body?.query);
  audit(req.staff, 'fuji_team.query', 'settings', 'fuji_team', { length: out.query.length });
  return teamStatus();
}));

// Правила продажи алкоголя точки: продаётся ли, часы (по времени точки), текст для гостей, 18+ и проверка документа.
// Гость и официант видят их в карточках позиций и над заказом; сервер отклоняет заказ алкоголя вне правил
admin.get('/alcohol', h(async (req) => {
  const r = await staffRestaurant(req);
  const rules = normalizeAlcoRules(r.alcohol_rules);
  return { ...rules, preview: alcoPublic(rules) };
}));
admin.post('/alcohol', h(async (req) => {
  const r = await staffRestaurant(req);
  const rules = validateAlcoRules(req.body);
  // Каталог гостя пересоберётся сам: любая успешная правка админки сбрасывает его версию
  await pool.query('UPDATE restaurants SET alcohol_rules = $2 WHERE id = $1', [r.id, JSON.stringify(rules)]);
  audit(req.staff, 'restaurant.alcohol', 'restaurant', r.slug, {
    enabled: rules.enabled, from: rules.from, to: rules.to, requireAgeConfirm: rules.requireAgeConfirm, requireDocCheck: rules.requireDocCheck,
  });
  return { ...rules, preview: alcoPublic(rules) };
}));
admin.post('/cashdesks/route', h(async (req) => {
  const r = await staffRestaurant(req);
  const categoryId = String(req.body?.categoryId || '');
  const target = req.body?.target ? String(req.body.target) : null;
  await setSectionRoute(r, { categoryId, target }, req.staff);
  audit(req.staff, 'cashdesk.route', 'category', categoryId, { restaurant: r.slug, target });
  return getCashdesks(r);
}));

admin.post('/upload', express.raw({ type: Object.keys(MEDIA_TYPES), limit: '25mb' }), h(async (req) => {
  const type = String(req.headers['content-type'] || '').split(';')[0];
  const ext = MEDIA_TYPES[type];
  const isVideo = Boolean(VIDEO_TYPES[type]);
  if (!ext || !req.body?.length || (!isVideo && req.body.length > 8 * 1024 * 1024) || !matchesSignature(req.body, ext)) {
    throw httpError(400, 'Нужна картинка JPG, PNG, WebP или GIF до 8 МБ либо видео MP4/WebM до 25 МБ');
  }
  mkdirSync(MEDIA_DIR, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  writeFileSync(join(MEDIA_DIR, name), req.body);
  audit(req.staff, 'media.upload', 'file', name, { size: req.body.length });
  return { url: `/media/${name}` };
}));
admin.post('/menu/sync', h(async (req) => {
  const r = await staffRestaurant(req);
  await syncIikoMenu({ slugs: [r.slug] });
  const extraOrgs = (await listSources(r)).map((x) => x.organization_id);
  await refreshStopLists([r.organization_id, ...extraOrgs]).catch(() => {});
  invalidateCatalogCache(r.id);
  audit(req.staff, 'menu.sync', 'restaurant', r.slug);
  return getAdminMenu(r, { force: true });
}));
// Источники iiko ресторана: кухня (основной) + доп. (бар с алкоголем в другой организации/аккаунте iiko)
// Оплата ресторана: ключи CloudPayments (секрет только записывается, наружу не отдаётся)
admin.get('/payments', h(async (req) => paySettingsForAdmin((await staffRestaurant(req)).id)));
admin.post('/payments', h(async (req) => {
  const r = await staffRestaurant(req);
  const res = await savePaySettings(r.id, req.body || {});
  audit(req.staff, 'payments.save', 'restaurant', r.slug, {
    onlineEnabled: res.onlineEnabled, publicId: res.publicId, secretChanged: Boolean(req.body?.apiSecret || req.body?.clearSecret),
  });
  return res;
}));
admin.get('/sources', h(async (req) => {
  const r = await staffRestaurant(req);
  return {
    sources: await listSources(r, { all: true }),
    creds: credsOptions(),
  };
}));
admin.get('/sources/options', h(async (req) => {
  const creds = String(req.query.creds || '');
  if (creds && !iikoCredsList().includes(creds)) {
    const err = new Error(`Ключ ${creds} не задан на сервере (секреты IIKO_${creds}_API_LOGIN / _CLIENT_SECRET)`);
    err.status = 400;
    throw err;
  }
  if (isIikoDemo()) return { orgs: [], menus: [] };
  const [orgs, menus] = await Promise.all([
    accessibleOrgs(creds),
    withIikoCreds(creds, () => iikoRequest('/api/2/menu', {})).then((d) => (d.externalMenus || []).map((m) => ({ id: String(m.id), name: m.name }))).catch(() => []),
  ]);
  return { orgs: orgs || [], menus };
}));
admin.post('/sources', h(async (req) => {
  requireBody(req.body, 'name', 'organizationId');
  const r = await staffRestaurant(req);
  const creds = String(req.body.creds || '');
  const code = String(req.body.code || 'bar').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 30) || 'bar';
  if (code === 'main') { const err = new Error('Код main занят основным источником'); err.status = 400; throw err; }
  // Группа терминалов организации — для заказа на стол и схемы зала
  let terminalGroupId = req.body.terminalGroupId || null;
  if (!terminalGroupId && !isIikoDemo()) {
    const tg = await withIikoCreds(creds, () => iikoRequest('/api/1/terminal_groups', { organizationIds: [req.body.organizationId], includeDisabled: false }))
      .catch(() => null);
    terminalGroupId = tg?.terminalGroups?.[0]?.items?.[0]?.id || null;
  }
  const { rows } = await pool.query(
    `INSERT INTO restaurant_sources (restaurant_id, code, name, organization_id, terminal_group_id, creds, external_menu_id, is_enabled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (restaurant_id, code) DO UPDATE SET name = EXCLUDED.name, organization_id = EXCLUDED.organization_id,
       terminal_group_id = EXCLUDED.terminal_group_id, creds = EXCLUDED.creds, external_menu_id = EXCLUDED.external_menu_id,
       is_enabled = EXCLUDED.is_enabled
     RETURNING *`,
    [r.id, code, String(req.body.name).slice(0, 100), req.body.organizationId, terminalGroupId, creds,
      req.body.externalMenuId || null, req.body.isEnabled !== false],
  );
  audit(req.staff, 'source.save', 'restaurant', r.slug, rows[0]);
  return rows[0];
}));
admin.delete('/sources/:code', h(async (req) => {
  const r = await staffRestaurant(req);
  await pool.query('DELETE FROM restaurant_sources WHERE restaurant_id = $1 AND code = $2', [r.id, req.params.code]);
  await pool.query('DELETE FROM products WHERE restaurant_id = $1 AND source = $2', [r.id, req.params.code]);
  invalidateCatalogCache(r.id);
  audit(req.staff, 'source.delete', 'restaurant', r.slug, { code: req.params.code });
  return { ok: true };
}));
admin.post('/menu/override', h(async (req) => {
  requireBody(req.body, 'productId');
  // Стоп-лист — операционная задача зала, не маркетинга
  if (req.staff.role === 'marketing') delete req.body.is_stopped;
  const r = await staffRestaurant(req);
  // «Во всех ресторанах» — только сотруднику без привязки к ресторану
  const restaurantId = req.body.scope === 'global' && !req.staff.restaurantId ? null : r.id;
  const row = await saveOverride(restaurantId, req.body.productId, req.body);
  audit(req.staff, 'menu.override', 'product', req.body.productId, { ...req.body, restaurant: restaurantId ? r.slug : 'all' });
  return row;
}));
admin.delete('/menu/override/:id', h(async (req) => {
  await deleteOverride(req.params.id, req.staff.restaurantId || null);
  audit(req.staff, 'menu.override.delete', 'override', req.params.id);
}));
// Чипы AI — общие для сети: правит только сотрудник без привязки к ресторану.
// Баннеры: сотрудник ресторана видит общие и свои, правит только свои (ресторан подставляется сам)
async function assertRowScope(req, table, id) {
  const own = req.staff.restaurantId;
  if (!own) return;
  if (table === 'ai_chips') throw httpError(403, 'Подсказки AI общие для сети — их меняет администратор сети');
  if (!id) return;
  const row = (await listRows(table)).find((x) => String(x.id) === String(id));
  if (row && row.restaurant_id !== own) throw httpError(403, 'Баннер другого ресторана или общий для сети');
}
for (const [path, table] of [['chips', 'ai_chips'], ['promos', 'promo_blocks']]) {
  admin.get(`/${path}`, h(async (req) => {
    const rows = await listRows(table);
    const own = req.staff.restaurantId;
    return own && table === 'promo_blocks' ? rows.filter((x) => !x.restaurant_id || x.restaurant_id === own) : rows;
  }));
  admin.post(`/${path}`, h(async (req) => {
    const body = { ...(req.body || {}) };
    await assertRowScope(req, table, body.id);
    if (req.staff.restaurantId && table === 'promo_blocks') body.restaurant_id = req.staff.restaurantId;
    const row = await saveRow(table, body);
    audit(req.staff, `${path}.save`, table, row.id, body);
    return row;
  }));
  admin.delete(`/${path}/:id`, h(async (req) => {
    await assertRowScope(req, table, req.params.id);
    await deleteRow(table, req.params.id);
    audit(req.staff, `${path}.delete`, table, req.params.id);
  }));
}
admin.get('/feedback', h(async (req) => listFeedback((await staffRestaurant(req)).id)));
admin.get('/audit', h(async (req) => listAudit(200, req.staff.restaurantId || null)));
// Вход официантов и управляющих зала через iiko включён — тогда в «Сотрудниках» только учётки админки
admin.get('/staff/mode', h(async () => ({ iikoLogin: iikoStaffLoginEnabled() || fujiTeamEnabled(), source: fujiTeamEnabled() ? 'team' : 'iiko' })));
admin.get('/staff', h(async (req) => listStaff(req.staff)));
admin.post('/staff', h(async (req) => {
  const row = await saveStaff(req.body || {}, req.staff);
  audit(req.staff, 'staff.save', 'staff', row.id, { login: row.login, role: row.role });
  return row;
}));
admin.get('/restaurants', h(async (req) => {
  const list = await listRestaurants();
  return req.staff.restaurantId ? list.filter((r) => r.id === req.staff.restaurantId) : list;
}));
admin.patch('/restaurants/:id', h(async (req) => {
  if (req.staff.restaurantId && req.staff.restaurantId !== req.params.id) throw httpError(403, 'Нет доступа к этому ресторану');
  const row = await updateRestaurant(req.params.id, req.body || {});
  audit(req.staff, 'restaurant.update', 'restaurant', req.params.id, req.body);
  return row;
}));
// Вход за стол только по подписанному QR — включают, когда новые наклейки уже на столах. Настройка на всю сеть
admin.get('/qr-settings', h(async (req) => ({ signedRequired: await qrSignedRequired(), envForced: QR_SIGNED_REQUIRED, canEdit: !req.staff.restaurantId })));
admin.post('/qr-settings', h(async (req) => {
  if (req.staff.restaurantId) throw httpError(403, 'Настройка общая для сети — её меняет администратор сети');
  const on = req.body?.signedRequired === true;
  await setQrSignedRequired(on);
  audit(req.staff, 'qr.signed_required', 'settings', 'qr_signed_required', { on });
  return { signedRequired: await qrSignedRequired(), envForced: QR_SIGNED_REQUIRED, canEdit: true };
}));
// QR столов с подписью — картинка сразу в ответе (data URI): подписанный QR выпускает только админка
admin.get('/tables', h(async (req) => {
  const r = await staffRestaurant(req);
  return Promise.all(Array.from({ length: r.tables_count || 20 }, async (_, i) => ({
    table: String(i + 1),
    url: tableUrl(r.slug, i + 1),
    qr: `data:image/svg+xml;base64,${Buffer.from(await tableQrSvg(r.slug, i + 1, { signed: true })).toString('base64')}`,
  })));
}));
router.use('/api/v1/admin', admin);
