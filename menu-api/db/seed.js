import dotenv from 'dotenv';
dotenv.config();
import { default as pool } from './pool.js';

const SAMARA_ID = 'a85360f2-55a8-47cc-8a79-1eb88a40c4f0';

const cities = [
  { id: SAMARA_ID, name: 'Самара', slug: 'samara' },
];

// 7 ресторанов из ТЗ. Для каждого свой organization_id из iiko-adapter.config.js.
// Меню каждого ресторана выгружается из iiko по его organization_id отдельно.
const restaurants = [
  {
    name: 'Фуджи Ленинградская',
    address: 'Ленинградская, 60',
    city_id: SAMARA_ID,
    slug: 'leningradskaya',
    terminal_id: 'e4398867-351e-a3cf-018b-99dea3d09c51',
    terminal_group_id: 'fd6eb762-1baf-40a4-81cb-0bf895ad7c01',
    organization_id: '7b45efba-0c64-448a-8297-279f569ed25e',
    phone: '8 (927) 297-24-65',
    sort_order: 1,
  },
  {
    name: 'Фуджи Коммунистическая',
    address: 'Коммунистическая, 27',
    city_id: SAMARA_ID,
    slug: 'kommunisticheskaya',
    terminal_id: 'e4398867-351e-a3cf-018b-99d17a6e1ae7',
    terminal_group_id: 'e5eb2729-44fd-4505-bc0e-6610613f962c',
    organization_id: '26823617-16aa-4276-8d73-505afd052eac',
    phone: '8 (927) 208-08-77',
    sort_order: 2,
  },
  {
    name: 'Фуджи Ново-Садовая',
    address: 'Ново-Садовая, 24',
    city_id: SAMARA_ID,
    slug: 'novo-sadovaya',
    terminal_id: 'e4398867-351e-a3cf-018b-998cb7a874f2',
    terminal_group_id: '045e3232-3551-47ec-b3c6-a0656a027e8b',
    organization_id: 'c1d51d6c-738f-410d-a92b-34c7d631c592',
    phone: '8 (937) 646-94-09',
    sort_order: 3,
  },
  {
    name: 'Фуджи Георгия Димитрова',
    address: 'Георгия Димитрова, 110Б',
    city_id: SAMARA_ID,
    slug: 'dimitrova',
    terminal_id: 'e4398867-351e-a3cf-018b-99ac15ff8891',
    terminal_group_id: 'a6ce0b4b-2a2d-494a-abf9-6f230f9ef59f',
    organization_id: '077264e3-1357-46bd-9e9a-117ce8339c31',
    phone: '8 (927) 297-25-80',
    sort_order: 4,
  },
  {
    name: 'Фуджи 6-я Просека',
    address: '6-я Просека, 163',
    city_id: SAMARA_ID,
    slug: 'proseka',
    terminal_id: 'e4398867-351e-a3cf-018b-9a039dc8d7a4',
    terminal_group_id: '4af9bebc-2bbb-4885-80c5-576f7e74a8f9',
    organization_id: 'cef32475-d4e3-4f00-b32f-a921d3dee6dd',
    phone: '8 (937) 665-50-77',
    sort_order: 5,
  },
  {
    name: 'Фуджи Стара Загора',
    address: 'Стара Загора, 124А',
    city_id: SAMARA_ID,
    slug: 'staro-zagora',
    terminal_id: '04d22af9-0b31-947f-0195-b7921697b0f6',
    terminal_group_id: '2f1a5c1e-c6a2-4602-8025-77446da3925b',
    organization_id: 'b5bb5b34-8e94-4781-a209-5077577f5dde',
    phone: '8 (927) 297-24-65',
    sort_order: 6,
  },
  {
    name: 'Фуджи Молодогвардейская',
    address: 'Молодогвардейская, 135',
    city_id: SAMARA_ID,
    slug: 'molodogvardeyskaya',
    terminal_id: '02c55e58-bb32-cd42-0191-d75358a3d880',
    terminal_group_id: '4dca79a4-9692-4de1-b759-33f0c1eff024',
    organization_id: 'e41e1748-718b-41c6-8290-c7a27dced0b0',
    phone: '8 (927) 716-40-06',
    sort_order: 7,
  },
];

async function seed() {
  console.log('Starting seed...');

  for (const city of cities) {
    await pool.query(
      `INSERT INTO cities (id, name, slug) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
      [city.id, city.name, city.slug]
    );
  }
  console.log(`Seeded ${cities.length} cities`);

  for (const r of restaurants) {
    await pool.query(
      `INSERT INTO restaurants
         (name, address, city_id, slug, terminal_id, terminal_group_id, organization_id, phone, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         address = EXCLUDED.address,
         terminal_id = EXCLUDED.terminal_id,
         terminal_group_id = EXCLUDED.terminal_group_id,
         organization_id = EXCLUDED.organization_id,
         phone = EXCLUDED.phone,
         sort_order = EXCLUDED.sort_order`,
      [
        r.name,
        r.address,
        r.city_id,
        r.slug,
        r.terminal_id,
        r.terminal_group_id,
        r.organization_id,
        r.phone,
        r.sort_order,
      ]
    );
  }
  console.log(`Seeded ${restaurants.length} restaurants`);

  await pool.end();
  console.log('Seed complete! Run "npm run db:sync" to load menus from iiko.');
}

seed().catch((err) => {
  console.error('Seed error:', err);
  process.exit(1);
});
