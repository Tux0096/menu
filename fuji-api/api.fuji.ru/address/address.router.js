import authMiddleware from '../middleware/auth.middleware.js';
import * as addressService from './address.service.js';
import {
  getAddressesSchema,
  createAddressSchema,
  updateAddressSchema,
  deleteAddressSchema,
} from './address.schema.js';

export default (fastify, opts, done) => {
  fastify.get(
    '/by-user-id/:id',
    {
      preValidation: authMiddleware(['user']),
      schema: getAddressesSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const addresses = await addressService.getAddressesByUserId(id);
        return reply.send(addresses);
      } catch (error) {
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Что-то пошло не так',
        });
      }
    },
  );

  fastify.post(
    '/',
    {
      preValidation: authMiddleware(['user']),
      schema: createAddressSchema,
    },
    async (request, reply) => {
      try {
        const newAddress = await addressService.createAddress(request.body);
        return reply.status(201).send(newAddress);
      } catch (error) {
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Что-то пошло не так',
        });
      }
    },
  );

  fastify.put(
    '/:id',
    {
      preValidation: authMiddleware(['user']),
      schema: updateAddressSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        const updatedAddress = await addressService.updateAddress(id, request.body);
        return reply.send(updatedAddress);
      } catch (error) {
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Что-то пошло не так',
        });
      }
    },
  );

  fastify.delete(
    '/:id',
    {
      preValidation: authMiddleware(['user']),
      schema: deleteAddressSchema,
    },
    async (request, reply) => {
      const { id } = request.params;
      try {
        await addressService.deleteAddress(id);
        return reply.send({
          statusCode: 200,
          message: 'Адрес успешно удален',
        });
      } catch (error) {
        return reply.status(500).send({
          statusCode: 500,
          error: 'Internal Server Error',
          message: 'Что-то пошло не так',
        });
      }
    },
  );

  done();
};
