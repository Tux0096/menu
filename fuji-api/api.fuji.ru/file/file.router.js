import authMiddleware from '../middleware/auth.middleware.js';

import * as fileService from './file.service.js';

export default (fastify, opts, done) => {
  fastify.post(
    '/upload',
    {
      preValidation: authMiddleware(['admin']),
      schema: { hide: true },
    },
    async (request, reply) => {
      const data = await request.file();
      if (data) {
        const fileData = await fileService.saveFileData(data);
        return reply.send(fileData);
      }

      return reply.code(400)
        .send({ message: 'Bad Request' });
    },
  );

  fastify.get(
    '/:id',
    {
      preValidation: authMiddleware(['admin']),
      schema: { hide: true },
    },
    async (request, reply) => {
      try {
        const fileData = await fileService.getFile(request.params.id);

        if (!fileData) {
          return reply.code(404)
            .send({ message: 'Файл не найден' });
        }

        return reply.send(fileData);
      } catch (error) {
        console.error('Ошибка при получении файла:', error);
        return reply.code(500)
          .send({ message: 'Ошибка при получении файла' });
      }
    },
  );

  fastify.delete(
    '/:id',
    {
      preValidation: authMiddleware(['admin']),
      schema: { hide: true },
    },
    async (request, reply) => {
      try {
        const result = await fileService.deleteFile(request.params.id);

        if (!result) {
          return reply.code(404)
            .send({ message: 'Файл не найден' });
        }

        return reply.code(200)
          .send({ message: 'Файл успешно удалён' });
      } catch (error) {
        console.error('Ошибка при удалении файла:', error);
        return reply.code(500)
          .send({ message: 'Ошибка при удалении файла' });
      }
    },
  );

  fastify.get(
    '/menu.pdf',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      try {
        const filePath = await fileService.getMenuFile('menu.pdf');
        return reply.type('application/pdf')
          .send(filePath);
      } catch (error) {
        return reply.code(500)
          .send({ message: 'Ошибка при получении файла меню' });
      }
    },
  );

  fastify.get(
    '/menumobile.pdf',
    {
      schema: { hide: true },
    },
    async (request, reply) => {
      try {
        const filePath = await fileService.getMenuFile('menumobile.pdf');
        return reply.type('application/pdf')
          .send(filePath);
      } catch (error) {
        return reply.code(500)
          .send({ message: 'Ошибка при получении файла мобильного меню' });
      }
    },
  );

  done();
};
