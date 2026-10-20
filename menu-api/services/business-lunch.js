/**
 * Конструктор бизнес-ланча («Собери свой ланч»).
 *
 * В iiko набор — позиция раздела «Бизнес-ланч» внешнего меню кухни с ценой 0, блюда в нём выбираются
 * модификаторами со своими ценами (выгрузка пишет options { groups, base: 0, needsChoice }). Устойчиво к двум вариантам:
 *  - набор = отдельная позиция со своими группами («Салат или ролл», «Суп», «Горячее»);
 *  - набор = размер позиции (у размера свои группы) — каждый размер становится набором.
 * Напитки ланча — позиции раздела «Бизнес-ланч» меню бара (другая касса), по своим ценам.
 *
 * Здесь: настройки из админки (таблица business_lunch_settings), блок businessLunch каталога
 * и проверка времени действия при заказе. Заказ в iiko — обычная позиция с модификаторами,
 * цену считает касса. Расписание — lib/lunch-schedule.js.
 */
import pool from '../db/pool.js';
import { menuKey } from '../lib/menu-key.js';
import {
  assertLunchOpen, isLunchActive, nextLunchStart, normalizeSchedule, scheduleText, validateSchedule, DEFAULT_SCHEDULE,
} from '../lib/lunch-schedule.js';

const NETWORK = 'network';
const LUNCH_SECTION = /бизнес ланч/;
const COMBO_NAME = /ланч|набор|сет/i;

// ── Настройки ───────────────────────────────────────────────────────────────

const emptySettings = () => ({ schedule: null, combos: {}, items: {}, drinks: {} });

/** Настройки сети и точки: расписание точки перекрывает общее; остальное — общее для сети. */
export async function loadLunchSettings(restaurantId = null) {
  let rows = [];
  try {
    ({ rows } = await pool.query('SELECT scope, data FROM business_lunch_settings WHERE scope = $1 OR scope = $2', [NETWORK, String(restaurantId || '')]));
  } catch (e) {
    console.warn('business_lunch_settings:', e.message);
  }
  const net = rows.find((r) => r.scope === NETWORK)?.data || {};
  const own = restaurantId ? rows.find((r) => r.scope === String(restaurantId))?.data || {} : {};
  return {
    ...emptySettings(), ...net,
    schedule: normalizeSchedule(own.schedule || net.schedule || DEFAULT_SCHEDULE),
    networkSchedule: normalizeSchedule(net.schedule || DEFAULT_SCHEDULE),
    ownSchedule: own.schedule ? normalizeSchedule(own.schedule) : null,
  };
}

const clean = (v, n = 120) => String(v ?? '').trim().slice(0, n);
const num = (v) => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

function cleanMap(src, fields) {
  const out = {};
  for (const [k, v] of Object.entries(src && typeof src === 'object' ? src : {}).slice(0, 1000)) {
    const key = clean(k, 200);
    if (!key || !v || typeof v !== 'object') continue;
    out[key] = fields(v);
  }
  return out;
}

/**
 * Сохранить настройки из админки: расписание сети, переопределения точек (slug → расписание | null),
 * наборы, варианты шагов и напитки. Передавать можно только часть — остальное остаётся.
 */
export async function saveLunchSettings(body, restaurants) {
  const { rows } = await pool.query('SELECT data FROM business_lunch_settings WHERE scope = $1', [NETWORK]);
  const data = { ...emptySettings(), ...(rows[0]?.data || {}) };
  if (body.schedule) data.schedule = validateSchedule(body.schedule);
  if (body.combos) data.combos = cleanMap(body.combos, (v) => ({ enabled: v.enabled !== false, title: clean(v.title), order: num(v.order) }));
  if (body.items) data.items = cleanMap(body.items, (v) => ({ enabled: v.enabled !== false, order: num(v.order) }));
  if (body.drinks) data.drinks = cleanMap(body.drinks, (v) => ({ enabled: v.enabled !== false, order: num(v.order) }));
  await pool.query(
    `INSERT INTO business_lunch_settings (scope, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (scope) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [NETWORK, JSON.stringify(data)],
  );
  if (body.overrides && typeof body.overrides === 'object') {
    for (const r of restaurants) {
      if (!(r.slug in body.overrides)) continue;
      const sch = body.overrides[r.slug];
      if (!sch) await pool.query('DELETE FROM business_lunch_settings WHERE scope = $1', [r.id]);
      else {
        await pool.query(
          `INSERT INTO business_lunch_settings (scope, data, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (scope) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [r.id, JSON.stringify({ schedule: validateSchedule(sch) })],
        );
      }
    }
  }
  return { ok: true };
}

