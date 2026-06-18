/**
 * Добавляет таблицы для заказов за столом (без пересоздания схемы).
 *   node db/migrate-table-orders.js
 */
import dotenv from 'dotenv';
dotenv.config();
import { default as pool } from './pool.js';

async function migrate() {
  await pool.query(`
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

    CREATE TABLE IF NOT EXISTS table_order_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id UUID NOT NULL REFERENCES table_sessions(id) ON DELETE CASCADE,
      product_id UUID REFERENCES products(id) ON DELETE SET NULL,
      iiko_product_id UUID NOT NULL,
      name VARCHAR(300) NOT NULL,
      price NUMERIC(10,2) NOT NULL DEFAULT 0,
      quantity INTEGER NOT NULL DEFAULT 1,
      line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
      synced_to_iiko BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_table_order_items_session
      ON table_order_items(session_id);

    CREATE TABLE IF NOT EXISTS restaurant_table_cache (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
      table_number VARCHAR(50) NOT NULL,
      iiko_table_id UUID NOT NULL,
      table_name VARCHAR(200),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE (restaurant_id, table_number)
    );
  `);

  console.log('Table-order migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
