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
import { categoryKey, menuKey } from '../lib/menu-key.js';
import { bumpCatalogVersion } from '../lib/catalog-version.js';
import { httpError } from '../lib/http.js';
import {
  assertLunchOpen, isLunchActive, nextLunchStart, normalizeSchedule, scheduleText, validateSchedule, DEFAULT_SCHEDULE,
} from '../lib/lunch-schedule.js';

const NETWORK = 'network';
const LUNCH_SECTION = /бизнес ланч/;
const COMBO_NAME = /ланч|набор|сет/i;

// ── Настройки ───────────────────────────────────────────────────────────────

const emptySettings = () => ({ schedule: null, combos: {}, items: {}, drinks: {}, placement: null });

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
  // Часовой пояс точки — запасной для расписания без своего пояса
  let tz = DEFAULT_SCHEDULE.tz;
  if (restaurantId) {
    try { tz = (await pool.query('SELECT timezone FROM restaurants WHERE id = $1', [restaurantId])).rows[0]?.timezone || tz; } catch { /* колонки ещё нет */ }
  }
  return {
    ...emptySettings(), ...net,
    schedule: normalizeSchedule(own.schedule || net.schedule || DEFAULT_SCHEDULE, tz),
    networkSchedule: normalizeSchedule(net.schedule || DEFAULT_SCHEDULE),
    ownSchedule: own.schedule ? normalizeSchedule(own.schedule, tz) : null,
    timezone: tz,
  };
}

/** Часовой пояс точки — тот же, что у расписания бизнес-ланча (своё время точки или общее; по умолчанию Самара). */
export async function pointTimezone(restaurantId) {
  try { return (await loadLunchSettings(restaurantId)).schedule.tz; } catch { return DEFAULT_SCHEDULE.tz; }
}

const clean = (v, n = 120) => String(v ?? '').trim().slice(0, n);
const imageUrl = (v) => {
  const u = String(v ?? '').trim();
  if (!u) return '';
  if (!/^(\/media\/|https:\/\/)/.test(u)) throw httpError(400, 'Фото — загруженный файл или ссылка https://');
  return u.slice(0, 500);
};

/**
 * Где в меню показывать карточку бизнес-ланча: раздел (ключ categoryKey) и место в нём —
 * первой, последней или порядковым номером. null — как по умолчанию (в разделе «Бизнес-ланч», первой).
 */
export function normalizePlacement(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const category = clean(raw.category, 200);
  if (!category) return null;
  const position = ['first', 'last', 'index'].includes(raw.position) ? raw.position : 'first';
  const index = Math.min(99, Math.max(1, Math.floor(Number(raw.index)) || 1));
  return position === 'index' ? { category, position, index } : { category, position };
}
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
  // Обложка позиции «Бизнес-ланч» в меню (пусто — фото первого набора)
  if (body.image !== undefined) data.image = body.image ? String(body.image).slice(0, 500) : null;
  if (body.placement !== undefined) data.placement = normalizePlacement(body.placement);
  // Набор: своё название, фото, описание и вес — главнее iiko (пусто — как в iiko)
  if (body.combos) {
    data.combos = cleanMap(body.combos, (v) => ({
      enabled: v.enabled !== false, title: clean(v.title), order: num(v.order),
      image: imageUrl(v.image), description: clean(v.description, 300), weight: clean(v.weight, 30),
    }));
  }
  if (body.items) data.items = cleanMap(body.items, (v) => ({ enabled: v.enabled !== false, order: num(v.order) }));
  if (body.drinks) data.drinks = cleanMap(body.drinks, (v) => ({ enabled: v.enabled !== false, order: num(v.order) }));
  await pool.query(
    `INSERT INTO business_lunch_settings (scope, data, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (scope) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [NETWORK, JSON.stringify(data)],
  );
  if (Array.isArray(body.content)) await saveStepContent(body.content);
  if (body.overrides && typeof body.overrides === 'object') {
    for (const r of restaurants) {
      if (!(r.slug in body.overrides)) continue;
      const sch = body.overrides[r.slug];
      if (!sch) await pool.query('DELETE FROM business_lunch_settings WHERE scope = $1', [r.id]);
      else {
        await pool.query(
          `INSERT INTO business_lunch_settings (scope, data, updated_at) VALUES ($1, $2, NOW())
           ON CONFLICT (scope) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
          [r.id, JSON.stringify({ schedule: validateSchedule(sch, r.timezone || DEFAULT_SCHEDULE.tz) })],
        );
      }
    }
  }
  bumpCatalogVersion(); // каталоги собираются заново — правки видны сразу
  return { ok: true };
}

/**
 * Свои название, описание и вес блюд шагов — в той же таблице, что «Модификаторы» (modifier_content, по названию в iiko):
 * админка главнее iiko, выгрузка не затирает. Фото сохраняются отдельным запросом, здесь не трогаются.
 * Пустое поле — «как в iiko». items: [{ iikoName, title, description, weight }]
 */
export async function saveStepContent(items) {
  let saved = 0;
  for (const x of (Array.isArray(items) ? items : []).slice(0, 2000)) {
    const name = clean(x?.iikoName, 200);
    const key = menuKey(name).slice(0, 200);
    if (!key) continue;
    await pool.query(
      `INSERT INTO modifier_content (kind, key, name, title, description, weight, updated_at) VALUES ('item', $1, $2, $3, $4, $5, NOW())
       ON CONFLICT (kind, key) DO UPDATE SET name = EXCLUDED.name, title = EXCLUDED.title, description = EXCLUDED.description,
         weight = EXCLUDED.weight, updated_at = NOW()`,
      [key, name, clean(x.title) || null, clean(x.description, 500) || null, clean(x.weight, 30) || null],
    );
    saved += 1;
  }
  return { saved };
}

