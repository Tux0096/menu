import dotenv from 'dotenv';
dotenv.config();
import pool from './pool.js';

async function migrate() {
  await pool.query(`
    ALTER TABLE table_sessions
      ADD COLUMN IF NOT EXISTS workflow_status VARCHAR(40) NOT NULL DEFAULT 'browsing',
      ADD COLUMN IF NOT EXISTS menu_opened_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS menu_opened_notified BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS last_guest_activity_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS idle_notified_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS guest_count INT NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS cart_ready_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS sent_to_production_at TIMESTAMPTZ;

    ALTER TABLE table_order_items
      ADD COLUMN IF NOT EXISTS seat_number INT,
      ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

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
  `);
  console.log('Table workflow migration complete.');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
