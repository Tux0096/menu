/**
 * Единая идемпотентная миграция: создаёт/дополняет все таблицы, не удаляя данные.
 *   node db/migrate.js
 * Можно запускать при каждом деплое.
 */
import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
import { hashPassword } from '../lib/passwords.js';
import { seedRestaurants } from './seed.js';

async function ensureDatabase() {
  const client = new pg.Client({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432', 10),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: 'postgres',
  });
  await client.connect();
  const dbName = process.env.PG_DATABASE || 'menu_db';
  const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database "${dbName}" created.`);
  }
  await client.end();
}

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS cities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS restaurants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200),
    address VARCHAR(300) NOT NULL,
    city_id UUID REFERENCES cities(id),
    slug VARCHAR(200) UNIQUE NOT NULL,
    terminal_id VARCHAR(200) UNIQUE,
    terminal_group_id VARCHAR(200),
    organization_id VARCHAR(200),
    phone VARCHAR(50),
    sort_order INTEGER DEFAULT 0,
    is_disabled BOOLEAN DEFAULT FALSE,
    work_hours JSONB DEFAULT '[]',
    created_at TIMESTAMP DEFAULT NOW()
  );
  ALTER TABLE restaurants
    ADD COLUMN IF NOT EXISTS tables_count INT NOT NULL DEFAULT 20;

  CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    slug VARCHAR(200) NOT NULL,
    parent_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    image_url TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    iiko_id UUID,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    name VARCHAR(300) NOT NULL,
    slug VARCHAR(300),
    description TEXT,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    old_price NUMERIC(10,2),
    weight VARCHAR(100),
    image_url TEXT,
    category_id UUID REFERENCES categories(id),
    sort_order INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT TRUE,
    energy NUMERIC(8,2),
    proteins NUMERIC(8,2),
    fats NUMERIC(8,2),
    carbs NUMERIC(8,2),
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (restaurant_id, iiko_id)
  );
  CREATE INDEX IF NOT EXISTS idx_products_restaurant ON products(restaurant_id);
  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

  CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    value JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
  );

  -- Гости (идентификация по телефону / токену приложения Fuji)
  CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(200),
    fuji_user_id VARCHAR(100),
    allergens TEXT[] NOT NULL DEFAULT '{}',
    visits_count INT NOT NULL DEFAULT 0,
    last_visit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS guest_tokens (
    token VARCHAR(80) PRIMARY KEY,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Сессии стола
  CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    iiko_table_id UUID,
    iiko_order_id UUID,
    status VARCHAR(30) NOT NULL DEFAULT 'open',
    payment_status VARCHAR(30) NOT NULL DEFAULT 'unpaid',
    total NUMERIC(12,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_table_sessions_one_open
    ON table_sessions(restaurant_id, table_number)
    WHERE status = 'open';
  CREATE INDEX IF NOT EXISTS idx_table_sessions_restaurant_table
    ON table_sessions(restaurant_id, table_number);

  ALTER TABLE table_sessions
    ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(40) NOT NULL DEFAULT 'browsing',
    ADD COLUMN IF NOT EXISTS menu_opened_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS menu_opened_notified BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS last_guest_activity_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS idle_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS guest_count INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS cart_ready_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS sent_to_production_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS bill_requested_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS iiko_last_error TEXT,
    ADD COLUMN IF NOT EXISTS waiter_id UUID,
    ADD COLUMN IF NOT EXISTS locked_by UUID,
    ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS guest_ids UUID[] NOT NULL DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS wait_notified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS iiko_status VARCHAR(40),
    ADD COLUMN IF NOT EXISTS kitchen_status VARCHAR(40),
    ADD COLUMN IF NOT EXISTS iiko_status_at TIMESTAMPTZ;

  CREATE TABLE IF NOT EXISTS table_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    product_id UUID,
    iiko_product_id UUID NOT NULL,
    name VARCHAR(300) NOT NULL,
    price NUMERIC(10,2) NOT NULL DEFAULT 0,
    quantity INTEGER NOT NULL DEFAULT 1,
    line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    synced_to_iiko BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_table_order_items_session ON table_order_items(session_id);
  ALTER TABLE table_order_items
    ADD COLUMN IF NOT EXISTS seat_number INT,
    ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS course INT,
    ADD COLUMN IF NOT EXISTS batch_no INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS kitchen_status VARCHAR(40);
  -- product_id в каталоге prod-API не совпадает с products.id → убираем FK, если он был
  ALTER TABLE table_order_items DROP CONSTRAINT IF EXISTS table_order_items_product_id_fkey;
  ALTER TABLE table_order_items ALTER COLUMN product_id TYPE VARCHAR(100) USING product_id::text;

  CREATE TABLE IF NOT EXISTS restaurant_table_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    table_number VARCHAR(50) NOT NULL,
    iiko_table_id UUID NOT NULL,
    table_name VARCHAR(200),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE (restaurant_id, table_number)
  );

  CREATE TABLE IF NOT EXISTS waiter_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
    table_number VARCHAR(50) NOT NULL,
    type VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_waiter_notifications_unread
    ON waiter_notifications(restaurant_id, is_read, created_at DESC);

  CREATE TABLE IF NOT EXISTS visit_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS table_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    tip_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    method VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'completed',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- AI: обучение на выборе гостей
  CREATE TABLE IF NOT EXISTS ai_query_log (
    id SERIAL PRIMARY KEY,
    restaurant_slug TEXT,
    query TEXT NOT NULL,
    query_normalized TEXT NOT NULL,
    suggestions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE TABLE IF NOT EXISTS ai_product_feedback (
    id SERIAL PRIMARY KEY,
    query_normalized TEXT NOT NULL,
    product_id TEXT NOT NULL,
    action TEXT NOT NULL DEFAULT 'add',
    count INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (query_normalized, product_id, action)
  );
  CREATE INDEX IF NOT EXISTS idx_ai_query_log_normalized ON ai_query_log (query_normalized);
  CREATE INDEX IF NOT EXISTS idx_ai_feedback_normalized ON ai_product_feedback (query_normalized);

  -- AI-чипы (быстрые подсказки), редактируются в админке
  CREATE TABLE IF NOT EXISTS ai_chips (
    id SERIAL PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    query VARCHAR(300) NOT NULL,
    emoji VARCHAR(16),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Правки меню поверх выгрузки iiko/prod: стоп-лист, скрытие, фото, КБЖУ, аллергены.
  -- restaurant_id NULL → правка действует во всех ресторанах.
  CREATE TABLE IF NOT EXISTS menu_overrides (
    id SERIAL PRIMARY KEY,
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
    product_id VARCHAR(100) NOT NULL,
    product_name VARCHAR(300),
    is_stopped BOOLEAN NOT NULL DEFAULT FALSE,
    is_hidden BOOLEAN NOT NULL DEFAULT FALSE,
    is_recommended BOOLEAN NOT NULL DEFAULT FALSE,
    name VARCHAR(300),
    description TEXT,
    image_url TEXT,
    weight VARCHAR(100),
    energy NUMERIC(8,2),
    proteins NUMERIC(8,2),
    fats NUMERIC(8,2),
    carbs NUMERIC(8,2),
    allergens TEXT[],
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_menu_overrides_scope
    ON menu_overrides (COALESCE(restaurant_id, '00000000-0000-0000-0000-000000000000'::uuid), product_id);

  -- Маркетинговые блоки (баннеры на экране AI)
  CREATE TABLE IF NOT EXISTS promo_blocks (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    text TEXT,
    image_url TEXT,
    product_id VARCHAR(100),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Последняя успешная выгрузка меню: резерв, если prod-API/iiko недоступны
  CREATE TABLE IF NOT EXISTS catalog_snapshots (
    restaurant_id UUID PRIMARY KEY REFERENCES restaurants(id) ON DELETE CASCADE,
    source VARCHAR(30) NOT NULL,
    data JSONB NOT NULL,
    fetched_at TIMESTAMPTZ DEFAULT NOW()
  );

  -- Персонал
  CREATE TABLE IF NOT EXISTS staff_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    login VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'waiter')),
    restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
    password_hash TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    staff_id UUID,
    staff_name VARCHAR(200),
    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100),
    entity_id VARCHAR(100),
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_audit_log_created ON audit_log(created_at DESC);
`;

const DEFAULT_CHIPS = [
  { label: 'Острое', query: 'острое', emoji: '🌶', sort: 1 },
  { label: 'Сладкое', query: 'сладкое десерт', emoji: '🍰', sort: 2 },
  { label: 'Рекомендуем попробовать', query: 'рекомендуем', emoji: '⭐', sort: 3 },
  { label: 'Лёгкое', query: 'что-то лёгкое', emoji: '🥗', sort: 4 },
  { label: 'С лососем', query: 'роллы с лососем', emoji: '🐟', sort: 5 },
  { label: 'На компанию', query: 'сет на компанию', emoji: '👥', sort: 6 },
  { label: 'Горячее', query: 'горячее', emoji: '🔥', sort: 7 },
  { label: 'Напитки', query: 'напитки', emoji: '🥤', sort: 8 },
];

// Уникальные индексы на старых данных могут не создаться из-за дублей — не валим миграцию.
const SOFT_INDEXES = [
  // Старые данные: оставить по одному отзыву на визит и одну успешную оплату, иначе индекс не создастся
  `DELETE FROM visit_feedback a USING visit_feedback b
     WHERE a.session_id = b.session_id AND (a.created_at, a.id::text) > (b.created_at, b.id::text)`,
  `UPDATE table_payments a SET status = 'duplicate' FROM table_payments b
     WHERE a.session_id = b.session_id AND a.status = 'completed' AND b.status = 'completed'
       AND (a.created_at, a.id::text) > (b.created_at, b.id::text)`,
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_visit_feedback_session ON visit_feedback(session_id)',
  // Защита от двойной оплаты: одна успешная оплата на визит
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_table_payments_one_completed
     ON table_payments(session_id) WHERE status = 'completed'`,
];

async function seedDefaults(pool) {
  const { rows: rc } = await pool.query('SELECT COUNT(*)::int AS n FROM restaurants');
  if (!rc[0].n) {
    await seedRestaurants(pool);
    console.log('Seeded restaurants.');
  }

  const { rows: cc } = await pool.query('SELECT COUNT(*)::int AS n FROM ai_chips');
  if (!cc[0].n) {
    for (const c of DEFAULT_CHIPS) {
      await pool.query(
        'INSERT INTO ai_chips (label, query, emoji, sort_order) VALUES ($1,$2,$3,$4)',
        [c.label, c.query, c.emoji, c.sort],
      );
    }
    console.log('Seeded AI chips.');
  }

  const { rows: sc } = await pool.query('SELECT COUNT(*)::int AS n FROM staff_users');
  if (!sc[0].n) {
    const users = [
      { login: 'admin', name: 'Администратор', role: 'admin', password: process.env.ADMIN_PASSWORD || 'admin' },
      { login: 'manager', name: 'Управляющий', role: 'manager', password: process.env.MANAGER_PASSWORD || 'manager' },
      { login: 'waiter', name: 'Официант', role: 'waiter', password: process.env.WAITER_PASSWORD || '1111' },
    ];
    for (const u of users) {
      await pool.query(
        `INSERT INTO staff_users (login, name, role, password_hash) VALUES ($1,$2,$3,$4)`,
        [u.login, u.name, u.role, hashPassword(u.password)],
      );
    }
    console.log('Seeded staff users: admin / manager / waiter (смените пароли в админке).');
  }
}

async function migrate() {
  await ensureDatabase();
  const { default: pool } = await import('./pool.js');
  await pool.query(SCHEMA);
  for (const sql of SOFT_INDEXES) {
    try { await pool.query(sql); } catch (e) { console.warn('index skipped:', e.message); }
  }
  await seedDefaults(pool);
  console.log('Migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});
