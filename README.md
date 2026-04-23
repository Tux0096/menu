# Электронное меню — Фуджи Суши Friends

## Быстрый старт

```powershell
# Запустить всё одной командой:
.\start.ps1
```

Затем открыть в браузере: **http://localhost:3100/menu**

---

## Архитектура

```
menu/
├── menu-api/          # REST API (Node.js + Express + PostgreSQL)
│   ├── app.js         # Сервер на порту 3101
│   ├── db/
│   │   ├── pool.js    # Подключение к PostgreSQL
│   │   ├── init.js    # Создание таблиц
│   │   └── seed.js    # Заполнение тестовыми данными
│   └── .env           # Настройки БД
│
├── fuji-site2/fuji.ru/  # Nuxt 2 фронтенд (порт 3100)
│   ├── pages/menu/      # Страницы электронного меню
│   │   ├── index.vue    # Выбор ресторана (/menu)
│   │   └── _slug/
│   │       ├── index.vue  # Меню ресторана (/menu/koshelev)
│   │       └── cart.vue   # Корзина (/menu/koshelev/cart)
│   ├── layouts/
│   │   ├── menu.vue       # Лайаут для страниц меню
│   │   └── menu-select.vue  # Лайаут для страницы выбора ресторана
│   └── store/menu.js      # Vuex store для текущего ресторана
│
└── start.ps1          # Скрипт запуска
```

## URL-адреса

| URL | Описание |
|-----|----------|
| `/menu` | Список всех ресторанов |
| `/menu/koshelev` | Меню ресторана "Фуджи Кошелев" |
| `/menu/dimitrova` | Меню ресторана "Фуджи Димитрова" |
| `/menu/leningradskaya` | Меню ресторана "Фуджи Ленинградская" |
| `/menu/:slug/cart` | Корзина для ресторана |

## Доступные slug-и ресторанов

**Самара:**
- `koshelev` — Кошелев Бульвар Финютина, 41
- `dimitrova` — Димитрова, 110Б
- `fizkulturnaya` — Физкультурная, 98
- `novo-sadovaya` — Ново-Садовая, 24
- `kommunisticheskaya` — Коммунистическая, 27
- `molodogvardeyskaya` — Молодогвардейская, 135
- `leningradskaya` — Ленинградская, 60
- `proseka` — 6-я Просека, 163
- `dolotnyy` — Долотный, 9
- `yuzhnyy-gorod` — Николаевский пр., 38
- `dmitriya-donskogo` — Дмитрия Донского, 12
- `kirova` — Георгия Димитрова, 131

**Тольятти:**
- `tolyatti-karla-marksa` — Карла Маркса, 76
- `tolyatti-avrora` — Автостроителей, 56А

**Новокуйбышевск:**
- `novokuybyshevsk` — Дзержинского, 29

## API Endpoints

| Endpoint | Описание |
|----------|----------|
| `GET /api/v1/catalog` | Каталог блюд |
| `GET /api/v1/setting` | Настройки (рестораны, меню) |
| `GET /api/v1/restaurants` | Список ресторанов |
| `GET /api/v1/restaurants/:slug` | Данные конкретного ресторана |
| `GET /api/v1/city` | Список городов |
| `GET /health` | Проверка работоспособности |

## База данных (PostgreSQL)

База данных: `menu_db` на `localhost:5432`

```powershell
# Переинициализировать БД:
cd menu-api
node db/init.js
node db/seed.js

# Подключиться к БД:
$env:Path += ";C:\PostgreSQL\17\bin"
psql -U postgres -d menu_db
```

### Таблицы
- `cities` — города
- `restaurants` — рестораны (адрес, slug, terminal_id)
- `categories` — категории блюд
- `products` — блюда (название, цена, описание, вес)

## Функционал

✅ Список ресторанов с отдельными URL для каждого  
✅ Меню блюд по категориям  
✅ Добавление блюд в корзину  
✅ Просмотр и управление корзиной  
✅ Кнопка "Корзина" в шапке с счётчиком  
✅ Нижняя панель с итогом (когда есть товары в корзине)  
✅ Кнопка "Сменить ресторан"  

❌ Оформление заказа (убрано по ТЗ)  
❌ Авторизация (не требуется)  
❌ Доставка (не требуется)  
