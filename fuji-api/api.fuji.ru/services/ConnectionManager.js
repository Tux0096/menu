import jwt from 'jsonwebtoken';
import env from '../env.js';

class ConnectionManager {
  constructor() {
    this.authorizedConnections = new Map(); // userId -> connection
    this.unauthorizedConnections = new Set(); // анонимные подключения

    // Проверка соединений и удаление мёртвых каждые 30 секунд
    setInterval(() => {
      for (const [userId, connection] of this.authorizedConnections.entries()) {
        const socket = connection.socket;
        if (socket.readyState !== 1) {
          this.authorizedConnections.delete(userId);
          continue;
        }

        try {
          if (typeof socket.ping === 'function') {
            socket.ping();
          }
        } catch (err) {
          socket.terminate?.();
          this.authorizedConnections.delete(userId);
        }
      }
    }, 30_000);
  }

  addConnection(connection, token = null) {
    let userId = null;

    // Проверяем токен если он передан
    if (token) {
      try {
        const decodedData = jwt.verify(token, env.API_JWT_SECRET_KEY);
        if (decodedData && decodedData.phone) {
          userId = decodedData.phone;
          connection.userId = userId;
          connection.userRoles = decodedData.roles || [];

          // Удаляем предыдущее соединение, если оно уже есть
          if (this.authorizedConnections.has(userId)) {
            const oldConnection = this.authorizedConnections.get(userId);
            oldConnection.socket.terminate?.();
            this.authorizedConnections.delete(userId);
          }

          this.authorizedConnections.set(userId, connection);
        }
      } catch (e) {
        this.unauthorizedConnections.add(connection);
      }
    } else {
      this.unauthorizedConnections.add(connection);
    }

    connection.socket.on('close', () => {
      if (userId) {
        this.authorizedConnections.delete(userId);
      } else {
        this.unauthorizedConnections.delete(connection);
      }
    });

    connection.socket.on('error', (err) => {
      console.error('[WS] Ошибка сокета:', err.message);
    });
  }

  // Отправка сообщения конкретному авторизованному пользователю
  sendMessageToUser(userId, message) {
    const connection = this.authorizedConnections.get(userId);
    if (connection && connection.socket.readyState === 1) {
      try {
        connection.socket.send(JSON.stringify(message));
      } catch (err) {
        console.error('[WS] Ошибка отправки:', err.message);
      }
    }
  }

  // Массовая рассылка всем неавторизованным пользователям
  sendMessageToUnauthorized(message) {
    for (const connection of this.unauthorizedConnections) {
      if (connection.socket.readyState === 1) {
        try {
          connection.socket.send(JSON.stringify(message));
        } catch (err) {
          // Игнорируем ошибки отправки отдельным клиентам
        }
      }
    }
  }

  // Массовая рассылка всем авторизованным пользователям
  sendMessageToAuthorized(message) {
    for (const [userId, connection] of this.authorizedConnections.entries()) {
      if (connection.socket.readyState === 1) {
        try {
          connection.socket.send(JSON.stringify(message));
        } catch (err) {
          // Игнорируем ошибки отправки отдельным клиентам
        }
      }
    }
  }

  // Отправка всем пользователям (и авторизованным, и неавторизованным)
  sendMessageToAll(message) {
    this.sendMessageToAuthorized(message);
    this.sendMessageToUnauthorized(message);
  }

  // Получение статистики подключений
  getConnectionStats() {
    return {
      authorized: this.authorizedConnections.size,
      unauthorized: this.unauthorizedConnections.size,
      total: this.authorizedConnections.size + this.unauthorizedConnections.size,
    };
  }
}

export default new ConnectionManager();
