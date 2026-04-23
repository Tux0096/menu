import connectionManager from '../services/ConnectionManager.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/',
    {
      websocket: true,
      schema: {
        hide: true,
      },
    },
    (connection, req) => {
      let token = null;

      if (req.headers.authorization?.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      }

      if (!token && req.query.token) {
        token = req.query.token;
      }

      // Добавим флаг активности и обработку pong
      const socket = connection.socket;
      socket.isAlive = true;

      socket.on('pong', () => {
        socket.isAlive = true;
      });

      connectionManager.addConnection(connection, token);

      socket.on('message', (message) => {
        socket.send(JSON.stringify({
          type: 'echo',
          data: 'Подключение установлено',
          timestamp: new Date().toISOString(),
        }));
      });
    },
  );

  // Интервал для отправки ping и проверки активности
  const interval = setInterval(() => {
    fastify.websocketServer.clients.forEach((socket) => {
      if (!socket.isAlive) {
        return socket.terminate();
      }

      socket.isAlive = false;
      socket.ping(); // отправляем ping
    });
  }, 30000); // каждые 30 сек

  fastify.addHook('onClose', (instance, done) => {
    clearInterval(interval); // очищаем таймер при остановке сервера
    done();
  });

  done();
};
