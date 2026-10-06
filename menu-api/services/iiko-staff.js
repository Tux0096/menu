/**
 * Вход сотрудников зала через iiko — как в iikoWaiter: код сотрудника из iiko → сотрудник есть в iiko,
 * не уволен, должность зальная → у него открыта личная смена на кассе одной из наших точек →
 * приложение открывает эту точку. Смена закрылась — доступ закрывается (проверка в staffAuth).
 *
 * Данные — iikoCloud API (тот же ключ, что у меню): /api/employees/v1/employee/list (сотрудники),
 * /api/employees/v1/positions/list (должности), /api/1/employees/shifts/by_courier (кассы, где открыта
 * личная смена) и /api/employees/v1/attendance/list (явки — запасной путь).
 * Код сотрудника — номер карты сотрудника в iiko (iikoCloud не отдаёт PIN-коды).
 * Администраторы и маркетинг входят в админку по логину и паролю, как раньше.
 */
import { randomUUID } from 'crypto';
import pool from '../db/pool.js';
import { accessibleOrgIds, iikoRequest, isIikoDemo, listTerminalGroups } from '../iiko-client.js';
import { createLimiter, httpError, safeEqual } from '../lib/http.js';
import { hashPassword } from '../lib/passwords.js';

/** Включён ли вход по коду из iiko (IIKO_STAFF_LOGIN=on). Иначе — PIN из админки, как раньше. */
export const iikoStaffLoginEnabled = () => process.env.IIKO_STAFF_LOGIN === 'on' && !isIikoDemo();

// Зальные должности (по названию должности в iiko) и кто из них — управляющий зала
const hallRe = () => new RegExp(process.env.IIKO_HALL_ROLES
  || 'официант|менеджер|администратор|хостес|бармен|раннер|сомелье|кассир|управляющ', 'i');
// «Системный администратор» — не зал
const NOT_HALL_RE = /системн/i;
const MANAGER_RE = /менеджер|администратор|управляющ|директор/i;

const byClient = createLimiter({ windowMs: 60_000, max: 5, message: 'Слишком много попыток — подождите минуту' });
const allClients = createLimiter({ windowMs: 10 * 60_000, max: 60, message: 'Слишком много неверных кодов — вход приостановлен на 10 минут' });

// ── Справочники iiko (кэш: сотрудников и должности меняют редко) ─────────────
const CACHE_MS = 5 * 60_000;
let employeesCache = null;
let positionsCache = null;

async function listAll(path, body, pageSize = 500) {
  const items = [];
  for (let offset = 0; offset < 20_000; offset += pageSize) {
    const d = await iikoRequest(path, { ...body, limit: pageSize, offset });
    items.push(...(d?.items || []));
    if (!d?.items?.length || items.length >= (d.totalCount ?? 0)) break;
  }
  return items;
}

export async function iikoEmployees({ force = false } = {}) {
  if (!force && employeesCache && Date.now() - employeesCache.at < CACHE_MS) return employeesCache.list;
  const list = await listAll('/api/employees/v1/employee/list', {
    fields: ['id', 'name', 'firstName', 'lastName', 'cardNumber', 'mainRoleId', 'roleIds', 'isFired', 'isSystem', 'organizationIds'],
  });
  employeesCache = { list, at: Date.now() };
  return list;
}

export async function iikoPositions({ force = false } = {}) {
  if (!force && positionsCache && Date.now() - positionsCache.at < CACHE_MS) return positionsCache.map;
  const items = await listAll('/api/employees/v1/positions/list', {}, 1000);
  const map = new Map(items.map((p) => [String(p.id), p]));
  positionsCache = { map, at: Date.now() };
  return map;
}

const employeeName = (e) => String(e.name || [e.lastName, e.firstName].filter(Boolean).join(' ') || 'Сотрудник').slice(0, 200);

/** Должности сотрудника (названия) и роль в приложении: manager / waiter, или null — не зал. */
export function hallRole(e, positions) {
  const names = [e.mainRoleId, ...(e.roleIds || [])].filter(Boolean)
    .map((id) => positions.get(String(id))?.name).filter(Boolean);
  const hall = names.filter((n) => hallRe().test(n) && !NOT_HALL_RE.test(n));
  if (!hall.length) return { role: null, names };
  return { role: hall.some((n) => MANAGER_RE.test(n)) ? 'manager' : 'waiter', names };
}

// ── Где у сотрудника открыта смена ───────────────────────────────────────────
/** Наши рестораны с кассами iiko: terminalGroupId → ресторан (только точки, подключённые к ключу). */
let terminalsCache = null;
async function restaurantsByTerminal() {
  if (terminalsCache && Date.now() - terminalsCache.at < 10 * 60_000) return terminalsCache.value;
  const value = await loadRestaurantsByTerminal();
  terminalsCache = { value, at: Date.now() };
  return value;
}
async function loadRestaurantsByTerminal() {
  const { rows } = await pool.query('SELECT id, slug, name, organization_id FROM restaurants WHERE is_disabled = FALSE AND organization_id IS NOT NULL');
  const allowed = await accessibleOrgIds().catch(() => null);
  const map = new Map();
  for (const r of rows) {
    if (allowed && !allowed.has(r.organization_id)) continue;
    const tgs = await listTerminalGroups(r.organization_id).catch(() => []);
    for (const t of tgs) map.set(String(t.id), r);
  }
  return { map, restaurants: rows.filter((r) => !allowed || allowed.has(r.organization_id)) };
}

