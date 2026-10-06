/**
 * Кассы точки: какие терминальные группы iiko есть, на связи ли они и какой раздел меню на какую кассу уходит.
 *
 * Кухня (ИП) — основная касса ресторана (restaurants.terminal_group_id). Крепкий алкоголь (ООО) — касса-источник
 * с split_regex в той же организации iiko: позиции его разделов уходят отдельным заказом на тот же стол.
 * Раздел → касса: выбранная вручную (category_routes), иначе по названию раздела (lib/alco.js).
 */
import pool from '../db/pool.js';
import { accessibleOrgIds, iikoRequest, isIikoDemo, listTerminalGroups } from '../iiko-client.js';
import { alcoRegex, autoRoute } from '../lib/alco.js';
import { httpError } from '../lib/http.js';
import { invalidateCatalogCache } from './catalog.js';
import { saveTerminalGroup } from './waiter.js';

const BAR = 'bar';

async function splitSources(restaurantId, { all = false } = {}) {
  const { rows } = await pool.query(
    `SELECT code, name, terminal_group_id, is_enabled, manual, split_regex FROM restaurant_sources
      WHERE restaurant_id = $1 AND split_regex IS NOT NULL ${all ? '' : 'AND is_enabled'} ORDER BY sort_order, created_at`,
    [restaurantId],
  );
  return rows;
}

/** Терминальные группы организации: на связи ли и открыта ли для облака iiko (includeDisabled). */
async function terminals(organizationId) {
  if (isIikoDemo() || !organizationId) return { list: [], error: null };
  try {
    const allowed = await accessibleOrgIds();
    if (allowed && !allowed.has(organizationId)) return { list: [], error: 'Точка не подключена к ключу iiko' };
    const [list, enabled] = await Promise.all([
      listTerminalGroups(organizationId),
      iikoRequest('/api/1/terminal_groups', { organizationIds: [organizationId], includeDisabled: false })
        .then((d) => new Set((d?.terminalGroups || []).flatMap((g) => g.items || []).map((t) => t.id))),
    ]);
    return { list: list.map((t) => ({ ...t, enabled: enabled.has(t.id) })), error: null };
  } catch (e) {
    return { list: [], error: e.response?.data?.errorDescription || e.message || 'iiko не ответил' };
  }
}

export async function getCashdesks(r) {
  const [tg, splits, sections, manual] = await Promise.all([
    terminals(r.organization_id),
    splitSources(r.id, { all: true }),
    pool.query(
      `SELECT c.id::text AS id, COALESCE(c.name, 'Без раздела') AS name, p.source, COUNT(*)::int AS n, MIN(c.sort_order) AS ord
         FROM products p LEFT JOIN categories c ON c.id = p.category_id
        WHERE p.restaurant_id = $1 AND p.is_published
          AND (p.source = 'main' OR p.source IN (SELECT code FROM restaurant_sources WHERE restaurant_id = $1 AND split_regex IS NOT NULL))
        GROUP BY 1, 2, 3 ORDER BY 5, 2`,
      [r.id],
    ).then((x) => x.rows),
    pool.query('SELECT category_id::text AS id, source FROM category_routes WHERE restaurant_id = $1', [r.id])
      .then((x) => new Map(x.rows.map((m) => [m.id, m.source]))),
  ]);
  const active = splits.filter((s) => s.is_enabled);
  const byId = new Map();
  for (const s of sections) {
    if (!byId.has(s.id)) byId.set(s.id, { id: s.id, name: s.name, products: 0, current: {} });
    const it = byId.get(s.id);
    it.products += s.n;
    it.current[s.source] = s.n;
  }
  const list = [...byId.values()].map((s) => {
    const auto = autoRoute(s.name, active) || 'main';
    const picked = manual.get(s.id);
    return { ...s, auto, manual: picked || null, target: picked && (picked === 'main' || active.some((a) => a.code === picked)) ? picked : auto };
  });
  const roleOf = (id) => (id && id === r.terminal_group_id ? 'main' : splits.find((s) => s.is_enabled && s.terminal_group_id === id)?.code || null);
  return {
    restaurant: { id: r.id, slug: r.slug, name: r.name },
    connected: !tg.error && Boolean(r.organization_id),
    error: tg.error,
    terminals: tg.list.map((t) => ({ id: t.id, name: t.name, alive: t.isAlive, enabled: t.enabled, role: roleOf(t.id) })),
    kitchen: { terminalGroupId: r.terminal_group_id || null },
    bars: splits.map((s) => ({ code: s.code, name: s.name, terminalGroupId: s.terminal_group_id, enabled: s.is_enabled, manual: s.manual })),
    sections: list,
  };
}

