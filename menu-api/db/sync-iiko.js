/**
 * Sync real menu from iiko → PostgreSQL
 *
 * Usage:
 *   node db/sync-iiko.js
 *
 * Requires in .env:
 *   IIKO_API_LOGIN=<your-api-login>
 *   IIKO_ORGANIZATION_ID=05b015ec-87d0-4f5a-a7d1-3eecfe2c4fc2  (default, can override)
 */

import dotenv from 'dotenv';
dotenv.config();
import axios from 'axios';
import { default as pool } from './pool.js';

const IIKO_URL = 'https://api-ru.iiko.services';

// Organization used for nomenclature loading (from iiko-adapter config comments)
const ORGANIZATION_ID =
  process.env.IIKO_ORGANIZATION_ID || '05b015ec-87d0-4f5a-a7d1-3eecfe2c4fc2';

// Category IDs (iiko UUIDs) that should be shown in the menu.
// Taken from fuji-api/api.fuji.ru/setting/config/catalogMenu.js
const CATALOG_MENU = [
  { id: '8d2d0a59-1518-465e-b241-10c425f57a99', name: 'Комбо', slug: 'kombo', order: 1 },
  { id: '7d003f20-bacd-4aee-8c61-c395f3811bb2', name: 'Роллы', slug: 'rolly', order: 2 },
  { id: '7d2df019-f771-47d7-bfbb-9131d4f6322f', name: 'На каждый день', slug: 'na-kazhdyj-den', order: 3, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '0cfa6ce0-72c8-4194-9a46-dd441dc09d3d', name: 'Коллекция бренд-шефа', slug: 'kollekciya-brend-shefa', order: 4, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'da837308-7d79-4d50-8bc1-d2db23d8820a', name: 'Тартар', slug: 'tartar-rolly', order: 5, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'eafbcc67-fa8e-4ea1-9ac4-bc7b92a3814c', name: 'Большие', slug: 'bolshie-rolly', order: 6, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'a304c8ee-fe56-4ace-a07a-e8619792d696', name: 'Размер MAX', slug: 'rolly-razmer-max', order: 7, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '2ee52996-7dc5-4ccf-b072-5e365b904b4e', name: 'Огонь & Гриль', slug: 'rolly-ogon-and-gril', order: 8, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'f4eefc21-f175-4cd0-a2e7-32a1948668b7', name: 'Запеченные', slug: 'zapechennye-rolly', order: 9, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '4a72b94b-c664-4664-babf-5fc073f00b77', name: 'Теплые', slug: 'teplye-rolly', order: 10, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '7f3040b6-7b68-46d9-82f0-a890160ec53c', name: 'Классические', slug: 'klassicheskie-rolly', order: 11, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '3510aae9-ca26-4d02-95ed-90ffde6b5456', name: 'Сладкие', slug: 'sladkie-rolly', order: 12, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'e658fd39-577d-46ec-a2d3-5df8995184b2', name: 'Суши', slug: 'sushi', order: 13, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: 'f536371d-2801-4c3b-809a-d5c6fb3d1307', name: 'Гунканы', slug: 'gunkany', order: 14, parent: '7d003f20-bacd-4aee-8c61-c395f3811bb2' },
  { id: '42c534bf-6aa3-4128-85e4-3a15195527c9', name: 'Пицца', slug: 'picca', order: 15 },
  { id: '1fb068d0-5a7d-408f-99d5-3a3d63ccb552', name: 'Пицца 2 вкуса', slug: 'picca-dva-vkusa', order: 16, parent: '42c534bf-6aa3-4128-85e4-3a15195527c9' },
  { id: '62fe6060-264a-4bef-9940-0fff074136a0', name: 'Бао', slug: 'bao', order: 17 },
  { id: '34a918c1-489d-421e-aa6d-2e36420e1365', name: 'Бургеры', slug: 'burgery', order: 18 },
  { id: 'b13590f7-9846-40f1-aeb1-f0cb14db4995', name: 'Паста', slug: 'pasta', order: 19 },
  { id: '1c4a35c1-1689-4ed2-8d0a-a96e072b80d9', name: 'Лепешки роти', slug: 'lepeshki-roti', order: 20 },
  { id: 'fcfad280-8795-4940-8fd9-9654c55934fd', name: 'Wok лапша', slug: 'wok-lapsha', order: 21 },
  { id: '284d37ed-bc12-475c-ab48-e1fc2c872cef', name: 'Wok рис', slug: 'wok-ris', order: 22, parent: 'fcfad280-8795-4940-8fd9-9654c55934fd' },
  { id: 'd570a52f-6156-4af2-97fb-48aada4637cd', name: 'Поке', slug: 'poke', order: 23 },
  { id: 'f42ab48f-30e0-43bd-9b2b-c6e35c5624b0', name: 'Закуски', slug: 'zakuski', order: 24 },
  { id: '23cd9f08-6a8c-4041-a7f1-3f362c879e54', name: 'Фудстер', slug: 'fudster', order: 25 },
  { id: 'baf5a5d6-16a6-45f4-af1e-5e80fae833f2', name: 'Супы', slug: 'supy', order: 26 },
  { id: '77b5b79d-6beb-4507-b7ce-d603010d796d', name: 'Салаты', slug: 'salaty', order: 27 },
  { id: '85eabe9a-40d9-4a26-babc-1634a768fd85', name: 'Мидии', slug: 'midii', order: 28 },
  { id: '3ccd102f-7af9-4b12-b0a3-e26f1131e6f3', name: 'Десерты', slug: 'deserty', order: 29 },
  { id: 'dc8d3d03-d59c-4958-ad99-c8d6ca3c319d', name: 'Соусы', slug: 'sousy', order: 30 },
  { id: '67ed0d32-e712-45c8-902e-87e8c84c9a57', name: 'Напитки', slug: 'napitki', order: 31 },
  { id: 'b1016517-1875-457a-b824-c36d85fdb615', name: 'Приборы', slug: 'pribory', order: 32 },
];