/** Точки, где у сотрудника сейчас открыта личная смена на кассе (или открытая явка в iiko). */
export async function openShiftRestaurants(employeeId) {
  const { map, restaurants } = await restaurantsByTerminal();
  const found = new Map();
  try {
    const d = await iikoRequest('/api/1/employees/shifts/by_courier', { employeeId });
    for (const tg of d?.terminalGroupIds || []) {
      const r = map.get(String(tg));
      if (r) found.set(r.id, r);
    }
  } catch { /* запасной путь — явки */ }
  if (!found.size) {
    for (const r of restaurants) {
      try {
        const d = await iikoRequest('/api/employees/v1/attendance/list', {
          organizationId: r.organization_id, employeeIds: [employeeId], isClosed: false, limit: 10, offset: 0,
          startAt: new Date(Date.now() - 36 * 3600_000).toISOString(), // обязательное поле: смены за последние сутки с запасом
        });
        if ((d?.items || []).some((a) => !a.isClosed && !a.endAt)) found.set(r.id, r);
      } catch { /* нет доступа к явкам — только личные смены */ }
    }
  }
  return [...found.values()];
}

// ── Вход ─────────────────────────────────────────────────────────────────────
/**
 * Вход по коду сотрудника из iiko. restaurant — выбор точки, если смена открыта сразу на нескольких.
 * Возвращает { token-готовый staff } — токен выпускает staff-auth.
 */
export async function iikoStaffLogin(code, clientKey = '', restaurant = null) {
  const value = String(code || '').trim();
  if (!/^[0-9A-Za-z]{3,32}$/.test(value)) throw httpError(400, 'Введите код сотрудника из iiko');
  byClient.assert(clientKey);
  allClients.assert('all');
  const [list, positions] = await Promise.all([iikoEmployees(), iikoPositions()]);
  const e = list.find((x) => !x.isFired && !x.isSystem && x.cardNumber && safeEqual(String(x.cardNumber).trim(), value));
  if (!e) {
    byClient.hit(clientKey);
    allClients.hit('all');
    throw httpError(401, 'Неверный код или сотрудник не найден в iiko');
  }
  const { role, names } = hallRole(e, positions);
  if (!role) throw httpError(403, `Приложение — для сотрудников зала. Ваша должность в iiko: ${names.join(', ') || 'не указана'}`);
  const open = await openShiftRestaurants(e.id);
  if (!open.length) {
    throw httpError(403, 'Смена не открыта. Откройте личную смену на кассе iiko и войдите снова', { code: 'SHIFT_CLOSED' });
  }
  let r = open[0];
  if (open.length > 1) {
    r = open.find((x) => x.slug === restaurant || x.id === restaurant);
    if (!r) {
      throw httpError(409, 'Смена открыта на нескольких точках — выберите, где работаете', {
        code: 'CHOOSE_RESTAURANT', details: { restaurants: open.map((x) => ({ slug: x.slug, name: x.name })) },
      });
    }
  }
  // Сотрудник в нашей базе — по ID из iiko; пароля нет (вход только через iiko)
  const name = employeeName(e);
  const { rows } = await pool.query(
    `INSERT INTO staff_users (login, name, role, restaurant_id, password_hash, is_active, iiko_employee_id)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6)
     ON CONFLICT (iiko_employee_id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role,
       restaurant_id = EXCLUDED.restaurant_id, is_active = TRUE
     RETURNING *`,
    [`iiko:${e.id}`, name, role, r.id, hashPassword(randomUUID()), e.id],
  );
  shiftCache.set(rows[0].id, { open: true, at: Date.now(), ok: Date.now() });
  return { row: rows[0], restaurant: r };
}

// ── Смена закрылась — доступ закрывается ─────────────────────────────────────
const SHIFT_CHECK_MS = 3 * 60_000;
const SHIFT_GRACE_MS = 30 * 60_000; // iiko недоступен — не выкидываем официанта посреди смены
const shiftCache = new Map(); // staffId → { open, at, ok }

/** Открыта ли ещё смена у сотрудника, вошедшего через iiko, на его точке. */
export async function iikoShiftStillOpen(row) {
  if (!row.iiko_employee_id) return true;
  const hit = shiftCache.get(row.id);
  if (hit && Date.now() - hit.at < SHIFT_CHECK_MS) return hit.open;
  try {
    const open = (await openShiftRestaurants(row.iiko_employee_id)).some((r) => r.id === row.restaurant_id);
    shiftCache.set(row.id, { open, at: Date.now(), ok: open ? Date.now() : hit?.ok || 0 });
    return open;
  } catch {
    const open = Boolean(hit?.ok && Date.now() - hit.ok < SHIFT_GRACE_MS);
    shiftCache.set(row.id, { open, at: Date.now(), ok: hit?.ok || 0 });
    return open;
  }
}
