import jwt from 'jsonwebtoken';

import env from '../env.js';

const USER_NOT_AUTH = {
  message: 'Пользователь не авторизован',
  code: 'USER_NOT_AUTH',
  description: 'Доступ запрещен. Пожалуйста, войдите в систему для доступа к этому ресурсу.',
  action: 'Перейдите на страницу входа или обратитесь за помощью к администратору.',
};

export default (roles = []) => (request, reply, done) => {
  if (request.method === 'OPTIONS') {
    done();
  }
  try {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      reply
        .code(401)
        .send(USER_NOT_AUTH);
      return;
    }
    const decodedData = jwt.verify(token, env.API_JWT_SECRET_KEY);

    if (!decodedData || !decodedData.phone) {
      reply
        .code(401)
        .send(USER_NOT_AUTH);
      return;
    }

    if (decodedData.roles.length === 0 || roles.length === 0) {
      reply.code(403).send({ message: 'Нет доступа' });
      return;
    }

    if (!roles.some((role) => decodedData.roles.includes(role))) {
      reply.code(403).send({ message: 'Нет доступа' });
      return;
    }

    request.user = decodedData;

    done();
  } catch (e) {
    reply
      .code(401)
      .send(USER_NOT_AUTH);
  }
};
