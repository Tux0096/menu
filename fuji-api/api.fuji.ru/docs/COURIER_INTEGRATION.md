# Интеграция с курьерским приложением Фуджи

## Общая информация

Данный документ описывает интеграцию между курьерским приложением и API Фуджи для передачи статусов доставки.

## Архитектура системы

Система разделена на два типа статусов:
- **Статусы заказа** (таблица `orders`) - относятся к обработке и оплате заказа (NEW, WAIT_PAYMENT, PAYED, COMPLETED, ERROR_PAYMENT)
- **Статусы доставки** (таблица `deliveries`) - относятся к процессу приготовления и доставки (Unconfirmed, WaitCooking, ..., Delivered)

Каждый заказ на доставку автоматически получает связанную запись в таблице `deliveries`.

## Технические детали

### API эндпоинт

```
POST https://api.fuji.ru/api/v1/order/status-update
```

### Аутентификация

Система использует OAuth2-подобную авторизацию с JWT токенами и scope-based доступом.

#### 1. Получение токена
```http
POST /api/v1/auth/token
Content-Type: application/json

{
  "client_id": "courier_app",
  "client_secret": "super_secret_key_123456", 
  "grant_type": "client_credentials"
}
```

**Ответ:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": ["update:delivery-status", "read:delivery-status", "read:orders"]
}
```

**Ошибки аутентификации:**
```json
// 401 - Неверные credentials
{
  "error": "invalid_client",
  "error_description": "Недействительные учетные данные клиента"
}

// 400 - Неподдерживаемый grant_type
{
  "error": "unsupported_grant_type",
  "error_description": "Поддерживается только grant_type=client_credentials"
}
```

#### 2. Использование токена
```http
POST /api/v1/order/status-update
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "id": "e0584f8b-18db-417d-8af5-4845c9d5d35a",
  "number": 53203,
  "phone": "79991122334",
  "status": "Delivered"
}
```

### Формат данных

**Запрос:**

```json
{
  "id": "iiko_order_id_12345",
  "number": 53203,
  "phone": "79991122334",
  "status": "Delivered",
  "courierInfo": {
    "name": "Иван Петров",
    "phone": "79998887766"
  }
}
```

**Описание полей:**

| Поле | Тип | Обязательное | Описание |
|------|-----|--------------|----------|
| id | string | Да | ID заказа в системе iiko (UUID) |
| number | integer | Да | Номер заказа |
| phone | string | Да | Телефон клиента (формат: 7XXXXXXXXXX) |
| status | string | Да | Статус доставки (см. enum ниже) |
| courierInfo | object | Нет | Информация о курьере (имя, телефон) |

**Допустимые статусы (ENUM):**
```
'Unconfirmed', 'WaitCooking', 'ReadyForCooking', 'CookingStarted',
'CookingCompleted', 'Waiting', 'OnWay', 'OnWayCourier', 'CourierNearby',
'Delivered', 'Closed', 'Cancelled'
```

### Режимы работы

Система поддерживает два режима обработки статусов:

#### 1. Синхронный режим (ORDER_STATUS_SYNC=true)
Статус обновляется немедленно и возвращается результат.

**Успешный ответ (200):**
```json
{
  "success": true,
  "message": "Статус доставки успешно обновлен",
  "data": {
    "deliveryId": 123,
    "orderId": 53203,
    "status": "Delivered"
  }
}
```

#### 2. Асинхронный режим (через RabbitMQ)
Запрос принимается в очередь для обработки.

**Ответ (200):**
```json
{
  "success": true,
  "message": "Запрос на обновление статуса доставки принят в обработку",
  "data": {
    "status": "pending"
  }
}
```

### Коды ошибок

| Код | Сообщение | Описание |
|-----|-----------|----------|
| 400 | Bad Request | Неверный формат данных |
| 401 | Unauthorized | Ошибка аутентификации (невалидный токен) |
| 403 | Forbidden | Недостаточно прав доступа (scope) |
| 404 | DELIVERY_NOT_FOUND | Доставка не найдена |
| 500 | DELIVERY_STATUS_UPDATE_ERROR | Внутренняя ошибка обновления статуса |

**Примеры ошибок:**
```json
// 403 - Недостаточно прав
{
  "message": "Недостаточно прав доступа",
  "code": "INSUFFICIENT_SCOPE",
  "description": "У вас нет необходимых разрешений для выполнения этого действия.",
  "data": {
    "required_scopes": ["update:delivery-status"],
    "client_scopes": ["read:orders"]
  }
}

