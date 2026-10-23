/**
 * Вход персонала на of. по табельному номеру iiko из базы «Фуджи Тим» (Postgres, доступ только на чтение).
 * В iiko при входе не ходим вовсе — ни за списком сотрудников, ни за сменой: лимит запросов ключа iiko на вход не влияет.
 *
 * Настройка:
 *   FUJI_TEAM_DATABASE_URL — postgres://логин:пароль@хост:порт/база (пользователь только на чтение). Только на сервере:
 *     GitHub Secret FUJI_TEAM_DATABASE_URL → деплой кладёт в .env base64 (FUJI_TEAM_DATABASE_URL_B64); в репозиторий не попадает.
 *   Запрос сотрудников — в админке («Фуджи Тим», хранится в settings) или FUJI_TEAM_STAFF_QUERY; колонки (псевдонимы):
 *       code       — табельный номер iiko (обязательно)
 *       name       — ФИО: его видит гость («Ваш официант — Анна») и коллеги
 *       position   — должность: официант → waiter, администратор/менеджер → manager (lib/iiko-roles.js)
 *       restaurant — точка (название или slug; пусто — сотрудник выбирает точку при входе)
 *       active     — работает ли (false — уволен; колонки нет — считаем, что работает)
 *   FUJI_TEAM_SSL=true — подключение по SSL с проверкой сертификата; FUJI_TEAM_SSL=insecure — по SSL без проверки (самоподписанный)
 */
import pg from 'pg';
import { randomUUID } from 'crypto';
import pool from '../db/pool.js';
import { createLimiter, httpError } from '../lib/http.js';
import { hashPassword } from '../lib/passwords.js';
import { roleForPositions } from '../lib/iiko-roles.js';
import { matchRestaurant, normalizeCode, suggestStaffQuery } from '../lib/fuji-team.js';

const SETTING = 'fuji_team';
export function teamDatabaseUrl() {
  if (process.env.FUJI_TEAM_DATABASE_URL) return process.env.FUJI_TEAM_DATABASE_URL;
  const b64 = process.env.FUJI_TEAM_DATABASE_URL_B64;
  return b64 ? Buffer.from(b64, 'base64').toString('utf8').trim() : '';
}
// Запрос из админки (settings) важнее env; держим в памяти, перечитываем при сохранении
let savedQuery = null;
export async function loadTeamSettings() {
  try {
    const { rows } = await pool.query('SELECT value FROM settings WHERE name = $1', [SETTING]);
    savedQuery = String(rows[0]?.value?.query || '').trim() || null;
  } catch { /* таблицы ещё нет — только env */ }
  return { query: savedQuery };
}
export const teamQuery = () => savedQuery || String(process.env.FUJI_TEAM_STAFF_QUERY || '').trim() || '';
export const fujiTeamEnabled = () => Boolean(teamDatabaseUrl() && teamQuery());

export function teamSsl(value = process.env.FUJI_TEAM_SSL) {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'true') return { rejectUnauthorized: true };
  if (v === 'insecure') return { rejectUnauthorized: false };
  return undefined;
}

