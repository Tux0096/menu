/**
 * Демо-меню для локальной разработки/показа без доступа к prod API и iiko.
 * Кладёт снимок каталога в catalog_snapshots только тем ресторанам, у которых снимка нет.
 *   node db/demo-menu.js          # не трогает реальные снимки
 *   node db/demo-menu.js --force  # перезаписать
 */
import dotenv from 'dotenv';
dotenv.config();
import { randomUUID } from 'crypto';
import pool from './pool.js';

const G = {
  rolls: { id: randomUUID(), name: 'Роллы' },
  sets: { id: randomUUID(), name: 'Сеты' },
  hot: { id: randomUUID(), name: 'Горячее и WOK' },
  soups: { id: randomUUID(), name: 'Супы' },
  salads: { id: randomUUID(), name: 'Салаты и закуски' },
  desserts: { id: randomUUID(), name: 'Десерты' },
  drinks: { id: randomUUID(), name: 'Напитки' },
  bar: { id: randomUUID(), name: 'Бар' },
  sauces: { id: randomUUID(), name: 'Соусы' },
};

const P = [
  ['rolls', 'Ролл Сен-Тропе', 469, '235 г', 'Лосось, сливочный сыр, огурец, икра масаго'],
  ['rolls', 'Бангкок', 549, '290 г', 'Запечённый ролл с креветкой и острым соусом спайси'],
  ['rolls', 'Филадельфия классик', 599, '250 г', 'Лосось, сливочный сыр, огурец'],
  ['rolls', 'Калифорния с крабом', 429, '240 г', 'Снежный краб, авокадо, огурец, икра масаго'],
  ['rolls', 'Дракон с угрём', 649, '260 г', 'Угорь, сливочный сыр, огурец, соус унаги'],
  ['rolls', 'Острый лосось', 389, '210 г', 'Лосось, соус спайси, зелёный лук — острый'],
  ['rolls', 'Темпура с креветкой', 519, '270 г', 'Тёплый ролл в темпуре, креветка, сыр'],
  ['rolls', 'Сладкий ролл с бананом', 299, '180 г', 'Банан, сливочный сыр, шоколадный топпинг'],
  ['sets', 'Сет Мале', 1259, '725 г', 'Азия / Калифорния Крим / Мальдивы'],
  ['sets', 'Сет Большая компания', 2890, '1650 г', '48 роллов на компанию: Филадельфия, Калифорния, Дракон, Бангкок'],
  ['sets', 'Сет Горячий', 1490, '980 г', 'Запечённые и тёплые роллы'],
  ['hot', 'WOK с курицей терияки', 459, '350 г', 'Лапша удон, курица, овощи, соус терияки'],
  ['hot', 'WOK с морепродуктами острый', 559, '350 г', 'Рисовая лапша, креветки, мидии, кальмар, чили'],
  ['hot', 'Пицца Четыре сыра', 649, '550 г', 'О-о-очень много сыра: моцарелла, пармезан, дор блю, чеддер'],
  ['hot', 'Пицца Колбаски барбекю', 629, '580 г', 'Охотничьи колбаски, моцарелла, соус барбекю'],
  ['soups', 'Том Ям с креветками', 549, '350 мл', 'Острый тайский суп с кокосовым молоком — горячий'],
  ['soups', 'Мисо-суп', 249, '300 мл', 'Тофу, вакаме, зелёный лук — лёгкий'],
  ['soups', 'Рамен с курицей', 469, '450 мл', 'Горячий бульон, лапша, яйцо, курица'],
  ['salads', 'Салат Чука', 299, '150 г', 'Водоросли чука, ореховый соус — лёгкий'],
  ['salads', 'Эдамаме', 259, '150 г', 'Соевые бобы с солью'],
  ['salads', 'Детские наггетсы', 329, '200 г', 'Для детского праздника: куриные наггетсы и картофель'],
  ['desserts', 'Моти манго', 199, '70 г', 'Японский десерт из рисового теста — сладкое'],
  ['desserts', 'Чизкейк Нью-Йорк', 329, '130 г', 'Классический сливочный чизкейк'],
  ['drinks', 'Лимонад Юдзу', 259, '400 мл', 'Холодный напиток'],
  ['drinks', 'Чай зелёный Сенча', 199, '500 мл', 'Горячий чай'],
  ['drinks', 'Морс клюквенный', 189, '400 мл', 'Холодный напиток'],
  ['bar', 'Пиво Асахи', 349, '500 мл', 'Японское светлое'],
  ['bar', 'Саке', 390, '100 мл', 'Подаётся тёплым'],
  ['sauces', 'Соус спайси', 60, '30 г', 'Острый соус'],
  ['sauces', 'Соус унаги', 60, '30 г', 'Сладкий соус'],
];

const catalog = {
  groups: Object.values(G).map((g, i) => ({
    id: g.id, name: g.name, slug: `g${i}`, parentGroup: null, order: i, isIncludedInMenu: true, isGroupModifier: false,
  })),
  stopList: [],
  products: P.map(([g, name, price, weight, description], i) => {
    const id = randomUUID();
    return {
      id, iikoId: id, name, price, weight, description, parentGroup: G[g].id, order: i, slug: `p${i}`,
      image: null, isPublished: true, groupModifiers: [], modifiers: [], filters: [], allergens: [],
      energyAmount: 180 + (i * 37) % 200, fiberAmount: 8 + (i % 7), fatAmount: 6 + (i % 9), carbohydrateAmount: 20 + (i % 15),
    };
  }),
};

const force = process.argv.includes('--force');
const { rows } = await pool.query('SELECT id, slug FROM restaurants');
for (const r of rows) {
  const res = await pool.query(
    `INSERT INTO catalog_snapshots (restaurant_id, source, data) VALUES ($1, 'demo', $2)
     ON CONFLICT (restaurant_id) DO ${force ? "UPDATE SET source = 'demo', data = EXCLUDED.data, fetched_at = NOW()" : 'NOTHING'}`,
    [r.id, JSON.stringify(catalog)],
  );
  console.log(`${r.slug}: ${res.rowCount ? 'демо-меню загружено' : 'уже есть снимок — пропуск'}`);
}
await pool.end();
