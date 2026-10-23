-- Откат релиза «эксплуатация и данные» (бэкапы, schema_steps, TIMESTAMPTZ, индексы, лимит ИИ в БД, пояс точки).
-- ПЕРЕД запуском: bash deploy/backup.sh --pre-deploy. Запуск: psql -v ON_ERROR_STOP=1 -f 2026-10-ops-hardening.down.sql
-- Данные в удаляемых таблицах/колонках пропадают безвозвратно.
BEGIN;

-- Индексы (старый код работает и без них, только медленнее)
DROP INDEX IF EXISTS idx_table_sessions_guest;
DROP INDEX IF EXISTS idx_table_order_items_guest;
DROP INDEX IF EXISTS idx_guests_fuji_user;
DROP INDEX IF EXISTS idx_guest_push_guest;
DROP INDEX IF EXISTS idx_table_sessions_restaurant_created;
DROP INDEX IF EXISTS idx_visit_feedback_created;
DROP INDEX IF EXISTS idx_table_sessions_iiko_order;
DROP INDEX IF EXISTS idx_table_order_items_iiko_order;
DROP INDEX IF EXISTS idx_table_sessions_iiko_orders_gin;

-- Дневной счётчик запросов к LLM (старый код считает в памяти процесса)
DROP TABLE IF EXISTS ai_llm_usage;

-- Часовой пояс точки (старый код берёт пояс из расписания/правил или Europe/Samara)
ALTER TABLE restaurants DROP COLUMN IF EXISTS timezone;

-- Журнал однократных шагов: после удаления следующий деплой выполнит деструктивные шаги заново
-- (они идемпотентны, но перепишут данные — оставьте таблицу, если не уверены)
DROP TABLE IF EXISTS schema_steps;

COMMIT;

-- ── Возврат TIMESTAMPTZ → TIMESTAMP (обычно НЕ нужен: старый код с timestamptz работает) ─────────────────────────
-- Значения переводятся обратно в «наивное» время часового пояса сервера БД. Раскомментируйте и выполните отдельно.
-- Внимание: после этого migrate.js нового кода (шаг timestamptz_v1) снова конвертирует колонки, если строки нет в schema_steps.
-- BEGIN;
-- ALTER TABLE cities ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE restaurants ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE categories ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE products ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE settings ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE restaurant_table_cache ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_sessions ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_sessions ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_order_items ALTER COLUMN created_at TYPE TIMESTAMP USING created_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_order_items ALTER COLUMN updated_at TYPE TIMESTAMP USING updated_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_order_items ALTER COLUMN ready_notified_at TYPE TIMESTAMP USING ready_notified_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_order_items ALTER COLUMN ready_wait_notified_at TYPE TIMESTAMP USING ready_wait_notified_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_order_items ALTER COLUMN sent_at TYPE TIMESTAMP USING sent_at AT TIME ZONE current_setting('TimeZone');
-- ALTER TABLE table_order_items ALTER COLUMN served_at TYPE TIMESTAMP USING served_at AT TIME ZONE current_setting('TimeZone');
-- COMMIT;