/** Фамилия И. — полное ФИО из базы сотрудников в админке не показываем */
export function maskName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[1][0].toUpperCase()}.`;
}

/** Причина сбоя подключения без текста ошибки базы (в нём бывают хосты и логины) */
export function teamErrorKind(e) {
  const m = `${e?.code || ''} ${e?.message || ''}`.toLowerCase();
  if (e?.code === '28P01' || e?.code === '28000' || /password|authentication/.test(m)) return 'неверный пароль';
  if (/ssl|tls|certificate|self[- ]signed|cert_|unable to verify/.test(m)) return 'ошибка SSL';
  return 'нет связи';
}

let teamDb = null;
function db() {
  if (!teamDatabaseUrl()) throw httpError(503, 'База «Фуджи Тим» не подключена: нет FUJI_TEAM_DATABASE_URL на сервере');
  teamDb ||= new pg.Pool({
    connectionString: teamDatabaseUrl(),
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    ssl: teamSsl(),
  });
  teamDb.on('error', (e) => console.warn('«Фуджи Тим»: соединение —', e.message));
  return teamDb;
}

// Список сотрудников небольшой — держим 5 минут; база недоступна — входим по прежнему списку
const CACHE_MS = 5 * 60_000;
let cache = null;
let loading = null;
export async function teamStaff({ force = false } = {}) {
  if (!force && cache && Date.now() - cache.at < CACHE_MS) return cache.list;
  loading ||= runStaffQuery(teamQuery())
    .then((rows) => {
      const list = rows.map((r) => ({
        code: normalizeCode(r.code),
        name: String(r.name || '').trim().slice(0, 200),
        position: String(r.position || '').trim().slice(0, 200),
        restaurant: String(r.restaurant || '').trim(),
        active: r.active === undefined || r.active === null ? true : Boolean(r.active),
      })).filter((r) => r.code);
      cache = { list, at: Date.now() };
      return list;
    })
    .finally(() => { loading = null; });
  try {
    return await loading;
  } catch (e) {
    console.warn('«Фуджи Тим»: список сотрудников —', e.message);
    if (cache) return cache.list;
    throw httpError(503, 'База сотрудников «Фуджи Тим» недоступна — попробуйте через минуту');
  }
}

/** Запрос сотрудников — только чтение: одна инструкция SELECT/WITH, транзакция READ ONLY, не больше 20 000 строк. */
async function runStaffQuery(sql) {
  const q = String(sql || '').trim().replace(/;+\s*$/, '');
  if (!/^(select|with)\b/i.test(q) || q.includes(';')) throw httpError(400, 'Запрос сотрудников — один SELECT');
  const client = await db().connect();
  try {
    await client.query('BEGIN TRANSACTION READ ONLY');
    const { rows } = await client.query(`SELECT * FROM (${q}) t LIMIT 20000`);
    return rows;
  } finally {
    await client.query('ROLLBACK').catch(() => {});
    client.release();
  }
}

/** Структура базы для админки: таблицы и колонки (без данных) + примерное число строк. */
export async function teamSchema() {
  const { rows } = await db().query(
    `SELECT c.table_schema, c.table_name, c.column_name, c.data_type
     FROM information_schema.columns c
     WHERE c.table_schema NOT IN ('pg_catalog', 'information_schema')
     ORDER BY c.table_schema, c.table_name, c.ordinal_position`,
  );
  const tables = new Map();
  for (const r of rows) {
    const key = `${r.table_schema}.${r.table_name}`;
    if (!tables.has(key)) tables.set(key, { schema: r.table_schema, name: r.table_name, columns: [] });
    tables.get(key).columns.push({ name: r.column_name, type: r.data_type });
  }
  const list = [...tables.values()].slice(0, 300);
  return { tables: list, suggestion: suggestStaffQuery(list) };
}

/** Проверка запроса из админки: сколько сотрудников, роли, точки и 5 примеров (табельный — в маске). */
export async function testStaffQuery(sql) {
  const rows = await runStaffQuery(sql);
  if (rows.length && !('code' in rows[0])) throw httpError(400, 'В запросе нет колонки code (табельный номер) — добавьте «… AS code»');
  const { rows: rests } = await pool.query('SELECT id, slug, name FROM restaurants WHERE is_disabled = FALSE');
  const staff = rows.map((r) => ({
    code: normalizeCode(r.code), name: String(r.name || '').trim(), position: String(r.position || '').trim(),
    restaurant: String(r.restaurant || '').trim(), active: r.active === undefined || r.active === null ? true : Boolean(r.active),
  })).filter((r) => r.code);
  const active = staff.filter((r) => r.active);
  const roles = { waiter: 0, manager: 0, none: 0 };
  const points = new Map();
  for (const r of active) {
    roles[roleForPositions([r.position]) || 'none'] += 1;
    const m = matchRestaurant(rests, r.restaurant);
    const k = m ? m.name : r.restaurant ? `не найдена: ${r.restaurant}` : 'точка не указана';
    points.set(k, (points.get(k) || 0) + 1);
  }
  const dup = active.length - new Set(active.map((r) => r.code)).size;
  return {
    total: staff.length, active: active.length, duplicates: dup, roles,
    points: [...points.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    sample: active.slice(0, 5).map((r) => ({
      code: r.code.length > 2 ? `${r.code.slice(0, -2).replace(/./g, '•')}${r.code.slice(-2)}` : '••',
      name: maskName(r.name), position: r.position, restaurant: r.restaurant,
    })),
  };
}

export async function saveStaffQuery(sql) {
  const q = String(sql || '').trim();
  if (q) await testStaffQuery(q); // не сохраняем неработающий запрос
  await pool.query(
    `INSERT INTO settings (name, value, updated_at) VALUES ($1, $2, NOW())
     ON CONFLICT (name) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [SETTING, { query: q }],
  );
  savedQuery = q || null;
  cache = null;
  return { query: q };
}

