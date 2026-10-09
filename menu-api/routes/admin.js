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
import { audit, listStaff, saveStaff, staffAuth } from '../services/staff-auth.js';
import {
  deleteOverride, deleteRow, getAdminMenu, listAudit, listFeedback, listRestaurants, listRows, saveOverride, saveRow,
  tableQrSvg, tableUrl, updateRestaurant,
} from '../services/admin.js';
import { staffRestaurant } from '../lib/staff-scope.js';
import { getNetworkMenu, getNetworkMenuPoints } from '../services/network-menu.js';
import { syncIikoMenu } from '../services/background-jobs.js';
import { getCashdesks, getIikoSetup, setCashdesk, setIikoSetup, setSectionRoute } from '../services/cashdesks.js';

const router = express.Router();
export default router;

// ── Админка ─────────────────────────────────────────────────────────────────

const admin = express.Router();
// Роли админки: администратор — всё (сотрудники и доступы, iiko, QR); маркетинг — только контент меню:
// карточки блюд, фото, метки, баннеры, подсказки AI; управляющий — статистика (/api/v1/manager/*)
const CONTENT_ROUTES = [['GET', /^\/menu$/], ['*', /^\/network-menu/], ['GET', /^\/stop-lists$/], ['POST', /^\/upload$/], ['*', /^\/menu\/override/], ['*', /^\/chips/],
  ['*', /^\/promos/], ['GET', /^\/restaurants$/]];
admin.use((req, res, next) => {
  const content = CONTENT_ROUTES.some(([m, re]) => (m === '*' || m === req.method) && re.test(req.path));
  return staffAuth('admin', content ? ['marketing'] : [])(req, res, next);
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
admin.post('/network-menu/availability', h(async (req) => {
  requireBody(req.body, 'restaurant', 'productId');
  const r = await staffRestaurantBySlug(req, req.body.restaurant);
  const available = req.body.available !== false;
  await saveOverride(r.id, String(req.body.productId), { is_hidden: !available, product_name: req.body.productName });
  audit(req.staff, 'menu.availability', 'product', req.body.productId, { restaurant: r.slug, available, name: req.body.productName });
  return { ok: true };
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
for (const [path, table] of [['chips', 'ai_chips'], ['promos', 'promo_blocks']]) {
  admin.get(`/${path}`, h(async () => listRows(table)));
  admin.post(`/${path}`, h(async (req) => {
    const row = await saveRow(table, req.body || {});
    audit(req.staff, `${path}.save`, table, row.id, req.body);
    return row;
  }));
  admin.delete(`/${path}/:id`, h(async (req) => {
    await deleteRow(table, req.params.id);
    audit(req.staff, `${path}.delete`, table, req.params.id);
  }));
}
admin.get('/feedback', h(async (req) => listFeedback((await staffRestaurant(req)).id)));
admin.get('/audit', h(async () => listAudit()));
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
