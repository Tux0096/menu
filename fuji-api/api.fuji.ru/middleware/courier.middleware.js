import jwt from 'jsonwebtoken';
import env from '../env.js';

const COURIER_NOT_AUTH = {
  message: 'Система не авторизована',
  code: 'COURIER_NOT_AUTH',
  description: 'Доступ запрещен. Пожалуйста, используйте правильный API-ключ.',
};

export default () => (request, reply, done) => {
  if (request.method === 'OPTIONS') {
    done();
  }
  try {
    const token = request.headers.authorization?.split(' ')[1];
    if (!token) {
      reply
        .code(401)
        .send(COURIER_NOT_AUTH);
      return;
    }

    const decodedData = jwt.verify(token, env.API_COURIER_SECRET_KEY || env.API_JWT_SECRET_KEY);

    if (!decodedData || !decodedData.system || decodedData.system !== 'courier') {
      reply
        .code(401)
        .send(COURIER_NOT_AUTH);
      return;
    }

    request.courier = decodedData;
    done();
  } catch (e) {
    reply
      .code(401)
      .send(COURIER_NOT_AUTH);
  }
};