// ── Каталог ─────────────────────────────────────────────────────────────────

const stepKey = (g) => menuKey(g.iikoName || g.name);
const itemKey = (g, m) => `${stepKey(g)}|${menuKey(m.iikoName || m.name)}`;
const weightText = (w) => (w ? `${w} г` : null);

/** Самая дешёвая сумма набора: цена + обязательный выбор; для набора за 0 — самый дешёвый платный вариант. */
export function lunchFromPrice(base, groups, needsChoice) {
  let extra = 0;
  for (const g of groups || []) {
    if (!(g.min > 0) || !g.items.length) continue;
    const prices = g.items.map((m) => Number(m.price) || 0).sort((a, b) => a - b);
    extra += prices.slice(0, g.min).slice(g.free || 0).reduce((n, v) => n + v, 0);
  }
  if (base + extra > 0 || !needsChoice) return base + extra;
  const paid = (groups || []).flatMap((g) => g.items.map((m) => Number(m.price) || 0)).filter((p) => p > 0);
  return paid.length ? Math.min(...paid) : 0;
}

/** Цена набора не зависит от выбора: в обязательных шагах у вариантов одна цена, в необязательных всё бесплатно. */
export function lunchFixedPrice(groups) {
  return (groups || []).every((g) => {
    const prices = new Set(g.items.map((m) => Number(m.price) || 0));
    return g.min > 0 ? prices.size <= 1 : !g.items.some((m) => Number(m.price) > 0);
  });
}

/** Группы набора для гостя: скрытые в админке варианты убираются, порядок — из админки, потом как в iiko. */
function shapeGroups(groups, items) {
  return (groups || []).map((g) => {
    const list = (g.items || []).map((m, i) => ({ m, i, s: items[itemKey(g, m)] }))
      .filter((x) => x.s?.enabled !== false)
      .sort((a, b) => (a.s?.order ?? 1e6 + a.i) - (b.s?.order ?? 1e6 + b.i))
      .map((x) => x.m);
    return { ...g, items: list };
  });
}

const stepOut = (g) => ({
  groupId: g.id || null,
  title: g.name,
  min: g.min || 0,
  max: g.max || 0,
  free: g.free || 0,
  items: g.items.map((m) => ({
    id: m.id, name: m.name, price: Number(m.price) || 0, image: m.image || null, weight: weightText(m.weight), max: m.max || 0, def: m.def || 0,
  })),
});

/**
 * Блок businessLunch и обновлённые блюда для каталога точки. Чистая функция: настройки и время передаются снаружи.
 * Возвращает { products, businessLunch, meta }: meta — всё найденное (включая выключенное) для админки, в каталог не идёт.
 */
