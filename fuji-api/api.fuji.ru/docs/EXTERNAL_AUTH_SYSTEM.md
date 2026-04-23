# Система авторизации для внешних систем

## Обзор

Реализована OAuth2-подобная система авторизации, позволяющая внешним системам (приложению курьера, CRM, и т.п.) получать доступ к API через JWT-токены с ограниченными правами доступа (scope).

## Архитектура

### Компоненты системы

1. **ExternalClients модель** (`models/external-clients.js`) - хранение клиентов и их credentials
2. **external-auth.service.js** - бизнес-логика аутентификации и управления токенами
3. **scope.middleware.js** - middleware для проверки JWT токенов и scope
4. **external-auth.router.js** - HTTP эндпоинты для работы с токенами
5. **external-auth.schema.js** - Fastify схемы валидации

### База данных

**Таблица `external_clients`:**
```sql
CREATE TABLE external_clients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  client_id VARCHAR(100) UNIQUE NOT NULL,
  client_secret VARCHAR(255) NOT NULL, -- хешированный bcrypt
  name VARCHAR(200) NOT NULL,
  scopes TEXT NOT NULL DEFAULT '[]', -- JSON массив разрешений
  is_active BOOLEAN DEFAULT TRUE,
  token_expires_in INT DEFAULT 3600,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

## API Эндпоинты

### 1. Получение токена
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

**Ошибки:**
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

### 2. Использование токена
```http
POST /api/v1/order/status-update
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "id": "e0584f8b-18db-417d-8af5-4845c9d5d35a",
  "status": "Delivered",
  "number": 12345,
  "phone": "79991234567",
  "type": "Delivery"
}
```

## Система разрешений (Scopes)

### Формат scope
Используется формат `действие:ресурс`:

### Доступные Scopes
```javascript
// Управление заказами
READ_ORDERS: 'read:orders',
WRITE_ORDERS: 'write:orders',

// Управление статусами доставки  
UPDATE_DELIVERY_STATUS: 'update:delivery-status',
READ_DELIVERY_STATUS: 'read:delivery-status',

// Управление клиентами
READ_CLIENTS: 'read:clients',
WRITE_CLIENTS: 'write:clients',

// Административные функции
ADMIN_USERS: 'admin:users',
ADMIN_SYSTEM: 'admin:system',
```

### Использование в middleware
```javascript
import scopeMiddleware, { SCOPES } from '../middleware/scope.middleware.js';

// Использование одного scope
preValidation: scopeMiddleware(SCOPES.UPDATE_DELIVERY_STATUS)

// Проверка нескольких scope (все должны присутствовать)
preValidation: scopeMiddleware([SCOPES.READ_ORDERS, SCOPES.WRITE_ORDERS])
```

## JWT Token Payload

```json
{
  "sub": "courier_app",                    // client_id
  "scope": ["update:delivery-status"],     // массив разрешений
  "client_name": "Курьерское приложение",  // имя клиента
  "iat": 1640995200,                       // время выдачи
  "exp": 1641002400,                       // время истечения
  "iss": "fuji-api"                        // издатель
}
```

## Администрирование

### Создание клиента
```http
POST /api/v1/auth/admin/clients
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "client_id": "new_client",
  "client_secret": "secure_password_123",
  "name": "Новое приложение",
  "scopes": ["read:orders", "update:delivery-status"],
  "description": "Описание приложения",
  "token_expires_in": 3600
}
```

**Ответ:**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "client_id": "new_client",
    "clientId": "new_client",
    "name": "Новое приложение",
    "scopes": ["read:orders", "update:delivery-status"],
    "token_expires_in": 3600,
    "description": "Описание приложения",
    "is_active": true,
    "created_at": "2024-01-01T12:00:00.000Z"
  }
}
```

### Получение списка клиентов
```http
GET /api/v1/auth/admin/clients
Authorization: Bearer <admin_token>
```

