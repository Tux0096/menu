# API для массовой рассылки push-уведомлений от ремаркета

## Обзор

Реализован отдельный API сервис для приема push-уведомлений от системы ремаркет и их отправки через Firebase. API вынесен в отдельный роутер `remarked/` для изоляции от основных сервисов уведомлений.

## Эндпоинт

```
POST /api/v1/remarked/push-messages/bulk-send
```

## Аутентификация

**Basic Authentication** через систему **external_clients** - требуется регистрация клиента `remarked` в базе данных.

```http
Authorization: Basic <base64(remarked:client_secret)>
```

**Система безопасности:**
- Пароли хешируются с помощью bcrypt (12 rounds)
- Проверка через таблицу `external_clients`
- Автоматическое логирование всех попыток аутентификации
- Возможность деактивации клиента

## Настройка клиента

### Создание клиента remarked

Перед использованием API необходимо создать клиента в базе данных:

```bash
cd api.fuji.ru
node scripts/create-remarked-client.js [password]
```

**Если пароль не указан, будет сгенерирован случайный.**

### Пример вывода скрипта:
```
🔑 Создание/обновление клиента remarked в external_clients...
📱 Client ID: remarked
🔐 Password: your_secure_password
✅ Клиент успешно создан/обновлен

📋 Данные для подключения к API:
   Client ID: remarked
   Password: your_secure_password
   Base64: cmVtYXJrZWQ6eW91cl9zZWN1cmVfcGFzc3dvcmQ=
```

## Запрос

### Headers
```http
Content-Type: application/json
Authorization: Basic <credentials>
```

### Body (application/json)
```json
{
  "phone_numbers": ["+79178198209", "+79178198210"],
  "title": "Заголовок пуша",
  "text": "Описание пуша"
}
```

### Поля

- **phone_numbers** (array of strings) — список телефонных номеров пользователей
  - Обязательное поле
  - Минимум 1 номер
  - Формат: +79178198209 (обязательно +7 и 10 цифр)
  
- **title** (string) — заголовок push-сообщения
  - Обязательное поле
  - Длина: 1-100 символов
  
- **text** (string) — текст push-сообщения
  - Обязательное поле
  - Длина: 1-500 символов

## Ответы

### 200 OK - Успешная отправка

Возвращает список номеров телефонов, для которых успешно инициирована отправка push-сообщения:

```json
{
  "phone_numbers": ["+79178198209", "+79178198210"]
}
```

### 400 Bad Request - Ошибка валидации

```json
{
  "message": "Ошибка валидации",
  "code": "VALIDATION_ERROR",
  "description": "Детали ошибки валидации"
}
```

### 401 Unauthorized - Отсутствует аутентификация

```json
{
  "message": "Отсутствует Basic Authentication",
  "code": "INVALID_BASIC_AUTH",
  "description": "Необходимо передать данные аутентификации в заголовке Authorization: Basic <credentials>."
}
```

### 403 Forbidden - Недостаточно прав

```json
{
  "message": "Недостаточно прав доступа",
  "code": "FORBIDDEN",
  "description": "У вас нет прав для выполнения этого действия."
}
```

### 500 Internal Server Error - Внутренняя ошибка

```json
{
  "message": "Внутренняя ошибка сервера",
  "code": "INTERNAL_SERVER_ERROR",
  "description": "Произошла ошибка при отправке push-уведомлений."
}
```

## Примеры использования

### cURL

```bash
curl -X POST "http://api.fuji.ru/api/v1/remarked/push-messages/bulk-send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'remarked:your_secure_password' | base64)" \
  -d '{
    "phone_numbers": ["+79178198209", "+79178198210"],
    "title": "Заголовок пуша",
    "text": "Описание пуша"
  }'
```

### JavaScript/Node.js

```javascript
const axios = require('axios');

// Кодирование Basic Auth
const basicAuth = Buffer.from('remarked:your_secure_password').toString('base64');

const data = {
  phone_numbers: ['+79178198209', '+79178198210'],
  title: 'Заголовок пуша',
  text: 'Описание пуша'
};

try {
  const response = await axios.post(
    'http://api.fuji.ru/api/v1/remarked/push-messages/bulk-send',
    data,
    {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  console.log('Успешно отправлено:', response.data.phone_numbers);
} catch (error) {
  console.error('Ошибка:', error.response?.data);
}
```

## Архитектура

### Изоляция API

- Remarked API вынесен в отдельный роутер `remarked/remarked.router.js`
- Не пересекается с основными notification API endpoints
- Независимое логирование и обработка ошибок
- Собственная схема валидации в `remarked/remarked.schema.js`

### Поиск устройств

- Для каждого указанного номера проверяется наличие устройства с авторизацией в системе
- Если номера не найдены в базе устройств, они не будут включены в ответ
- В ответе возвращаются только те номера, для которых найдены активные устройства с FCM токенами

### Асинхронная отправка

- Отправка происходит асинхронно через очередь RabbitMQ
- API немедленно возвращает ответ о том, что отправка инициирована
- Фактическая доставка происходит через Firebase Cloud Messaging

### Интеграция с существующей системой

- Использует существующую инфраструктуру push-уведомлений
- Совместим с мобильными приложениями и веб-устройствами
- Поддерживает все существующие настройки Firebase

## Файлы проекта

### Remarked API компоненты

- `remarked/remarked.router.js` - основной роутер API
- `remarked/remarked.schema.js` - схемы валидации Fastify
- `remarked/remarked-auth.service.js` - сервис аутентификации через external_clients
- `middleware/basic-auth.middleware.js` - Basic Auth middleware с проверкой паролей
- `scripts/create-remarked-client.js` - скрипт создания клиента
- `notification/notification.service.js` - бизнес-логика (функция `sendBulkNotificationsByPhoneNumbers`)
- `notification/notification.repository.js` - работа с БД (функция `getTokensByPhoneNumbers`)

### Регистрация в роутере

В `router.js` добавлена строка:
```javascript
fastify.register(remarkedRouter, { prefix: '/api/v1/remarked' });
```

## Мониторинг и логирование

Все запросы к Remarked API логируются с дополнительной информацией:
- Количество запрошенных номеров телефонов  
- Количество найденных устройств
- Заголовок сообщения
- Client ID и название клиента из external_clients
- Все попытки аутентификации (успешные и неуспешные)
- Ошибки с полным stack trace

### Безопасность

- Пароли никогда не логируются в открытом виде
- Хеширование bcrypt с 12 rounds
- Возможность деактивации клиента без удаления из БД
- Проверка активности клиента при каждом запросе