async function assertTerminal(r, terminalGroupId) {
  if (isIikoDemo()) return { id: terminalGroupId, name: terminalGroupId };
  const { list, error } = await terminals(r.organization_id);
  if (error) throw httpError(409, error);
  const t = list.find((x) => x.id === terminalGroupId);
  if (!t) throw httpError(400, 'Такой кассы нет в iiko этой точки');
  return t;
}

/** Касса кухни или бара. Бар без кассы (terminalGroupId = null) — алкоголь уходит на кухонную кассу. */
export async function setCashdesk(r, { role, terminalGroupId }) {
  if (role === 'main') {
    if (!terminalGroupId) throw httpError(400, 'Выберите кассу кухни');
    await assertTerminal(r, terminalGroupId);
    if (terminalGroupId !== r.terminal_group_id) await saveTerminalGroup(r.id, 'main', terminalGroupId);
  } else if (role === BAR) {
    if (terminalGroupId) {
      const t = await assertTerminal(r, terminalGroupId);
      if (terminalGroupId === r.terminal_group_id) throw httpError(400, 'Эта касса уже выбрана для кухни');
      await pool.query(
        `INSERT INTO restaurant_sources (restaurant_id, code, name, organization_id, terminal_group_id, creds, is_enabled, sort_order, split_regex, manual)
         VALUES ($1, $2, 'Бар', $3, $4, '', TRUE, 10, $5, TRUE)
         ON CONFLICT (restaurant_id, code) DO UPDATE SET organization_id = EXCLUDED.organization_id, terminal_group_id = EXCLUDED.terminal_group_id,
           creds = '', external_menu_id = NULL, is_enabled = TRUE, manual = TRUE,
           split_regex = COALESCE(restaurant_sources.split_regex, EXCLUDED.split_regex),
           order_creds = NULL, order_organization_id = NULL, order_terminal_group_id = NULL`,
        [r.id, BAR, r.organization_id, terminalGroupId, alcoRegex()],
      );
      await pool.query("DELETE FROM restaurant_table_cache WHERE restaurant_id = $1 AND table_number LIKE 'bar:%'", [r.id]);
      console.log(`касса бара ${r.slug} → ${t.name} [${terminalGroupId}]`);
    } else {
      await pool.query(`UPDATE restaurant_sources SET is_enabled = FALSE, manual = TRUE WHERE restaurant_id = $1 AND code = $2`, [r.id, BAR]);
    }
  } else {
    throw httpError(400, 'Неизвестная касса');
  }
  await applyRoutes(r);
}

/** Раздел меню → касса ('main' | код бара) или null — по названию раздела. */
export async function setSectionRoute(r, { categoryId, target }, staff) {
  if (!/^[0-9a-f-]{36}$/i.test(String(categoryId || ''))) throw httpError(400, 'Нет раздела');
  if (target == null || target === '') {
    await pool.query('DELETE FROM category_routes WHERE restaurant_id = $1 AND category_id = $2', [r.id, categoryId]);
  } else {
    const active = await splitSources(r.id);
    if (target !== 'main' && !active.some((s) => s.code === target)) throw httpError(400, 'Такой кассы у точки нет');
    await pool.query(
      `INSERT INTO category_routes (restaurant_id, category_id, source, updated_by, updated_at) VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (restaurant_id, category_id) DO UPDATE SET source = EXCLUDED.source, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [r.id, categoryId, target, staff?.name || null],
    );
  }
  await applyRoutes(r);
}

/**
 * Пересчитать кассу у позиций меню точки сразу (без новой выгрузки из iiko): позиции из основного меню
 * и барных разделов получают кассу по ручной настройке или по названию раздела.
 */
async function applyRoutes(r) {
  const active = await splitSources(r.id);
  const all = await splitSources(r.id, { all: true });
  const movable = ['main', ...all.map((s) => s.code)];
  const { rows } = await pool.query(
    `SELECT DISTINCT p.category_id::text AS id, c.name, cr.source AS manual
       FROM products p LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN category_routes cr ON cr.restaurant_id = p.restaurant_id AND cr.category_id = p.category_id
      WHERE p.restaurant_id = $1 AND p.source = ANY($2::text[])`,
    [r.id, movable],
  );
  const codes = new Set(['main', ...active.map((s) => s.code)]);
  for (const c of rows) {
    const target = c.manual && codes.has(c.manual) ? c.manual : autoRoute(c.name, active) || 'main';
    await pool.query(
      `UPDATE products SET source = $3 WHERE restaurant_id = $1 AND category_id ${c.id ? '= $2' : 'IS NULL AND $2::text IS NULL'}
         AND source = ANY($4::text[]) AND source <> $3`,
      [r.id, c.id, target, movable],
    );
  }
  invalidateCatalogCache(r.id);
}
