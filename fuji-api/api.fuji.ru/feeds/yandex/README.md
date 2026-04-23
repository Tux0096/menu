# Модуль товарных фидов Яндекс

Автоматическая генерация XML-фида в формате YML (Yandex Market Language) для синхронизации товаров с Яндекс.Картами. Позволяет избежать ручного редактирования карточек товаров через Личный кабинет Яндекс.Карт.

## 🚀 URL для настройки в Яндекс.Картах

**Production:**
- Самара: `https://api.fuji.ru/api/v1/feeds/yandex?city=samara`
- Тольятти: `https://api.fuji.ru/api/v1/feeds/yandex?city=tolyatti`
- Новокуйбышевск: `https://api.fuji.ru/api/v1/feeds/yandex?city=novokujbyshevsk`


## 📋 API Endpoints

### GET /api/v1/feeds/yandex?city={city}
Получить XML фид в формате YML для указанного города.

**Query параметры:**
- `city` (optional) - Город: `samara` (default), `tolyatti`, `novokujbyshevsk`

**Response:**
- Content-Type: `application/xml; charset=utf-8`
- Формат: YML (Yandex Market Language)

## 🏗️ Архитектура модуля

```
feeds/yandex/
├── feed.config.js    # Конфигурация фида (города, настройки)
├── feed.helper.js    # Утилиты генерации XML (header, categories, offers)
├── feed.service.js   # Бизнес-логика (фильтрация, кеширование)
└── feed.router.js    # API endpoints (Fastify роуты)
```

## ⚙️ Ключевые особенности

### 1. Умная фильтрация товаров

- ✅ Только опубликованные товары (`isPublished = true`)
- ✅ Исключены удаленные (`isDeleted = false`)
- ✅ Исключены модификаторы (по `modifierId` из `groupModifiers`)
- ✅ Исключены служебные категории (`isServiceGroup`, `isIncludedInMenu = false`)
- ✅ Товары с обязательными полями (id, name, price, parentGroup)

### 2. Динамический расчет цены

Для товаров с `price = 0` цена рассчитывается из минимальных значений **обязательных модификаторов**:

```javascript
// Пример: товар с price=0 + обязательная группа модификаторов
// Модификаторы: [50₽, 100₽, 150₽]
// Итоговая цена в фиде: 50₽ (минимальная)
```

### 3. Иерархические URL категорий

URL строятся с учетом всей цепочки родительских категорий (если у категорий есть parentId):

```
https://fuji.ru/samara/catalog/rolly/zapazhennye-rolly/zapazhennyj-s-lososem
                      └──────┘ └──────────────────┘ └────────────────────────┘
                      parent   child category       product
```

### 4. Оптимизация изображений (IPX)

Все изображения автоматически оптимизируются через IPX сервис:

```
https://api-v3.fuji.ru/_ipx/f_webp,q_100,s_500x500/uploads/shop/full/image.png
                       └──────────────────────────┘
                       WebP, качество 100%, 500x500px
```

### 5. Корректное отображение характеристик

**Вес:**
- В БД: килограммы (0.2 кг)
- В фиде: граммы (200 г)
- Формула: `Math.round(weight * 1000)`

**БЖУ и энергетическая ценность:**
- Белки: `fiberAmount` (с точностью до 0.1 г)
- Жиры: `fatAmount` (с точностью до 0.1 г)
- Углеводы: `carbohydrateAmount` (с точностью до 0.1 г)
- Калории: `energyAmount` (ккал)

### 6. Кеширование

Кеш на основе ревизии каталога (`storageService.getRevision()`):
- Ключ: `${city}-${revision}`
- Автоматическая инвалидация при изменении каталога
- Раздельный кеш для каждого города

## 📊 Структура YML фида

```xml
<?xml version="1.0" encoding="UTF-8"?>
<yml_catalog date="2026-01-28 21:00">
  <shop>
    <name>Fuji - доставка суши и пиццы</name>
    <company>ООО «Фуджи»</company>
    <url>https://fuji.ru</url>
    <currencies>
      <currency id="RUB" rate="1"/>
    </currencies>
    <categories>
      <category id="..." parentId="...">Категория</category>
    </categories>
    <offers>
      <offer id="..." available="true">
        <name>Название товара</name>
        <vendor>Fuji</vendor>
        <url>https://fuji.ru/samara/catalog/...</url>
        <price>319</price>
        <currencyId>RUB</currencyId>
        <categoryId>...</categoryId>
        <picture>https://api-v3.fuji.ru/_ipx/...</picture>
        <delivery>true</delivery>
        <pickup>true</pickup>
        <description>Описание товара</description>
        <param name="Вес">200 г</param>
        <param name="Энергетическая ценность">259.6 ккал</param>
        <param name="Белки">4.5 г</param>
        <param name="Жиры">12.3 г</param>
        <param name="Углеводы">31.2 г</param>
      </offer>
    </offers>
  </shop>
</yml_catalog>
```

## 🧪 Тестирование

```bash
# Скачать фид для Самары
curl http://localhost:3101/api/v1/feeds/yandex?city=samara > feed.xml

# Проверить формат
xmllint --noout feed.xml

# Посмотреть количество товаров
grep -c "<offer" feed.xml
```

## 🔗 Интеграция с проектом

Модуль использует существующую инфраструктуру:

- `catalog.service.js` - получение товаров и категорий с фильтрацией по городу
- `storage.service.js` - ревизия каталога для кеширования
- `env.js` - переменные окружения (`FRONTEND_URL`, `API_FULL_URL`)
- `CLogger` - структурированное логирование

## 📚 Документация

- [YML спецификация Яндекс](https://github.com/yandex/yandex-ecom-search)
- [Подключение фида в Яндекс.Карты](https://yandex.ru/support/merchants/ru/connect/form-feed)
