# Интеграция системы статусов заказов

## Обзор

Система отслеживания статусов заказов включает:

- **StatusStepper** - компонент визуального отображения прогресса заказа
- **WebSocket** - real-time обновления статусов
- **Vuex Store** - управление состоянием заказов
- **API** - получение данных о заказах

## Архитектура

### Компоненты

1. **StatusStepper.vue** - основной компонент степпера
2. **StatusStepperContainer.vue** - контейнер с автоматическим управлением
3. **order.js** - Vuex store для заказов
4. **websocket.client.js** - WebSocket плагин с обработкой событий

### API Endpoints

- `GET /api/v1/user/:id/active-order` - получение активного заказа пользователя
- `POST /api/v1/order/status-update` - обновление статуса заказа (для внешних систем)

### WebSocket События

- `order:status_update` - обновление статуса заказа в реальном времени

## Использование

### Базовое использование

```vue
<template>
  <div>
    <!-- Автоматическое отображение при наличии активного заказа -->
    <StatusStepperContainer />
  </div>
</template>

<script>
import StatusStepperContainer from '~/components/Order/StatusStepperContainer.vue';

export default {
  components: {
    StatusStepperContainer
  }
};
</script>
```

### Ручное управление

```vue

<template>
  <div>
    <StatusStepper
      :force-show="true"
      :check-interval="30"
      @status-changed="handleStatusChange"
      @courier-called="handleCourierCall"
    />
  </div>
</template>

<script>
  import StatusStepper from '~/components/Order/StatusStepper.vue';

  export default {
    components: {
      StatusStepper
    },

    methods: {
      handleStatusChange(event) {
        console.log('Статус изменен:', event);
      },

      handleCourierCall(event) {
        console.log('Звонок курьеру:', event);
      }
    }
  };
</script>
```

### Программное управление

```javascript
// Загрузка активного заказа
await this.$store.dispatch('order/loadActiveOrder');

// Обновление статуса
this.$store.dispatch('order/handleStatusUpdate', {
  status: 'OnWay',
  courierInfo: { name: 'Иван', phone: '+7900123456' }
});

// Очистка заказа
this.$store.dispatch('order/clearOrder');

// Получение данных
const activeOrder = this.$store.getters['order/activeOrder'];
const hasOrder = this.$store.getters['order/hasActiveOrder'];
const status = this.$store.getters['order/currentDeliveryStatus'];
```

## Статусы заказов

### Статусы доставки

| Статус           | Описание                | Этап в степпере |
|------------------|-------------------------|-----------------|
| Unconfirmed      | Заказ не подтвержден    | 1 - Принят      |
| WaitCooking      | Ожидает приготовления   | 1 - Принят      |
| ReadyForCooking  | Готов к приготовлению   | 2 - На кухне    |
| CookingStarted   | Приготовление начато    | 2 - На кухне    |
| CookingCompleted | Приготовление завершено | 2 - На кухне    |
| Waiting          | Ожидает курьера         | 3 - В пути      |
| OnWay            | В пути                  | 3 - В пути      |
| OnWayCourier     | Курьер в пути           | 3 - В пути      |
| CourierNearby    | Курьер рядом            | 3 - В пути      |
| Delivered        | Доставлен               | 4 - Доставлен   |
| Closed           | Закрыт                  | 4 - Доставлен   |
| Cancelled        | Отменен                 | 1 - Принят      |

### Статусы обработки заказа

- `NEW` - новый заказ
- `WAIT_PAYMENT` - ожидает оплаты
- `PAYED` - оплачен
- `COMPLETED` - завершен
- `ERROR_PAYMENT` - ошибка оплаты

## События

### status-changed

Срабатывает при изменении статуса заказа:

```javascript
{
  oldStatus: 'CookingStarted',
  newStatus: 'OnWay',
  order: { /* объект заказа */ }
}
```

### courier-called

Срабатывает при звонке курьеру:

```javascript
{
  phone: '+7900123456',
  order: { /* объект заказа */ }
}
```

## Настройки

### Props компонента StatusStepper

- `checkInterval` (Number) - интервал проверки в секундах (по умолчанию 60)

### Конфигурация WebSocket

```javascript
// nuxt.config.js
export default {
  publicRuntimeConfig: {
    WS_URL: process.env.WS_URL || 'ws://localhost:3000'
  }
}
```

## Интеграция в лейаут

Добавьте контейнер в основной лейаут:

```vue
<!-- layouts/default.vue -->
<template>
  <div>
    <!-- Степпер статусов заказа -->
    <StatusStepperContainer />
    
    <!-- Основной контент -->
    <Nuxt />
  </div>
</template>

<script>
import StatusStepperContainer from '~/components/Order/StatusStepperContainer.vue';

export default {
  components: {
    StatusStepperContainer
  }
};
</script>
```

## Стилизация

Компонент использует SCSS с функцией `extClamp()` для адаптивности. Основные CSS классы:

- `.status-card` - основной контейнер
- `.status-card__step` - этап степпера
- `.status-card__step--active` - активный этап
- `.status-card__step--done` - завершенный этап
- `.status-card__info` - информация о заказе
- `.status-card__phone` - кнопка телефона

## Отладка

### Логирование

```javascript
// Включить логирование WebSocket
localStorage.setItem('debug', 'websocket');

// Проверить состояние store
console.log(this.$store.state.order);
```

### Тестирование

```javascript
// Принудительно показать степпер
<StatusStepper :force - show = "true" / >

  // Эмуляция статуса
  this.$store.commit('order/setActiveOrder', {
    id: 12345,
    delivery: {
      status: 'OnWay',
      courierInfo: { name: 'Тест', phone: '+7900123456' }
    }
  });
```

## Требования

- Vue.js 2.x
- Vuex
- Axios
- WebSocket поддержка
- SCSS поддержка 