**Ответ:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "client_id": "courier_app",
      "clientId": "courier_app",
      "name": "Курьерское приложение",
      "scopes": ["update:delivery-status", "read:delivery-status"],
      "is_active": true,
      "token_expires_in": 3600,
      "description": "Приложение для курьеров",
      "created_at": "2024-01-01T12:00:00.000Z"
    }
  ]
}
```

### Обновление прав доступа
```http
PUT /api/v1/auth/admin/clients/courier_app/scopes
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "scopes": ["read:orders", "update:delivery-status", "read:delivery-status"]
}
```

**Ответ:**
```json
{
  "success": true,
  "message": "Разрешения клиента успешно обновлены"
}
```

### Деактивация клиента
```http
DELETE /api/v1/auth/admin/clients/courier_app
Authorization: Bearer <admin_token>
```

**Ответ:**
```json
{
  "success": true,
  "message": "Клиент успешно деактивирован"
}
```

## Безопасность

### Хеширование паролей
- Используется bcrypt с salt rounds = 12
- Client secret никогда не возвращается в ответах API

### JWT токены
- Алгоритм подписи: HS256
- Секретный ключ: `API_COURIER_SECRET_KEY` или `API_JWT_SECRET_KEY`
- Проверка issuer: `fuji-api`
- Автоматическое истечение по времени

### Middleware обработка ошибок
```javascript
// 401 - Недействительный токен
{
  "message": "Недействительный или отсутствующий токен",
  "code": "INVALID_TOKEN",
  "description": "Пожалуйста, предоставьте действительный Bearer токен."
}

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
```

### Коды ошибок
- `401` - Недействительные credentials или истекший токен
- `403` - Недостаточно прав доступа (scope)
- `404` - Клиент не найден
- `409` - client_id уже существует
- `500` - Внутренняя ошибка сервера

## Примеры интеграции

### Курьерское приложение
```javascript
// 1. Получение токена
const tokenResponse = await fetch('/api/v1/auth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: 'courier_app',
    client_secret: 'super_secret_key_123456',
    grant_type: 'client_credentials'
  })
});

const { access_token } = await tokenResponse.json();

// 2. Обновление статуса заказа
const statusResponse = await fetch('/api/v1/order/status-update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    id: 'order-uuid',
    status: 'Delivered',
    number: 12345,
    phone: '79991234567',
    type: 'Delivery'
  })
});
```

### CRM система
```javascript
// Клиент с правами чтения заказов
const crmClient = {
  client_id: 'crm_system',
  scopes: ['read:orders', 'read:delivery-status']
};

// Использование для получения заказов
const ordersResponse = await fetch('/api/v1/order/', {
  headers: { 'Authorization': `Bearer ${access_token}` }
});
```

## Миграция с существующей системы

Если ранее использовался `courierMiddleware`, замените его на:

```javascript
// Было:
import courierMiddleware from '../middleware/courier.middleware.js';
preValidation: courierMiddleware()

// Стало:
import scopeMiddleware, { SCOPES } from '../middleware/scope.middleware.js';
preValidation: scopeMiddleware(SCOPES.UPDATE_DELIVERY_STATUS)
```

### Разница в токенах
**Старый courier middleware:**
```json
{
  "system": "courier",
  "iat": 1234567890,
  "exp": 1234567890
}
```

**Новая система:**
```json
{
  "sub": "courier_app",
  "scope": ["update:delivery-status"],
  "client_name": "Курьерское приложение",
  "iat": 1234567890,
  "exp": 1234567890,
  "iss": "fuji-api"
}
```

## Настройка и развертывание

### Переменные окружения
```bash
# Секретный ключ для JWT токенов
API_COURIER_SECRET_KEY=your_secret_key_here

# Или общий ключ для API
API_JWT_SECRET_KEY=your_jwt_secret_here
```

### Регистрация роутера
В файле `router.js`:
```javascript
import externalAuthRouter from './auth/external-auth.router.js';

export const registerRouters = (fastify) => {
  // Регистрируется на том же префиксе что и основной auth
  fastify.register(externalAuthRouter, { prefix: '/api/v1/auth' });
};
```

## Мониторинг и логирование

Все операции с токенами логируются через Winston:
- Выдача токенов
- Неудачные попытки аутентификации
- Использование токенов с недостаточными правами
- Ошибки верификации токенов

## Валидация

### Схемы Fastify
Все эндпоинты используют строгую валидацию:
- `client_id`: 3-100 символов, только буквы, цифры, тире, подчеркивание
- `client_secret`: минимум 12 символов для создания клиента
- `scopes`: массив строк в формате `action:resource`
- `token_expires_in`: от 300 до 86400 секунд (5 минут - 24 часа)

### Примеры валидации
```javascript
// Корректные scopes
["read:orders", "update:delivery-status", "admin:system"]

// Некорректные scopes
["ReadOrders", "update_delivery_status", "admin:"] // Неправильный формат
```

## Тестирование

### Создание тестового клиента
```javascript
// Через админский API
const testClient = {
  client_id: 'test_client',
  client_secret: 'test_secret_123456',
  name: 'Тестовый клиент',
  scopes: ['read:orders', 'update:delivery-status'],
  description: 'Клиент для тестирования',
  token_expires_in: 3600
};
```

### Тестирование эндпоинтов
```bash
# Получение токена
curl -X POST http://localhost:3000/api/v1/auth/token \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test_client","client_secret":"test_secret_123456","grant_type":"client_credentials"}'

# Использование токена
curl -X POST http://localhost:3000/api/v1/order/status-update \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"id":"order-id","status":"Delivered"}'
``` 
