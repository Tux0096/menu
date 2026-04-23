# Товарный фид Яндекс.Карт

## Описание

Модуль для генерации товарного фида в формате YML (Yandex Market Language) для автоматической синхронизации каталога товаров с Яндекс.Картами.

## API Endpoints

### 1. Получение фида
**GET** `/api/v1/feeds/yandex?city={city}`

Параметры:
- `city` - samara, tolyatti, novokujbyshevsk

Примеры:
```bash
curl https://api.fuji.ru/api/v1/feeds/yandex?city=samara
```

### 2. Статистика фида
**GET** `/api/v1/feeds/yandex/stats?city={city}`

### 3. Очистка кеша
**POST** `/api/v1/feeds/yandex/clear-cache`

## URL для Яндекс.Карт

- Самара: https://api.fuji.ru/api/v1/feeds/yandex?city=samara
- Тольятти: https://api.fuji.ru/api/v1/feeds/yandex?city=tolyatti
- Новокуйбышевск: https://api.fuji.ru/api/v1/feeds/yandex?city=novokujbyshevsk

## Конфигурация

Настройки в `feeds/yandex/feed.config.js`:
- Название компании (TODO: заменить на реальное)
- URL сайта
- Условия доставки и самовывоза

## Мониторинг

```bash
# Статистика
curl https://api.fuji.ru/api/v1/feeds/yandex/stats?city=samara

# Скачать фид
curl https://api.fuji.ru/api/v1/feeds/yandex?city=samara > feed.xml
```

## Полезные ссылки

- [Документация YML](https://github.com/yandex/yandex-ecom-search)
- [Личный кабинет Яндекс.Карты](https://yandex.ru/profile)