// ── Каталог ─────────────────────────────────────────────────────────────────

const stepKey = (g) => menuKey(g.iikoName || g.name);
const itemKey = (g, m) => `${stepKey(g)}|${menuKey(m.iikoName || m.name)}`;
// Вес из iiko — число (граммы), своё в админке — текст как есть («250 г», «2 шт.»)
const weightText = (w) => {
  const v = String(w ?? '').trim();
  if (!v || v === '0') return null;
  return /^\d+([.,]\d+)?$/.test(v) ? `${v} г` : v;
};

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
// Служебные пометки iiko в названиях ланча: «Блюдо Суп + Горячее», «Крем-суп грибной (ланч)», «Супы(ланч)»
export const lunchText = (t) => String(t || '').replace(/\s*\((бизнес[- ]?)?ланч\)/gi, '').replace(/^блюдо\s+/i, '').replace(/\s+/g, ' ').trim();
// Шаги в одном порядке во всех наборах: салат или ролл → суп → горячее → остальное
const STEP_RANK = [/салат|ролл/i, /суп/i, /горяч/i];
const stepRank = (name) => { const i = STEP_RANK.findIndex((re) => re.test(name || '')); return i < 0 ? STEP_RANK.length : i; };

function shapeGroups(groups, items) {
  return (groups || []).map((g, gi) => {
    const list = (g.items || []).map((m, i) => ({ m, i, s: items[itemKey(g, m)] }))
      .filter((x) => x.s?.enabled !== false)
      .sort((a, b) => (a.s?.order ?? 1e6 + a.i) - (b.s?.order ?? 1e6 + b.i))
      .map((x) => ({ ...x.m, name: lunchText(x.m.name) }));
    return { ...g, name: lunchText(g.name), items: list, gi };
  }).sort((a, b) => stepRank(a.name) - stepRank(b.name) || a.gi - b.gi).map(({ gi, ...g }) => g);
}

const stepOut = (g) => ({
  groupId: g.id || null,
  title: g.name,
  min: g.min || 0,
  max: g.max || 0,
  free: g.free || 0,
  items: g.items.map((m) => ({
    id: m.id, name: m.name, price: Number(m.price) || 0, image: m.image || null, weight: weightText(m.weight), description: m.description || '',
    max: m.max || 0, def: m.def || 0,
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
      ? sizes.map((z) => ({ z, key: menuKey(`${iikoName} ${z.name}`), title: lunchText(z.name || p.name), base: Number(z.price) || 0, groups: z.groups || [], needsChoice: Boolean(z.needsChoice), weight: z.weight }))
      : [{ z: sizes[0] || null, key: menuKey(iikoName), title: lunchText(p.name), base: Number(p.basePrice ?? p.price) || 0, groups: sizes[0]?.groups || p.modifierGroups || [], needsChoice: Boolean(p.needsChoice || sizes[0]?.needsChoice), weight: null }];
    defs.set(id, parts.map((x, i) => {
      const s = set.combos[x.key];
      const enabled = s ? s.enabled !== false : looksLikeCombo(p) || sizes.length > 1;
      return {
        ...x, p, i, enabled, auto: x.title, custom: s?.title || '', title: s?.title || x.title, order: s?.order ?? null, from: lunchFromPrice(x.base, x.groups, x.needsChoice),
        image: s?.image || '', description: s?.description || '', ownWeight: s?.weight || '',
      };
    }));
  }
  for (const parts of defs.values()) for (const c of parts) {
    metaCombos.push({
      key: c.key, title: c.title, auto: c.auto, custom: c.custom, iikoName: c.p.iikoName || c.p.name, enabled: c.enabled, order: c.order, price: c.from,
      image: c.image, iikoImage: c.p.image || null, description: c.description, weight: c.ownWeight, iikoWeight: weightText(c.weight ?? c.p.weight),
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
      st.items.set(ik, {
        key: ik, iikoName: m.iikoName || m.name, name: m.name, price: Number(m.price) || 0, image: m.image || null, enabled: s?.enabled !== false, order: s?.order ?? null, pos: i,
        // Своё название/описание/вес из админки (пусто — как в iiko); auto — название без служебных пометок
        auto: lunchText(m.autoName || m.name), custom: m.own?.title || '', description: m.own?.description || '', weight: m.own?.weight || '',
        iikoWeight: weightText(m.own?.weight ? m.iikoWeight : m.weight),
      });
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
        // Фото, описание и вес набора: свои из админки главнее iiko
        image: c.image || p.image || null,
        description: c.description || '',
        weight: weightText(c.ownWeight || c.weight || p.weight),
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
    // Одна позиция «Бизнес-ланч» в меню: обложка из админки или фото первого набора
    image: set.image || combos.map((c) => products.find((p) => String(p.id) === String(c.productId))?.image).find(Boolean) || null,
    placement: resolvePlacement(set.placement, groups),
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

/** Место карточки ланча для гостя: { groupId, position, index } по разделу точки; нет такого раздела — null (по умолчанию). */
export function resolvePlacement(placement, groups) {
  const pl = normalizePlacement(placement);
  if (!pl) return null;
  const g = (groups || []).find((x) => categoryKey(x.iikoName || x.name, x.barSource) === pl.category);
  return g ? { groupId: String(g.id), position: pl.position, ...(pl.index ? { index: pl.index } : {}) } : null;
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
    image: settings.image || null,
    placement: normalizePlacement(settings.placement),
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