// 404 - Доставка не найдена
{
  "error": "Доставка не найдена",
  "code": "DELIVERY_NOT_FOUND"
}
```

## Статусы доставки

| Статус (API) | Отображение (RU) | Описание |
|--------------|------------------|----------|
| Unconfirmed | Заказ не подтвержден | Заказ создан, но еще не подтвержден |
| WaitCooking | Ожидает приготовления | Заказ подтвержден и ожидает начала приготовления |
| ReadyForCooking | Готов к приготовлению | Заказ готов к началу приготовления |
| CookingStarted | Заказ готовится | Начат процесс приготовления |
| CookingCompleted | Приготовление завершено | Заказ приготовлен и готов к доставке |
| Waiting | Ожидает курьера | Заказ ожидает курьера для доставки |
| OnWay | В пути | Заказ в процессе доставки |
| OnWayCourier | Курьер в пути | Курьер направляется к клиенту |
| CourierNearby | Курьер рядом | Курьер прибыл к месту доставки |
| Delivered | Заказ доставлен | Заказ успешно доставлен клиенту |
| Closed | Заказ закрыт | Заказ полностью завершен |
| Cancelled | Заказ отменен | Заказ отменен |

## Алгоритм поиска доставки

Система ищет доставку в следующем порядке приоритета:

1. **По iikoId** - если передан `id` (UUID из iiko), ищем по полю `iikoId` в таблице `deliveries`
2. **По телефону** - поиск последнего заказа по телефону клиента где `iikoId = null` (сортировка по `createdAt DESC`)

### Важные особенности поиска:
- При поиске по телефону система ищет только доставки без привязанного `iikoId`
- Если передан `id`, система автоматически привязывает его к найденной доставке
- Если передан `number`, система обновляет номер доставки

## Push-уведомления

Система отправляет push-уведомления клиентам только для **ключевых статусов**:

### Статусы с уведомлениями:
1. **CookingCompleted** - "Приготовление завершено. Заказ #{number}. Приготовление завершено."
2. **OnWay** - "В пути. Заказ #{number}. В пути."

### Механизм отправки:
- Уведомления отправляются через Firebase Cloud Messaging (FCM)
- Получение токенов устройств через `notificationService.getCustomerDevices()`
- Массовая отправка через `notificationService.sendBulkNotifications()`
- В сообщении происходит подстановка `{number}` на номер доставки

## WebSocket уведомления

При каждом обновлении статуса доставки отправляется WebSocket сообщение:

```javascript
{
  "type": "order:status_update",
  "orderId": 123,
  "userId": "user-uuid",
  "status": "Delivered",
  "previousStatus": "CourierNearby",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

Сообщение отправляется конкретному пользователю через `connectionManager.sendMessageToUser()`.

## Логирование

Все изменения статусов записываются в таблицу `order_status_logs`:

```sql
CREATE TABLE order_status_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  orderId INT NOT NULL,
  externalId VARCHAR(255),
  phone VARCHAR(20),
  previousStatus VARCHAR(50),
  newStatus VARCHAR(50) NOT NULL,
  source ENUM('COURIER_APP', 'ADMIN', 'SYSTEM', 'CUSTOMER') DEFAULT 'SYSTEM',
  rawData TEXT, -- JSON с полными данными запроса
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

### Поля лога:
- **source** - всегда `'COURIER_APP'` для этой интеграции
- **rawData** - JSON с полными данными запроса
- **phone** - нормализованный телефон клиента
- **previousStatus/newStatus** - старый и новый статус

## События системы

При обновлении статуса доставки генерируется событие:

```javascript
eventEmitter.emit('delivery:status_change', {
  deliveryId: 123,
  orderId: 53203,
  status: 'Delivered',
  previousStatus: 'CourierNearby',
  statusData: { /* полные данные запроса */ }
});
```

## Дополнительные возможности

### Обновление времени доставки
При статусе `"Delivered"` автоматически устанавливается поле `actualDeliveryTime` в текущее время.

### Информация о курьере
Опциональное поле `courierInfo` сохраняется в записи доставки и может содержать:
```json
{
  "name": "Иван Петров",
  "phone": "79998887766"
}
```

### Асинхронная обработка
- Использует RabbitMQ для очередей
- Worker: `order-status-worker.js`
- Механизм повторных попыток при ошибках
- Dead Letter Queue для проблемных сообщений

## Мониторинг и отладка

### Логирование ошибок
Все ошибки логируются через Winston с указанием:
- ID заказа/доставки
- Телефон клиента
- Статус и данные запроса
- Stack trace ошибки

### Отладочная информация
```javascript
logger.log(`Обработка обновления статуса доставки для заказа: ${statusData.id}`);
logger.log(`Обновление статуса доставки для заказа ${statusData.id} успешно обработано`);
```

### Проверка статуса асинхронной обработки
При асинхронном режиме можно отслеживать обработку через логи worker'а.

## Примеры использования

### Успешное обновление статуса
```bash
curl -X POST https://api.fuji.ru/api/v1/order/status-update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "e0584f8b-18db-417d-8af5-4845c9d5d35a",
    "number": 53203,
    "phone": "79991122334",
    "status": "Delivered",
    "courierInfo": {
      "name": "Иван Петров",
      "phone": "79998887766"
    }
  }'
```

### Обновление по телефону (без iikoId)
```bash
curl -X POST https://api.fuji.ru/api/v1/order/status-update \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "number": 53203,
    "phone": "79991122334", 
    "status": "OnWay"
  }'
``` 
