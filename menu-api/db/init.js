import dotenv from 'dotenv';
dotenv.config();
import pg from 'pg';
const { Client } = pg;

async function createDatabaseIfNotExists() {
  const client = new Client({
    host: process.env.PG_HOST || 'localhost',
    port: parseInt(process.env.PG_PORT || '5432'),
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || 'postgres',
    database: 'postgres',
  });
  await client.connect();
  const dbName = process.env.PG_DATABASE || 'menu_db';
  const res = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  if (res.rowCount === 0) {
    await client.query(`CREATE DATABASE ${dbName}`);
    console.log(`Database "${dbName}" created.`);
  } else {
    console.log(`Database "${dbName}" already exists.`);
  }
  await client.end();
}

async function initSchema() {
  await createDatabaseIfNotExists();

  const { default: pool } = await import('./pool.js');

  // Drop and recreate everything for a clean dev state
  await pool.query(`
    DROP TABLE IF EXISTS products CASCADE;
    DROP TABLE IF EXISTS categories CASCADE;
    DROP TABLE IF EXISTS restaurants CASCADE;
    DROP TABLE IF EXISTS cities CASCADE;
    DROP TABLE IF EXISTS settings CASCADE;
  `);

  await pool.query(`
    CREATE TABLE cities (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(100) NOT NULL,
      slug VARCHAR(100) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE restaurants (
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

    CREATE TABLE categories (
      id UUID PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      slug VARCHAR(200) NOT NULL,
      parent_id UUID REFERENCES categories(id),
      sort_order INTEGER DEFAULT 0,
      image_url TEXT,
      is_visible BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE products (
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

    CREATE INDEX idx_products_restaurant ON products(restaurant_id);
    CREATE INDEX idx_products_category ON products(category_id);

    CREATE TABLE settings (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) UNIQUE NOT NULL,
      value JSONB,
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `);

  console.log('Schema initialized successfully.');
  await pool.end();
}

initSchema().catch((err) => {
  console.error('Schema init error:', err);
  process.exit(1);
});
