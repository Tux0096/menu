# Электронное меню — Фуджи Суши Friends

## Быстрый старт

```powershell
# 1. PostgreSQL (через Docker)
docker run -d --name menu-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_USER=postgres -e POSTGRES_DB=menu_db -p 5432:5432 postgres:17-alpine

# 2. Инициализировать схему и засеять рестораны
cd menu-api
node db/init.js
node db/seed.js

# 3. Загрузить меню из iiko (для каждого ресторана отдельно)
node db/sync-iiko.js
# или для одного ресторана:  node db/sync-iiko.js leningradskaya

# 4. Запустить всё одной командой
cd ..
.\start.ps1
```

Затем открыть в браузере: **http://localhost:3100/menu**

---

## Архитектура

```
menu/
├── menu-api/                         # REST API (Node.js + Express + PostgreSQL, порт 3101)
│   ├── app.js                        # Сервер
│   ├── db/
│   │   ├── pool.js                   # Подключение к PostgreSQL
│   │   ├── init.js                   # Создание таблиц
│   │   ├── seed.js                   # 7 ресторанов с organization_id
│   │   ├── sync-iiko.js              # Выгрузка меню для каждого ресторана из iiko
│   │   └── list-iiko-orgs.js         # Утилита: какие orgId доступны текущему iiko-ключу
│   └── .env                          # PG_*, IIKO_API_LOGIN
│
├── fuji-site2/fuji.ru/               # Nuxt 2 фронтенд (порт 3100)
│   ├── pages/menu/
│   │   ├── index.vue                 # Список 7 ресторанов
│   │   └── _slug/
│   │       ├── index.vue             # Меню ресторана (/menu/<slug>)
│   │       └── cart.vue              # Корзина (/menu/<slug>/cart)
│   ├── layouts/
│   │   ├── menu.vue                  # Лейаут меню
│   │   └── menu-select.vue           # Лейаут страницы выбора ресторана
│   └── store/menuApp.js              # Vuex store: ресторан + каталог + корзина
│
└── start.ps1                         # Скрипт запуска
```

## URL-адреса

| URL | Описание |
|-----|----------|
| `/menu` | Список всех 7 ресторанов |
| `/menu/leningradskaya` | Меню Фуджи Ленинградская, 60 |
| `/menu/kommunisticheskaya` | Меню Фуджи Коммунистическая, 27 |
| `/menu/novo-sadovaya` | Меню Фуджи Ново-Садовая, 24 |
| `/menu/dimitrova` | Меню Фуджи Георгия Димитрова, 110Б |
| `/menu/proseka` | Меню Фуджи 6-я Просека, 163 |
| `/menu/staro-zagora` | Меню Фуджи Стара Загора, 124А |
| `/menu/molodogvardeyskaya` | Меню Фуджи Молодогвардейская, 135 |
| `/menu/<slug>/cart` | Корзина ресторана |

Каждая ссылка может быть напрямую закодирована в QR — пользователь попадает в меню нужного ресторана.

## Привязка ресторан ↔ iiko

Каждый ресторан в БД хранит свой `organization_id` (UUID iiko-организации). Скрипт `sync-iiko.js` итерируется по всем ресторанам и вызывает `POST /api/1/nomenclature` отдельно для каждого `organization_id`. Продукты сохраняются в `products` с `restaurant_id`, поэтому у каждого ресторана своё меню.

| Slug | organization_id |
|------|-----------------|
| `leningradskaya` | 7b45efba-0c64-448a-8297-279f569ed25e |
| `kommunisticheskaya` | 26823617-16aa-4276-8d73-505afd052eac |
| `novo-sadovaya` | c1d51d6c-738f-410d-a92b-34c7d631c592 |
| `dimitrova` | 077264e3-1357-46bd-9e9a-117ce8339c31 |
| `proseka` | cef32475-d4e3-4f00-b32f-a921d3dee6dd |
| `staro-zagora` | b5bb5b34-8e94-4781-a209-5077577f5dde |
| `molodogvardeyskaya` | e41e1748-718b-41c6-8290-c7a27dced0b0 |

> ⚠️ Используемый iiko-ключ должен иметь доступ ко всем семи `organization_id`. Проверить, какие организации видит ключ:
> ```powershell
> cd menu-api
> npm run iiko:list
> ```

## API Endpoints

| Endpoint | Описание |
|----------|----------|
| `GET /api/v1/restaurants` | Список ресторанов |
| `GET /api/v1/restaurants/:slug` | Данные ресторана |
| `GET /api/v1/restaurants/:slug/catalog` | Меню ресторана (категории и продукты) |
| `GET /api/v1/setting` | Сводные настройки (для совместимости со store фронта) |
| `GET /health` | Проверка работоспособности |

## База данных

```
cities       — города
restaurants  — рестораны (slug, terminal_id, terminal_group_id, organization_id)
categories   — категории блюд (общий справочник)
products     — блюда (restaurant_id, iiko_id, name, price, image_url, …)
```

## Функционал

- Список из 7 ресторанов с уникальными ссылками для QR
- Меню по категориям, выгружается из iiko для каждого ресторана отдельно
- Поиск по меню
- Корзина: добавление, изменение количества, удаление, очистка
- Кнопка «Сменить ресторан»

Не реализовано (по ТЗ):
- Оформление и оплата заказа (только просмотр + корзина)
- Авторизация
- Доставка