export async function teamStatus() {
  const url = teamDatabaseUrl();
  let connected = false; let error = null;
  if (url) {
    try { await db().query('SELECT 1'); connected = true; } catch (e) { error = teamErrorKind(e); console.warn('«Фуджи Тим»: проверка подключения —', e.message); }
  }
  let host = '';
  try { host = url ? new URL(url).host : ''; } catch { /* неверная строка подключения */ }
  return { configured: Boolean(url), host, connected, error, query: teamQuery(), queryFromEnv: !savedQuery && Boolean(process.env.FUJI_TEAM_STAFF_QUERY), enabled: fujiTeamEnabled() };
}

const byClient = createLimiter({ windowMs: 60_000, max: 5, message: 'Слишком много попыток — подождите минуту' });
const allClients = createLimiter({ windowMs: 10 * 60_000, max: 60, message: 'Слишком много неверных кодов — вход приостановлен на 10 минут' });

/**
 * Вход по табельному: сотрудник есть в «Фуджи Тим», работает, должность зальная → точка из «Фуджи Тим»
 * (не нашлась — сотрудник выбирает её сам). Смену в iiko не проверяем.
 */
export async function fujiTeamStaffLogin(code, clientKey = '', restaurant = null) {
  const value = normalizeCode(code);
  if (!value || !/^[0-9A-Za-z]{1,32}$/.test(value)) throw httpError(400, 'Введите табельный номер');
  byClient.assert(clientKey);
  allClients.assert('all');
  const e = (await teamStaff()).find((x) => x.code === value && x.active);
  if (!e) {
    byClient.hit(clientKey);
    allClients.hit('all');
    throw httpError(401, 'Табельный номер не найден', { code: 'INVALID_CODE' });
  }
  const role = roleForPositions([e.position]);
  if (!role) throw httpError(403, `Должность не зальная («${e.position || 'не указана'}»). Администраторы админки входят по логину и паролю`, { code: 'NOT_HALL' });

  const { rows: rests } = await pool.query('SELECT id, slug, name FROM restaurants WHERE is_disabled = FALSE ORDER BY sort_order, name');
  let r = matchRestaurant(rests, e.restaurant);
  if (!r) {
    r = rests.find((x) => x.slug === restaurant || x.id === restaurant) || null;
    if (!r) {
      throw httpError(409, 'Выберите точку, где вы сегодня работаете', {
        code: 'CHOOSE_RESTAURANT', details: { restaurants: rests.map((x) => ({ slug: x.slug, name: x.name })) },
      });
    }
  }
  // Сотрудник в нашей базе — по табельному; пароля нет (вход только по табельному)
  // Запрет входа, выставленный в админке, новый вход не снимает
  const { rows } = await pool.query(
    `INSERT INTO staff_users (login, name, role, restaurant_id, password_hash, is_active, team_code, iiko_position, last_login_at)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, NOW())
     ON CONFLICT (team_code) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role,
       restaurant_id = EXCLUDED.restaurant_id, iiko_position = EXCLUDED.iiko_position, last_login_at = NOW()
     RETURNING *`,
    [`team:${value}`, e.name || `Сотрудник ${value}`, role, r.id, hashPassword(randomUUID()), value, e.position || null],
  );
  if (!rows[0].is_active) throw httpError(403, 'Вход отключён администратором', { code: 'DISABLED' });
  byClient.reset?.(clientKey);
  return { row: rows[0], restaurant: r };
}