export function buildBusinessLunch({ groups, products, settings, now = new Date() }) {
  const set = { ...emptySettings(), ...settings };
  const schedule = normalizeSchedule(set.schedule || DEFAULT_SCHEDULE);
  const lunchGroups = new Map((groups || []).filter((g) => LUNCH_SECTION.test(menuKey(g.iikoName || g.name))).map((g) => [String(g.id), g]));
  if (!lunchGroups.size) return { products, businessLunch: null, meta: null };

  const isDrink = (p) => (p.source || 'main') !== 'main' || Boolean(lunchGroups.get(String(p.parentGroup))?.isBar);
  const hasOptions = (p) => (p.sizes || []).length > 0 || (p.modifierGroups || []).length > 0;
  const looksLikeCombo = (p) => p.needsChoice || (p.sizes || []).some((z) => z.needsChoice) || COMBO_NAME.test(p.iikoName || p.name);

  const inLunch = products.filter((p) => lunchGroups.has(String(p.parentGroup)));
  const comboIds = new Set();
  const drinkIds = new Set();
  for (const p of inLunch) {
    if (isDrink(p)) drinkIds.add(String(p.id));
    else if (hasOptions(p)) comboIds.add(String(p.id));
  }

  // Набор → один или несколько наборов (по размерам)
  const metaCombos = [];
  const defs = new Map(); // id продукта → [{ key, id, sizeId, title, ... }]
  for (const p of inLunch) {
    const id = String(p.id);
    if (!comboIds.has(id) || defs.has(id)) continue;
    const iikoName = p.iikoName || p.name;
    const sizes = p.sizes || [];
    const parts = sizes.length > 1
      ? sizes.map((z) => ({ z, key: menuKey(`${iikoName} ${z.name}`), title: z.name || p.name, base: Number(z.price) || 0, groups: z.groups || [], needsChoice: Boolean(z.needsChoice), weight: z.weight }))
      : [{ z: sizes[0] || null, key: menuKey(iikoName), title: p.name, base: Number(p.basePrice ?? p.price) || 0, groups: sizes[0]?.groups || p.modifierGroups || [], needsChoice: Boolean(p.needsChoice || sizes[0]?.needsChoice), weight: null }];
    defs.set(id, parts.map((x, i) => {
      const s = set.combos[x.key];
      const enabled = s ? s.enabled !== false : looksLikeCombo(p) || sizes.length > 1;
      return { ...x, p, i, enabled, title: s?.title || x.title, order: s?.order ?? null, from: lunchFromPrice(x.base, x.groups, x.needsChoice) };
    }));
  }
  for (const parts of defs.values()) for (const c of parts) {
    metaCombos.push({
      key: c.key, title: c.title, iikoName: c.p.iikoName || c.p.name, enabled: c.enabled, order: c.order, price: c.from,
      steps: c.groups.map(stepKey),
    });
  }

  // Шаги и варианты для админки: всё, что есть у наборов, со скрытыми
  const metaSteps = new Map();
  for (const parts of defs.values()) for (const c of parts) for (const g of c.groups) {
    const sk = stepKey(g);
    if (!metaSteps.has(sk)) metaSteps.set(sk, { key: sk, title: g.name, iikoName: g.iikoName || g.name, items: new Map() });
    const st = metaSteps.get(sk);
    for (const [i, m] of (g.items || []).entries()) {
      const ik = itemKey(g, m);
      if (st.items.has(ik)) continue;
      const s = set.items[ik];
      st.items.set(ik, { key: ik, iikoName: m.iikoName || m.name, name: m.name, price: Number(m.price) || 0, image: m.image || null, enabled: s?.enabled !== false, order: s?.order ?? null, pos: i });
    }
  }

  const drinkDefs = inLunch.filter((p) => drinkIds.has(String(p.id)) && !p.isAlias);
  const metaDrinks = [...new Map(drinkDefs.map((p) => [String(p.id), p])).values()].map((p) => {
    const s = set.drinks[menuKey(p.iikoName || p.name)];
    return { key: menuKey(p.iikoName || p.name), iikoName: p.iikoName || p.name, name: p.name, price: Number(p.price) || 0, image: p.image || null, enabled: s?.enabled !== false, order: s?.order ?? null };
  });

  // Блюда каталога: выключенные наборы убираем, у включённых — скрытые варианты, метка lunchCombo (расписание, баннер)
  const outProducts = [];
  const combos = [];
  for (const p of products) {
    const id = String(p.id);
    const parts = defs.get(id);
    if (!parts) { outProducts.push(p); continue; }
    if (!parts.some((c) => c.enabled)) continue;
    const next = { ...p, lunchCombo: true };
    if (p.sizes?.length) next.sizes = p.sizes.map((z) => ({ ...z, groups: shapeGroups(z.groups, set.items) }));
    else next.modifierGroups = shapeGroups(p.modifierGroups, set.items);
    // Набор, у которого скрыли все варианты обязательного шага или все платные, продать нечем
    const dead = (groups, needsChoice) => groups.some((g) => g.min > 0 && !g.items.length)
      || (needsChoice && !groups.some((g) => g.items.some((m) => Number(m.price) > 0)));
    if (next.sizes?.length ? next.sizes.every((z) => dead(z.groups, z.needsChoice)) : dead(next.modifierGroups, next.needsChoice)) next.isInStopList = true;
    outProducts.push(next);
    if (p.isAlias) continue;
    for (const c of parts) {
      if (!c.enabled) continue;
      const z = next.sizes?.length > 1 ? next.sizes[c.i] : null;
      const groupsNow = z ? z.groups : next.sizes?.length ? next.sizes[0].groups : next.modifierGroups;
      combos.push({
        id: z ? `${id}:${z.id}` : id,
        productId: id,
        sizeId: z?.id ? String(z.id) : null,
        title: c.title,
        price: lunchFromPrice(c.base, groupsNow, c.needsChoice),
        // Фиксированная цена набора или «от» (цена складывается из выбранных блюд)
        fixed: lunchFixedPrice(groupsNow),
        base: c.base,
        stopped: Boolean(next.isInStopList),
        order: c.order ?? (Number(p.order) || 0) + c.i * 0.001,
        steps: groupsNow.map(stepOut),
      });
    }
  }
  combos.sort((a, b) => a.order - b.order);

  const drinks = [];
  const seenDrink = new Set();
  for (const p of outProducts) {
    const id = String(p.id);
    if (!drinkIds.has(id) || seenDrink.has(id)) continue;
    seenDrink.add(id);
    const s = set.drinks[menuKey(p.iikoName || p.name)];
    if (s?.enabled === false) continue;
    // Напиток с размерами или обязательным выбором в конструкторе не предлагаем — он есть в разделе бара
    if ((p.sizes || []).length > 1 || (p.modifierGroups || []).some((g) => g.min > 0)) continue;
    drinks.push({
      id, productId: id, name: p.name, price: Number(p.price) || 0, image: p.image || null, weight: p.weight ? String(p.weight).replace(/ г$/, ' мл') : null,
      stopped: Boolean(p.isInStopList), order: s?.order ?? (Number(p.order) || 0),
    });
  }
  drinks.sort((a, b) => a.order - b.order);

  const businessLunch = {
    active: isLunchActive(schedule, now),
    schedule,
    text: scheduleText(schedule),
    nextStart: nextLunchStart(schedule, now),
    combos,
    drinks,
  };
  // Незаметное для JSON поле: расписание для проверки при заказе берётся из каталога
  return {
    products: outProducts,
    businessLunch: combos.length || drinks.length ? businessLunch : null,
    meta: { schedule, combos: metaCombos, steps: [...metaSteps.values()].map((s) => ({ ...s, items: [...s.items.values()] })), drinks: metaDrinks },
  };
}

