# Интеграция с WebSocket в компонентах

## Принципы работы

### Централизованная обработка
WebSocket сообщения обрабатываются централизованно в плагине `plugins/websocket.client.js`. Компоненты **НЕ должны** добавлять собственные обработчики сообщений.

### Архитектура событий
1. **WebSocket плагин** получает сообщения и обрабатывает их
2. **Store** обновляется автоматически через dispatch
3. **Window events** отправляются для дополнительной обработки в компонентах
4. **Компоненты** подписываются на window events или реактивно следят за store

## Правильная реализация в компонентах

### ✅ Правильно (как в StatusStepper)

```javascript
export default {
  async mounted() {
    // Подписка на WebSocket через централизованный метод
    this.subscribeToWebSocket();
    
    // Подписка на window events для дополнительной обработки
    window.addEventListener('order:status_update', this.handleStatusUpdateEvent);
  },

  beforeDestroy() {
    // Отписка от WebSocket
    this.unsubscribeFromWebSocket();
    
    // Отписка от window events
    window.removeEventListener('order:status_update', this.handleStatusUpdateEvent);
  },

  methods: {
    subscribeToWebSocket() {
      if (!this.$socket || !this.isUserAuth) return;
      
      const userId = this.$store.getters['user/id'];
      if (userId) {
        this.$socket.subscribeToUserOrders(userId);
      }
    },

    unsubscribeFromWebSocket() {
      if (!this.$socket || !this.isUserAuth) return;
      
      const userId = this.$store.getters['user/id'];
      if (userId) {
        this.$socket.unsubscribeFromUserOrders(userId);
      }
    },

    handleStatusUpdateEvent(event) {
      const { orderId, status } = event.detail;
      
      // Дополнительная логика обработки в компоненте
      if (this.activeOrder && this.activeOrder.id === orderId) {
        this.loadActiveOrder(); // Перезагрузка данных
      }
    }
  }
}
```

### ❌ Неправильно

```javascript
// НЕ ДЕЛАЙТЕ ТАК!
export default {
  mounted() {
    // Прямая подписка на WebSocket сообщения
    this.$socket.getSocket().addEventListener('message', this.handleMessage);
  },

  methods: {
    handleMessage(event) {
      // Дублирование логики обработки
      const data = JSON.parse(event.data);
      if (data.type === 'order:status_update') {
        // Обработка уже есть в плагине!
      }
    }
  }
}
```

## Доступные методы WebSocket

### Подписка на события заказов
```javascript
this.$socket.subscribeToUserOrders(userId);
this.$socket.unsubscribeFromUserOrders(userId);
```

### Отправка сообщений
```javascript
this.$socket.send({
  type: 'custom_message',
  data: { /* ваши данные */ }
});
```

## События WebSocket

### order:status_update
Автоматически обрабатывается плагином:
- Обновляет store через `order/handleStatusUpdate`
- Показывает toast уведомления
- Отправляет window event `order:status_update`

### settings:update
Автоматически обрабатывается плагином:
- Обновляет настройки через `setting/initSettings`

## Реактивность через Store

Предпочтительный способ - использовать реактивность Vue через store:

```javascript
export default {
  computed: {
    activeOrder() {
      return this.$store.getters['order/activeOrder'];
    },
    
    currentStatus() {
      return this.$store.getters['order/currentDeliveryStatus'];
    }
  },

  watch: {
    currentStatus(newStatus, oldStatus) {
      // Реагируем на изменения статуса
      console.log(`Статус изменился: ${oldStatus} → ${newStatus}`);
    }
  }
}
```

## Отладка

### Проверка подключения
```javascript
console.log('WebSocket состояние:', this.$socket.getSocket().readyState);
```

### Проверка подписок
```javascript
// В консоли браузера
window.addEventListener('order:status_update', (e) => {
  console.log('Получено событие:', e.detail);
});
``` 