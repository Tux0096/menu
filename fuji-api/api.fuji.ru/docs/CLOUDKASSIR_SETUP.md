# Настройка интеграции CloudKassir

## Описание

Интеграция с CloudKassir позволяет автоматически создавать электронные чеки для заказов в системе Fuji Food Delivery.

## Функциональность

- ✅ Проверка существования чека по ID заказа
- ✅ Создание нового чека при отсутствии
- ✅ Получение ссылки на сформированный чек
- ✅ Открытие чека в новой вкладке браузера

## Настройка переменных окружения

Добавьте следующие переменные в ваш `.env` файл:

```bash
# CloudKassir Configuration
CLOUDKASSIR_API_URL=https://api.cloudkassir.ru
CLOUDKASSIR_PUBLIC_ID=your_public_id_here
CLOUDKASSIR_API_SECRET=your_api_secret_here

# Данные организации (значений по умолчанию в коде нет — задаются только в .env)
CLOUDKASSIR_INN=your_inn_here
CLOUDKASSIR_CASH_REGISTER_NUMBER=your_cash_register_number
CLOUDKASSIR_FISCAL_NUMBER=your_fiscal_number
CLOUDKASSIR_REGISTRATION_NUMBER=your_registration_number
CLOUDKASSIR_OFD=taxcom
CLOUDKASSIR_TAX_SYSTEM=1
CLOUDKASSIR_EMAIL=buh@example.ru
CLOUDKASSIR_PHONE=+7XXXXXXXXXX
CLOUDKASSIR_BSO=false
```

### Получение параметров

1. **Public ID** - получить в личном кабинете CloudKassir (используется как логин для Basic Auth)
2. **API Secret** - получить в личном кабинете CloudKassir (используется как пароль для Basic Auth)
3. **ИНН** - ИНН вашей организации (10 или 12 цифр)

### Данные организации

- **ИНН**: your_inn_here
- **Заводской номер кассы**: your_cash_register_number
- **Номер ФН**: your_fiscal_number
- **Регистрационный номер кассы**: your_registration_number
- **ОФД**: Такском (taxcom)
- **Система налогообложения**: ОСНО (1)
- **Email**: buh@example.ru
- **Телефон**: +7XXXXXXXXXX
- **БСО**: false

## API эндпоинты

### POST /api/v1/order/:iikoOrderId/receipt

Получение или создание чека для заказа.

**Параметры:**
- `iikoOrderId` (string) - ID заказа в системе iiko

**Ответ:**
```json
{
  "success": true,
  "url": "https://receipt.cloudkassir.ru/...",
  "action": "created" // или "existing"
}
```

**Ошибки:**
- `403` - Нет прав для получения чека этого заказа
- `404` - Заказ не найден
- `500` - Ошибка при получении чека

## CloudKassir API эндпоинты

Используемые эндпоинты согласно [документации CloudKassir](https://developers.cloudkassir.ru/):

- **POST** `/kkt/receipt` - Формирование кассового чека
- **GET** `/kkt/receipt/get?id={id}` - Получение данных чека

## Использование на фронтенде

Кнопка "Электронный чек" в истории заказов автоматически:
1. Отправляет запрос на API
2. Получает ссылку на чек
3. Открывает чек в новой вкладке

## Логирование

Все операции с чеками логируются через `CLogger`:
- Проверка существования чека
- Создание нового чека
- Получение ссылки на чек
- Ошибки API

## Тестирование

Для тестирования используются заглушки:
- Если переменные окружения не настроены, используются тестовые значения
- HTTP запросы к CloudKassir API имитируются
- В консоли выводится предупреждение о тестовом режиме

## Безопасность

- Проверка прав доступа к заказу (пользователь может получить чек только своих заказов)
- Аутентификация через JWT токены
- HTTP Basic Auth для CloudKassir API (Public ID + API Secret)
- Валидация входных данных через Yup схемы

## Мониторинг

Следите за логами для отслеживания:
- Успешных операций с чеками
- Ошибок API CloudKassir
- Проблем с аутентификацией
- Таймаутов запросов 
