-- Откат объектов последних релизов (по убыванию свежести). Каждый блок независим — выполняйте только нужный.
-- ПЕРЕД запуском: bash deploy/backup.sh --pre-deploy. Данные в удаляемых колонках/таблицах пропадают безвозвратно.
-- Запуск: psql -v ON_ERROR_STOP=1 -f previous-releases.down.sql  (или вставьте нужный блок целиком)

-- ── Вход персонала по табельному из «Фуджи Тим» ─────────────────────────────────────────────────────────────────
BEGIN;
DROP INDEX IF EXISTS idx_staff_users_team_code;
ALTER TABLE staff_users DROP COLUMN IF EXISTS team_code;
COMMIT;

-- ── Бизнес-ланч: время показа разделов, описание и вес вариантов шагов ───────────────────────────────────────────
BEGIN;
ALTER TABLE category_content DROP COLUMN IF EXISTS show_from;
ALTER TABLE category_content DROP COLUMN IF EXISTS show_until;
ALTER TABLE modifier_content DROP COLUMN IF EXISTS description;
ALTER TABLE modifier_content DROP COLUMN IF EXISTS weight;
COMMIT;

-- ── Web Push гостю (VAPID) ──────────────────────────────────────────────────────────────────────────────────────
BEGIN;
DROP TABLE IF EXISTS guest_push_subscriptions;      -- вместе с индексами idx_guest_push_session, idx_guest_push_guest
ALTER TABLE table_sessions DROP COLUMN IF EXISTS guest_push_ready_at;
COMMIT;

-- ── Правила продажи алкоголя, подтверждение 18+ ─────────────────────────────────────────────────────────────────
BEGIN;
ALTER TABLE restaurants DROP COLUMN IF EXISTS alcohol_rules;
ALTER TABLE table_order_items DROP COLUMN IF EXISTS age_confirmed_at;
COMMIT;

-- ── Брони столов из iiko ────────────────────────────────────────────────────────────────────────────────────────
BEGIN;
DROP INDEX IF EXISTS idx_table_sessions_reservation;
ALTER TABLE table_sessions DROP COLUMN IF EXISTS reservation_id;   -- снимает и внешний ключ на reservations
ALTER TABLE table_sessions DROP COLUMN IF EXISTS reserve_guest_name;
ALTER TABLE table_sessions DROP COLUMN IF EXISTS reserve_phone;
DROP TABLE IF EXISTS reservations;                                 -- вместе с idx_reservations_day, idx_reservations_session
COMMIT;
