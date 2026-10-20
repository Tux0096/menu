/**
 * Вход персонала на of. по табельному номеру iiko из базы «Фуджи Тим» (Postgres, доступ только на чтение).
 * В iiko при входе не ходим вовсе — ни за списком сотрудников, ни за сменой: лимит запросов ключа iiko на вход не влияет.
 *
 * Настройка (только на сервере, в .env; в репозиторий не попадает):
 *   FUJI_TEAM_DATABASE_URL — postgres://логин:пароль@хост:порт/база (пользователь только на чтение)
 *   FUJI_TEAM_STAFF_QUERY  — SELECT сотрудников, колонки (псевдонимы):
 *       code       — табельный номер iiko (обязательно)
 *       name       — ФИО: его видит гость («Ваш официант — Анна») и коллеги
 *       position   — должность: официант → waiter, администратор/менеджер → manager (lib/iiko-roles.js)
 *       restaurant — точка (название или slug; пусто — сотрудник выбирает точку при входе)
 *       active     — работает ли (false — уволен; колонки нет — считаем, что работает)
 *   FUJI_TEAM_SSL=true — подключение по SSL (без проверки сертификата)
 */
import pg from 'pg';
import { randomUUID } from 'crypto';
import pool from '../db/pool.js';
import { createLimiter, httpError } from '../lib/http.js';
import { hashPassword } from '../lib/passwords.js';
import { roleForPositions } from '../lib/iiko-roles.js';
import { matchRestaurant, normalizeCode } from '../lib/fuji-team.js';

export const fujiTeamEnabled = () => Boolean(process.env.FUJI_TEAM_DATABASE_URL && process.env.FUJI_TEAM_STAFF_QUERY);

let teamDb = null;
function db() {
  teamDb ||= new pg.Pool({
    connectionString: process.env.FUJI_TEAM_DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    statement_timeout: 10_000,
    ssl: process.env.FUJI_TEAM_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
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
  loading ||= db().query(process.env.FUJI_TEAM_STAFF_QUERY)
    .then(({ rows }) => {
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
