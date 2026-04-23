import authMiddleware from '../middleware/auth.middleware.js';
import * as terminalsService from './terminals.service.js';

export default (fastify, opts, done) => {
  // Получить все терминалы
  fastify.get('/', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const terminals = await terminalsService.getAllTerminals();
      return reply.send(terminals);
    } catch (error) {
      console.error('Ошибка получения терминалов:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при получении терминалов',
      });
    }
  });

  // Получить терминал по ID
  fastify.get('/:id', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const terminal = await terminalsService.getTerminalById(id);

      if (!terminal) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Терминал не найден',
        });
      }

      return reply.send(terminal);
    } catch (error) {
      console.error('Ошибка получения терминала:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при получении терминала',
      });
    }
  });

  // Получить терминалы по городу
  fastify.get('/city/:cityId', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const { cityId } = request.params;
      const terminals = await terminalsService.getTerminalsByCity(cityId);
      return reply.send(terminals);
    } catch (error) {
      console.error('Ошибка получения терминалов по городу:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при получении терминалов по городу',
      });
    }
  });

  // Создать новый терминал
  fastify.post('/', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const terminal = await terminalsService.createTerminal(request.body);
      return reply.status(201).send(terminal);
    } catch (error) {
      if (error.message.includes('уже существует')) {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }

      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          details: error.errors,
        });
      }

      console.error('Ошибка создания терминала:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при создании терминала',
      });
    }
  });

  // Обновить терминал
  fastify.put('/:id', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const terminal = await terminalsService.updateTerminal(id, request.body);

      if (!terminal) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Терминал не найден',
        });
      }

      return reply.send(terminal);
    } catch (error) {
      if (error.message.includes('уже существует')) {
        return reply.status(409).send({
          error: 'Conflict',
          message: error.message,
        });
      }

      if (error.name === 'ValidationError') {
        return reply.status(400).send({
          error: 'Validation Error',
          message: error.message,
          details: error.errors,
        });
      }

      console.error('Ошибка обновления терминала:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при обновлении терминала',
      });
    }
  });

  // Удалить терминал
  fastify.delete('/:id', {
    preValidation: authMiddleware(['admin']),
    schema: { hide: true },
  }, async (request, reply) => {
    try {
      const { id } = request.params;
      const deleted = await terminalsService.deleteTerminal(id);

      if (!deleted) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Терминал не найден',
        });
      }

      return reply.status(204).send();
    } catch (error) {
      console.error('Ошибка удаления терминала:', error);
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Ошибка при удалении терминала',
      });
    }
  });

  done();
};
