// plugins/socket.client.js

export default ({ app }, inject) => {
  const wsUrl = app.$config.WS_URL;

  class WebSocketManager {
    constructor(url) {
      this.url = url;
      this.socket = null;
      this.reconnectInterval = 1000;
      this.maxReconnectInterval = 30000;
      this.manualReconnect = false;
      this.pingInterval = null;
      this.pingTimeout = null;
      this.connect();
    }

    connect() {
      if (this.socket && this.socket.readyState !== WebSocket.CLOSED) {
        try {
          this.socket.close(1000, 'Reconnecting');
        } catch (e) {
          console.warn('Ошибка при закрытии предыдущего сокета:', e);
        }
      }

      const token = app.store.getters['auth/token'];
      const urlWithToken = token
        ? `${this.url}?token=${encodeURIComponent(token)}`
        : this.url;

      try {
        this.socket = new WebSocket(urlWithToken);
      } catch (e) {
        console.error('Ошибка при подключении WebSocket:', e);
        return;
      }

      this.socket.addEventListener('open', () => {
        console.log('[WebSocket] Соединение установлено');
        this.reconnectInterval = 1000;
        this.manualReconnect = false;

        this.startPing();
      });

      this.socket.addEventListener('message', (event) => {
        this.handleMessage(event);
      });

      this.socket.addEventListener('close', (event) => {
        console.warn('[WebSocket] Соединение закрыто:', {
          code: event.code,
          reason: event.reason,
        });

        this.stopPing();

        if (!this.manualReconnect) {
          setTimeout(() => {
            if (this.reconnectInterval < this.maxReconnectInterval) {
              this.reconnectInterval *= 2;
            }
            this.connect();
          }, this.reconnectInterval);
        }
      });

      this.socket.addEventListener('error', (event) => {
        console.error('[WebSocket] Ошибка:', event);
      });
    }

    handleMessage(event) {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (error) {
        console.error('Получены невалидные данные WebSocket:', event.data);
        return;
      }

      // Обработка pong от сервера
      if (data.type === 'pong') {
        clearTimeout(this.pingTimeout);
        return;
      }

      if (data.type === 'settings:update') {
        app.store.dispatch('setting/initSettings');
      }

      if (data.type === 'order:status_update') {
        this.handleOrderStatusUpdate(data);
      }
    }

    handleOrderStatusUpdate(data) {
      const {
        orderId, userId, status, previousStatus, timestamp,
      } = data;

      const currentUserId = app.store.getters['user/id'];
      if (!currentUserId || userId !== currentUserId) {
        return;
      }

      const activeOrder = app.store.getters['order/activeOrder'];
      if (!activeOrder || activeOrder.id !== orderId) {
        return;
      }

      console.log(`[WebSocket] Обновление статуса заказа #${orderId}: ${previousStatus} → ${status}`);

      app.store.dispatch('order/handleStatusUpdate', {
        status,
        courierInfo: data.courierInfo || null,
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('order:status_update', {
          detail: {
            orderId, status, previousStatus, timestamp,
          },
        }));
      }
    }

    send(data) {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.socket.send(JSON.stringify(data));
      } else {
        console.warn('[WebSocket] Невозможно отправить сообщение, соединение закрыто:', data);
      }
    }

    getSocket() {
      return this.socket;
    }

    subscribeToUserOrders(userId) {
      this.send({
        type: 'subscribe',
        channel: `user:${userId}:orders`,
      });
    }

    unsubscribeFromUserOrders(userId) {
      this.send({
        type: 'unsubscribe',
        channel: `user:${userId}:orders`,
      });
    }

    // Запуск регулярных ping-запросов
    startPing() {
      if (this.pingInterval) clearInterval(this.pingInterval);
      if (this.pingTimeout) clearTimeout(this.pingTimeout);

      this.pingInterval = setInterval(() => {
        if (this.socket.readyState === WebSocket.OPEN) {
          this.send({ type: 'ping' });

          this.pingTimeout = setTimeout(() => {
            console.warn('[WebSocket] Не получен pong, перезапуск соединения');
            this.socket.close(4000, 'No pong received');
          }, 10000); // 10 сек на ответ
        }
      }, 30000); // каждые 30 сек
    }

    stopPing() {
      clearInterval(this.pingInterval);
      clearTimeout(this.pingTimeout);
    }
  }

  const wsManager = new WebSocketManager(wsUrl);

  inject('socket', wsManager);

  app.store.watch(
    (state, getters) => getters['user/isAuth'],
    () => {
      console.log('[WebSocket] Пользователь залогинился. Переподключаемся');
      wsManager.manualReconnect = true;
      wsManager.connect();
    },
  );
};