const CATALOG_IDS = new Set(CATALOG_MENU.map(c => c.id));
const CATALOG_MAP = new Map(CATALOG_MENU.map(c => [c.id, c]));

async function getToken() {
  const apiLogin = process.env.IIKO_API_LOGIN;
  if (!apiLogin) {
    throw new Error(
      'IIKO_API_LOGIN not set in .env\n' +
      'Add: IIKO_API_LOGIN=<your-login> to menu-api/.env'
    );
  }
  console.log('Getting iiko token...');
  const res = await axios.post(`${IIKO_URL}/api/1/access_token`, { apiLogin });
  return res.data.token;
}

async function getNomenclature(token) {
  console.log(`Fetching nomenclature for org ${ORGANIZATION_ID}...`);
  const res = await axios.post(
    `${IIKO_URL}/api/1/nomenclature`,
    { organizationId: ORGANIZATION_ID },
    { headers: { Authorization: `Bearer ${token}` } }
  );
  return res.data;
}

async function sync() {
  const token = await getToken();
  const { groups, products } = await getNomenclature(token);

  console.log(`iiko returned: ${groups.length} groups, ${products.length} products`);

  // Build a lookup from iiko group data (name, imageLinks, etc.)
  const iikoGroupMap = new Map(groups.map(g => [g.id, g]));

  // Categories to insert: use CATALOG_MENU order/slugs but enrich with iiko data (images)
  const categoriesToInsert = CATALOG_MENU.map(cat => {
    const iikoGroup = iikoGroupMap.get(cat.id);
    const imageUrl = iikoGroup?.imageLinks?.[0] ?? null;
    return {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      parent_id: cat.parent || null,
      sort_order: cat.order,
      image_url: imageUrl,
    };
  });

  // Filter relevant products: parentGroup must be in CATALOG_IDS, price > 0
  const relevantProducts = products.filter(p => {
    if (!CATALOG_IDS.has(p.parentGroup)) return false;
    if (p.isDeleted) return false;
    if (p.isIncludedInMenu === false) return false;
    const price = p.sizePrices?.[0]?.price?.currentPrice ?? 0;
    if (price <= 0) return false;
    return true;
  });

  console.log(`Relevant products: ${relevantProducts.length}`);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Clear in FK-safe order
    await client.query('DELETE FROM products');
    await client.query('DELETE FROM categories');

    // Insert parents first, then children (avoid FK violation)
    const parents = categoriesToInsert.filter(c => !c.parent_id);
    const children = categoriesToInsert.filter(c => c.parent_id);

    for (const cat of [...parents, ...children]) {
      await client.query(
        `INSERT INTO categories (id, name, slug, parent_id, sort_order, image_url, is_visible)
         VALUES ($1, $2, $3, $4, $5, $6, true)`,
        [cat.id, cat.name, cat.slug, cat.parent_id, cat.sort_order, cat.image_url]
      );
    }
    console.log(`Inserted ${categoriesToInsert.length} categories`);

    // Insert products
    let inserted = 0;
    for (const [i, p] of relevantProducts.entries()) {
      const imageUrl = p.imageLinks?.[0] ?? null;
      const price = p.sizePrices?.[0]?.price?.currentPrice ?? 0;
      const weight = p.weight ? String(p.weight) : null;

      await client.query(
        `INSERT INTO products
           (id, name, slug, description, price, weight, image_url, category_id,
            sort_order, is_published, energy, proteins, fats, carbs)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          p.id,
          p.name,
          p.name,          // slug = name; frontend doesn't route by product slug
          p.description ?? null,
          price,
          weight,
          imageUrl,
          p.parentGroup,
          p.order ?? i,
          true,
          p.energyAmount ?? null,
          p.fiberAmount ?? p.proteinsAmount ?? null,
          p.fatAmount ?? null,
          p.carbohydrateAmount ?? p.carbohydratesAmount ?? null,
        ]
      );
      inserted++;
    }

    await client.query('COMMIT');
    console.log(`✓ Sync complete: ${inserted} products, ${categoriesToInsert.length} categories`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }

  await pool.end();
}

sync().catch(e => {
  console.error('Sync failed:', e.message);
  process.exit(1);
});
