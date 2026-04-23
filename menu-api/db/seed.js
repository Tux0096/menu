import dotenv from 'dotenv';
dotenv.config();
import { default as pool } from './pool.js';

const SAMARA_ID = 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0';
const TOLYATTI_ID = '3f02eb06-e771-434c-ab73-2ec5bbde1265';
const NOVOKUJBYSHEVSK_ID = 'e27dec5a-4447-4bcb-a124-0c1795618998';

const cities = [
  { id: SAMARA_ID, name: 'Самара', slug: 'samara' },
  { id: TOLYATTI_ID, name: 'Тольятти', slug: 'tolyatti' },
  { id: NOVOKUJBYSHEVSK_ID, name: 'Новокуйбышевск', slug: 'novokujbyshevsk' },
];

const restaurants = [
  { name: 'Фуджи Кошелев', address: 'Кошелев Бульвар Финютина, 41', city_id: SAMARA_ID, slug: 'koshelev', terminal_id: 'e4398867-351e-a3cf-018b-99b59dc715c0', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Димитрова', address: 'Димитрова, 110Б', city_id: SAMARA_ID, slug: 'dimitrova', terminal_id: 'e4398867-351e-a3cf-018b-99ac15ff8891', phone: '8 (927) 297-25-80' },
  { name: 'Фуджи Физкультурная', address: 'Физкультурная, 98', city_id: SAMARA_ID, slug: 'fizkulturnaya', terminal_id: 'e4398867-351e-a3cf-018b-9983526f1169', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Ново-Садовая', address: 'Ново-Садовая, 24', city_id: SAMARA_ID, slug: 'novo-sadovaya', terminal_id: 'e4398867-351e-a3cf-018b-998cb7a874f2', phone: '8 (937) 646-94-09' },
  { name: 'Фуджи Коммунистическая', address: 'Коммунистическая, 27', city_id: SAMARA_ID, slug: 'kommunisticheskaya', terminal_id: 'e4398867-351e-a3cf-018b-99d17a6e1ae7', phone: '8 (927) 208-08-77' },
  { name: 'Фуджи Молодогвардейская', address: 'Молодогвардейская, 135', city_id: SAMARA_ID, slug: 'molodogvardeyskaya', terminal_id: '02c55e58-bb32-cd42-0191-d75358a3d880', phone: '8 (927) 716-40-06' },
  { name: 'Фуджи Ленинградская', address: 'Ленинградская, 60', city_id: SAMARA_ID, slug: 'leningradskaya', terminal_id: 'e4398867-351e-a3cf-018b-99dea3d09c51', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи 6-я Просека', address: '6-я Просека, 163', city_id: SAMARA_ID, slug: 'proseka', terminal_id: 'e4398867-351e-a3cf-018b-9a039dc8d7a4', phone: '8 (937) 665-50-77' },
  { name: 'Фуджи Долотный', address: 'Долотный, 9', city_id: SAMARA_ID, slug: 'dolotnyy', terminal_id: 'e4398867-351e-a3cf-018b-9a1eddb684ff', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Южный Город', address: 'Николаевский пр., 38', city_id: SAMARA_ID, slug: 'yuzhnyy-gorod', terminal_id: 'e4398867-351e-a3cf-018b-9a46b91c9817', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Дмитрия Донского', address: 'Дмитрия Донского, 12', city_id: SAMARA_ID, slug: 'dmitriya-donskogo', terminal_id: '86cb7232-8e5f-b1e7-0194-0bdddcde2d8b', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Кирова', address: 'Георгия Димитрова, 131', city_id: SAMARA_ID, slug: 'kirova', terminal_id: 'e4398867-351e-a3cf-018b-999f0db7ba99', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Карла Маркса', address: 'г. Тольятти, Карла Маркса, 76', city_id: TOLYATTI_ID, slug: 'tolyatti-karla-marksa', terminal_id: 'e4398867-351e-a3cf-018b-9a2782ec56bf', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Аврора', address: 'г. Тольятти, Автостроителей, 56А', city_id: TOLYATTI_ID, slug: 'tolyatti-avrora', terminal_id: 'e4398867-351e-a3cf-018b-991bff29d5bf', phone: '8 (927) 297-24-65' },
  { name: 'Фуджи Новокуйбышевск', address: 'г. Новокуйбышевск, Дзержинского, 29', city_id: NOVOKUJBYSHEVSK_ID, slug: 'novokuybyshevsk', terminal_id: 'e4398867-351e-a3cf-018b-9a18976524b2', phone: '8 (937) 073-07-89' },
];

// --- Categories ---
const CAT_SETS = '8d2d0a59-1518-465e-b241-10c425f57a99';
const CAT_ROLLS = '7d003f20-bacd-4aee-8c61-c395f3811bb2';
const CAT_ROLLS_DAILY = '7d2df019-f771-47d7-bfbb-9131d4f6322f';
const CAT_ROLLS_BAKED = 'f4eefc21-f175-4cd0-a2e7-32a1948668b7';
const CAT_ROLLS_CLASSIC = '7f3040b6-7b68-46d9-82f0-a890160ec53c';
const CAT_PIZZA = '42c534bf-6aa3-4128-85e4-3a15195527c9';
const CAT_WOK = 'fcfad280-8795-4940-8fd9-9654c55934fd';
const CAT_SNACKS = 'f42ab48f-30e0-43bd-9b2b-c6e35c5624b0';
const CAT_SOUPS = 'baf5a5d6-16a6-45f4-af1e-5e80fae833f2';
const CAT_DESSERTS = '3ccd102f-7af9-4b12-b0a3-e26f1131e6f3';
const CAT_DRINKS = '67ed0d32-e712-45c8-902e-87e8c84c9a57';
const CAT_SUSHI = 'e658fd39-577d-46ec-a2d3-5df8995184b2';

const categories = [
  { id: CAT_SETS, name: 'Сеты', slug: 'sety', sort_order: 1, parent_id: null },
  { id: CAT_ROLLS, name: 'Роллы', slug: 'rolly', sort_order: 2, parent_id: null },
  { id: CAT_ROLLS_DAILY, name: 'На каждый день', slug: 'na-kazhdyj-den', sort_order: 3, parent_id: CAT_ROLLS },
  { id: CAT_ROLLS_BAKED, name: 'Запечённые', slug: 'zapechennye-rolly', sort_order: 4, parent_id: CAT_ROLLS },
  { id: CAT_ROLLS_CLASSIC, name: 'Классические', slug: 'klassicheskie-rolly', sort_order: 5, parent_id: CAT_ROLLS },
  { id: CAT_SUSHI, name: 'Суши', slug: 'sushi', sort_order: 6, parent_id: null },
  { id: CAT_PIZZA, name: 'Пицца', slug: 'picca', sort_order: 7, parent_id: null },
  { id: CAT_WOK, name: 'Wok', slug: 'wok', sort_order: 8, parent_id: null },
  { id: CAT_SNACKS, name: 'Закуски', slug: 'zakuski', sort_order: 9, parent_id: null },
  { id: CAT_SOUPS, name: 'Супы', slug: 'supy', sort_order: 10, parent_id: null },
  { id: CAT_DESSERTS, name: 'Десерты', slug: 'deserty', sort_order: 11, parent_id: null },
  { id: CAT_DRINKS, name: 'Напитки', slug: 'napitki', sort_order: 12, parent_id: null },
];

const products = [
  // Сеты
  { name: 'Сет Классика', slug: 'set-klassika', price: 1490, weight: '980 г', category_id: CAT_SETS, description: '24 ролла: Калифорния, Филадельфия, Спайси', sort_order: 1 },
  { name: 'Сет Большой', slug: 'set-bolshoy', price: 2290, weight: '1480 г', category_id: CAT_SETS, description: '36 роллов: Калифорния, Филадельфия, Дракон, Вулкан', sort_order: 2 },
  { name: 'Сет Мини', slug: 'set-mini', price: 890, weight: '620 г', category_id: CAT_SETS, description: '16 роллов ассорти на выбор', sort_order: 3 },
  { name: 'Сет Фуджи', slug: 'set-fuji', price: 1990, weight: '1200 г', category_id: CAT_SETS, description: '32 ролла фирменного ассорти', sort_order: 4 },
  // Роллы на каждый день
  { name: 'Калифорния', slug: 'kaliforniya', price: 490, weight: '250 г', category_id: CAT_ROLLS_DAILY, description: 'Краб, авокадо, огурец, икра тобико', sort_order: 1 },
  { name: 'Филадельфия', slug: 'filadelfiya', price: 590, weight: '270 г', category_id: CAT_ROLLS_DAILY, description: 'Сёмга, сыр Филадельфия, огурец', sort_order: 2 },
  { name: 'Дракон', slug: 'drakon', price: 620, weight: '280 г', category_id: CAT_ROLLS_DAILY, description: 'Угорь, авокадо, огурец, соус унаги', sort_order: 3 },
  { name: 'Спайси с тунцом', slug: 'spaysi-s-tuncom', price: 520, weight: '240 г', category_id: CAT_ROLLS_DAILY, description: 'Тунец, огурец, спайси соус', sort_order: 4 },
  // Запечённые
  { name: 'Вулкан', slug: 'vulkan', price: 560, weight: '260 г', category_id: CAT_ROLLS_BAKED, description: 'Краб, огурец, соус спайси, сыр, запечённый', sort_order: 1 },
  { name: 'Фудзи запечённый', slug: 'fuji-zapechyonnyy', price: 610, weight: '270 г', category_id: CAT_ROLLS_BAKED, description: 'Лосось, сыр, спайси маки, запечённый под сыром', sort_order: 2 },
  { name: 'Сёмга запечённая', slug: 'syomga-zapechyonnaya', price: 640, weight: '280 г', category_id: CAT_ROLLS_BAKED, description: 'Сёмга, сыр Филадельфия, соус спайси, запечённый', sort_order: 3 },
  // Классические
  { name: 'Нигири с лососем', slug: 'nigiri-s-lososem', price: 380, weight: '180 г', category_id: CAT_ROLLS_CLASSIC, description: '6 штук нигири с лососем', sort_order: 1 },
  { name: 'Осака', slug: 'osaka', price: 420, weight: '200 г', category_id: CAT_ROLLS_CLASSIC, description: 'Тунец, авокадо, маки', sort_order: 2 },
  // Суши
  { name: 'Нигири с тунцом', slug: 'nigiri-s-tuncom', price: 320, weight: '120 г', category_id: CAT_SUSHI, description: '2 штуки нигири с тунцом', sort_order: 1 },
  { name: 'Нигири с угрём', slug: 'nigiri-s-ugryom', price: 350, weight: '120 г', category_id: CAT_SUSHI, description: '2 штуки нигири с угрём', sort_order: 2 },
  { name: 'Гунканы с икрой', slug: 'gunkany-s-ikroy', price: 390, weight: '130 г', category_id: CAT_SUSHI, description: '2 штуки гункан с красной икрой', sort_order: 3 },
  // Пицца
  { name: 'Маргарита', slug: 'margarita', price: 590, weight: '450 г', category_id: CAT_PIZZA, description: 'Томатный соус, моцарелла, базилик', sort_order: 1 },
  { name: 'Пепперони', slug: 'pepperoni', price: 690, weight: '500 г', category_id: CAT_PIZZA, description: 'Томатный соус, моцарелла, пепперони', sort_order: 2 },
  { name: 'Четыре сыра', slug: 'chetyre-syra', price: 720, weight: '480 г', category_id: CAT_PIZZA, description: 'Моцарелла, рикотта, чеддер, пармезан', sort_order: 3 },
  { name: 'Барбекю с курицей', slug: 'barbeku-s-kuricey', price: 710, weight: '510 г', category_id: CAT_PIZZA, description: 'Соус BBQ, курица, красный лук, болгарский перец', sort_order: 4 },
  // Wok
  { name: 'Wok с курицей', slug: 'wok-s-kuricey', price: 440, weight: '380 г', category_id: CAT_WOK, description: 'Лапша удон, курица, овощи, соус терияки', sort_order: 1 },
  { name: 'Wok с говядиной', slug: 'wok-s-govyadinoy', price: 490, weight: '380 г', category_id: CAT_WOK, description: 'Лапша удон, говядина, грибы, соус унаги', sort_order: 2 },
  { name: 'Wok с креветками', slug: 'wok-s-krevetkami', price: 520, weight: '370 г', category_id: CAT_WOK, description: 'Рисовая лапша, креветки, овощи, остро-сладкий соус', sort_order: 3 },
  // Закуски
  { name: 'Гёдза с курицей', slug: 'gyodza-s-kuricey', price: 290, weight: '180 г', category_id: CAT_SNACKS, description: 'Жареные пельмешки с курицей и овощами', sort_order: 1 },
  { name: 'Картофель фри', slug: 'kartoshka-fri', price: 190, weight: '160 г', category_id: CAT_SNACKS, description: 'Хрустящий картофель фри с соусом', sort_order: 2 },
  { name: 'Эдамамэ', slug: 'edamame', price: 220, weight: '200 г', category_id: CAT_SNACKS, description: 'Варёные бобы в стручках с морской солью', sort_order: 3 },
  { name: 'Темпура с креветками', slug: 'tempura-s-krevetkami', price: 390, weight: '220 г', category_id: CAT_SNACKS, description: 'Жареные в кляре креветки с соусом', sort_order: 4 },
  // Супы
  { name: 'Мисо суп', slug: 'miso-sup', price: 190, weight: '250 мл', category_id: CAT_SOUPS, description: 'Паста мисо, тофу, нори, зелёный лук', sort_order: 1 },
  { name: 'Рамен с курицей', slug: 'ramen-s-kuricey', price: 390, weight: '450 мл', category_id: CAT_SOUPS, description: 'Бульон тонкоцу, яйцо, курица, кукуруза, нори', sort_order: 2 },
  { name: 'Том ям', slug: 'tom-yam', price: 420, weight: '400 мл', category_id: CAT_SOUPS, description: 'Острый тайский суп с морепродуктами', sort_order: 3 },
  // Десерты
  { name: 'Чизкейк', slug: 'chizkeyk', price: 280, weight: '150 г', category_id: CAT_DESSERTS, description: 'Нью-Йоркский чизкейк с ягодным соусом', sort_order: 1 },
  { name: 'Моти с мороженым', slug: 'moti-s-morozhenym', price: 250, weight: '100 г', category_id: CAT_DESSERTS, description: 'Японские рисовые пирожные с мороженым', sort_order: 2 },
  { name: 'Тирамису', slug: 'tiramissu', price: 310, weight: '180 г', category_id: CAT_DESSERTS, description: 'Классический итальянский десерт', sort_order: 3 },
  // Напитки
  { name: 'Зелёный чай', slug: 'zelonyy-chay', price: 120, weight: '300 мл', category_id: CAT_DRINKS, description: 'Японский зелёный чай сенча', sort_order: 1 },
  { name: 'Кола', slug: 'kola', price: 150, weight: '330 мл', category_id: CAT_DRINKS, description: 'Coca-Cola 330 мл', sort_order: 2 },
  { name: 'Апельсиновый сок', slug: 'apelsinovyy-sok', price: 180, weight: '300 мл', category_id: CAT_DRINKS, description: 'Свежевыжатый апельсиновый сок', sort_order: 3 },
  { name: 'Лимонад Клубника', slug: 'limonad-klubnika', price: 220, weight: '400 мл', category_id: CAT_DRINKS, description: 'Домашний лимонад с клубникой', sort_order: 4 },
];

async function seed() {
  console.log('Starting seed...');

  // Cities
  for (const city of cities) {
    await pool.query(
      `INSERT INTO cities (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [city.id, city.name, city.slug]
    );
  }
  console.log(`Seeded ${cities.length} cities`);

  // Restaurants
  for (const r of restaurants) {
    await pool.query(
      `INSERT INTO restaurants (name, address, city_id, slug, terminal_id, phone)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (slug) DO UPDATE SET name=$1, address=$2, terminal_id=$5, phone=$6`,
      [r.name, r.address, r.city_id, r.slug, r.terminal_id, r.phone]
    );
  }
  console.log(`Seeded ${restaurants.length} restaurants`);

  // Categories
  const parentCats = categories.filter(c => !c.parent_id);
  const childCats = categories.filter(c => c.parent_id);

  for (const c of parentCats) {
    await pool.query(
      `INSERT INTO categories (id, name, slug, parent_id, sort_order)
       VALUES ($1, $2, $3, NULL, $4)
       ON CONFLICT (id) DO UPDATE SET name=$2, slug=$3, sort_order=$4`,
      [c.id, c.name, c.slug, c.sort_order]
    );
  }
  for (const c of childCats) {
    await pool.query(
      `INSERT INTO categories (id, name, slug, parent_id, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE SET name=$2, slug=$3, parent_id=$4, sort_order=$5`,
      [c.id, c.name, c.slug, c.parent_id, c.sort_order]
    );
  }
  console.log(`Seeded ${categories.length} categories`);

  // Products
  for (const p of products) {
    await pool.query(
      `INSERT INTO products (name, slug, description, price, weight, category_id, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT DO NOTHING`,
      [p.name, p.slug, p.description, p.price, p.weight, p.category_id, p.sort_order]
    );
  }
  console.log(`Seeded ${products.length} products`);

  await pool.end();
  console.log('Seed complete!');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