const metaByRestaurant = new Map(); // restaurantId → meta последней сборки каталога (для админки)

/** Подключение к сборке каталога точки (services/catalog.js): { groups, products } → { products, businessLunch }. */
export async function attachBusinessLunch(restaurant, { groups, products }) {
  let settings;
  try { settings = await loadLunchSettings(restaurant.id); } catch { settings = { ...emptySettings(), schedule: DEFAULT_SCHEDULE }; }
  const res = buildBusinessLunch({ groups, products, settings });
  metaByRestaurant.set(restaurant.id, res.meta);
  return { products: res.products, businessLunch: res.businessLunch };
}

// ── Админка ─────────────────────────────────────────────────────────────────

/**
 * Данные раздела «Бизнес-ланч» в админке по точкам сети. getCatalog(restaurant) — получение каталога
 * (после него мета-данные сборки готовы).
 */
export async function getLunchAdmin(restaurants, getCatalog) {
  const settings = await loadLunchSettings(null);
  const combos = new Map();
  const steps = new Map();
  const drinks = new Map();
  const points = [];
  for (const r of restaurants) {
    await getCatalog(r);
    const own = await loadLunchSettings(r.id);
    const m = metaByRestaurant.get(r.id);
    points.push({
      slug: r.slug, name: r.name, override: own.ownSchedule, hasLunch: Boolean(m?.combos.length || m?.drinks.length),
      active: isLunchActive(own.schedule), nextStart: nextLunchStart(own.schedule), text: scheduleText(own.schedule),
    });
    if (!m) continue;
    for (const c of m.combos) {
      const cur = combos.get(c.key) || { ...c, points: [] };
      cur.points.push(r.slug);
      cur.price = cur.price ? Math.min(cur.price, c.price || cur.price) : c.price;
      combos.set(c.key, cur);
    }
    for (const s of m.steps) {
      const cur = steps.get(s.key) || { ...s, items: [] };
      for (const it of s.items) if (!cur.items.some((x) => x.key === it.key)) cur.items.push(it);
      steps.set(s.key, cur);
    }
    for (const d of m.drinks) if (!drinks.has(d.key)) drinks.set(d.key, d);
  }
  const byOrder = (a, b) => (a.order ?? 1e6) - (b.order ?? 1e6);
  return {
    schedule: settings.networkSchedule,
    text: scheduleText(settings.networkSchedule),
    points,
    combos: [...combos.values()].sort(byOrder),
    steps: [...steps.values()].map((s) => ({ ...s, items: s.items.sort((a, b) => (a.order ?? 1e6 + a.pos) - (b.order ?? 1e6 + b.pos)) })),
    drinks: [...drinks.values()].sort(byOrder),
  };
}

// ── Проверка при заказе ─────────────────────────────────────────────────────

/** Строки заказа, в которых набор бизнес-ланча: вне времени действия — 400. rows — [{ key }] (ID блюда). */
export function assertLunchRows(index, rows, now = new Date()) {
  for (const r of rows || []) {
    const e = index.get(String(r.key));
    if (e?.lunch) assertLunchOpen(e.lunch, now);
  }
}
