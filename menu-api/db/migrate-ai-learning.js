import dotenv from 'dotenv';
dotenv.config();
import pool from './pool.js';

async function migrate() {
  await pool.query(`
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

    CREATE INDEX IF NOT EXISTS idx_ai_query_log_normalized
      ON ai_query_log (query_normalized);

    CREATE INDEX IF NOT EXISTS idx_ai_feedback_normalized
      ON ai_product_feedback (query_normalized);
  `);
  console.log('AI learning tables ready');
  await pool.end();
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
