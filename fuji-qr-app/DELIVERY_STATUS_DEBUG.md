# Система статусов доставки

## Описание
Система отслеживания статусов доставки с получением данных из таблицы `deliveries` и real-time обновлениями через WebSocket.

## Архитектура

### 1. Бэкенд (API)

#### `user.repository.js`
- Корректная выборка данных из таблицы `deliveries` с явными атрибутами
- Преобразование в `plain object` для корректной сериализации
- Фильтрация активных заказов по статусам доставки

#### `user.service.js`
- Форматирование данных для фронтенда
- Включение всех необходимых полей доставки (`iikoId`, `externalId`, `courierInfo`)

### 2. Фронтенд

#### `store/order.js`
- Управление состоянием активного заказа
- Геттеры для извлечения статуса доставки и информации о курьере

#### `StatusStepper.vue`
- Визуальное отображение прогресса заказа
- Правильная подписка на WebSocket события через централизованный плагин
- Использование window events для получения обновлений статуса

#### `plugins/websocket.client.js`
- Централизованная обработка WebSocket сообщений
- Автоматическое обновление store при получении `order:status_update`
- Отправка window events для компонентов

## Тестирование

### 1. Создание тестовых данных
```sql
-- Выполнить скрипт
source api.fuji.ru/sql/test_delivery_status.sql
```

### 2. Проверка API
```bash
# Получение активного заказа тестового пользователя
curl -X GET "http://localhost:3000/api/v1/user/test-user-123/active-order" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Обновление статуса
```sql
-- Выполнить скрипт для изменения статуса
source api.fuji.ru/sql/update_delivery_status.sql
```

### 4. Проверка в браузере
1. Открыть DevTools → Console
2. Авторизоваться как тестовый пользователь
3. Проверить работу StatusStepper:
   - Компонент должен отображаться при наличии активного заказа
   - Статус должен корректно отображаться из таблицы `deliveries`
   - При изменении статуса в БД компонент должен обновляться через WebSocket

## Структура данных

### Ответ API `/user/:id/active-order`
```json
{
  "id": 999999,
  "userId": "test-user-123",
  "total": 1500.00,
  "status": "PAYED",
  "createdAt": "2024-01-01T12:00:00.000Z",
  "delivery": {
    "id": 1,
    "status": "CookingStarted",
    "estimatedDeliveryTime": "2024-01-01T12:45:00.000Z",
    "courierInfo": {
      "name": "Иван Курьеров",
      "phone": "+79009876543"
    },
    "iikoId": null,
    "externalId": null
  }
}
```

### Статусы доставки (из таблицы `deliveries`)
- `Unconfirmed` - Заказ не подтвержден
- `WaitCooking` - Ожидает приготовления  
- `ReadyForCooking` - Готов к приготовлению
- `CookingStarted` - Приготовление начато
- `CookingCompleted` - Приготовление завершено
- `Waiting` - Ожидает курьера
- `OnWay` - В пути
- `OnWayCourier` - Курьер в пути
- `CourierNearby` - Курьер рядом
- `Delivered` - Доставлен
- `Closed` - Закрыт
- `Cancelled` - Отменен

## Отладочные команды

### Проверка связей в БД
```sql
SELECT 
    o.id as order_id,
    o.userId,
    o.status as order_status,
    d.id as delivery_id,
    d.status as delivery_status,
    d.courierInfo
FROM orders o
LEFT JOIN deliveries d ON o.id = d.orderId
WHERE o.userId = 'test-user-123'
ORDER BY o.createdAt DESC
LIMIT 5;
```

### Проверка активных заказов
```sql
SELECT 
    o.id,
    o.userId,
    o.status as order_status,
    d.status as delivery_status
FROM orders o
LEFT JOIN deliveries d ON o.id = d.orderId
WHERE o.status IN ('NEW', 'WAIT_PAYMENT', 'PAYED')
  AND (d.status IS NULL OR d.status NOT IN ('Delivered', 'Closed', 'Cancelled'));
```

## Удаление тестовых данных
```sql
DELETE FROM deliveries WHERE orderId = 999999;
DELETE FROM orders WHERE id = 999999;
DELETE FROM customers WHERE id = 'test-user-123';
``` 