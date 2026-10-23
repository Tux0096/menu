/**
 * Ожидание БД перед стартом API (systemd ExecStartPre): пробуем SELECT 1 раз в секунду до 60 секунд.
 *   node db/wait-db.js          — выходит с кодом 0, как только БД ответила; 1 — не дождались
 * Postgres в Docker поднимается после системы, и API без этого падал бы и перезапускался с ошибками в журнале.
 */
import 'dotenv/config';
import pg from 'pg';

const SECONDS = Number(process.env.WAIT_DB_SECONDS || 60);
const DEADLINE = Date.now() + SECONDS * 1000;
let lastError = '';

while (Date.now() < DEADLINE) {
  const client = new pg.Client({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: 'postgres', // рабочая БД может быть ещё не создана (первый запуск) — сервер Postgres жив и так
    connectionTimeoutMillis: 3000,
  });
  try {
    await client.connect();
    await client.query('SELECT 1');
    await client.end();
    console.log('БД отвечает');
    process.exit(0);
  } catch (e) {
    lastError = e.message;
    await client.end().catch(() => {});
    await new Promise((r) => setTimeout(r, 1000));
  }
}
console.error(`БД не ответила за ${SECONDS} с: ${lastError}`);
process.exit(1);
