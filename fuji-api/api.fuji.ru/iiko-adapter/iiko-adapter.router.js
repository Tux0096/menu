import CLogger from '../lib/CLogger.js';
import * as iikoAdapterService from './iiko-adapter.service.js';

const logger = new CLogger();

// TODO: надо подумать, как закрыть эндпойнты
// сейчас их использует только бек и по идее о них не должны знать
// но это так себе защита :)

export default (fastify, opts, done) => {
  fastify.get(
    '/nomenclature/:organizationId',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      const { organizationId } = request.params;

      try {
        return iikoAdapterService.getNomenclature(organizationId);
      } catch (e) {
        logger.log(e);
        return reply.status(500).send();
      }
    },
  );

  fastify.post(
    '/orders/add',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      const { body } = request;

      try {
        return iikoAdapterService.createOrder(body);
      } catch (e) {
        logger.log(e);
        return reply.status(500).send();
      }
    },
  );

  fastify.get(
    '/auth/access_token',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => reply.status(200).send('stub-token'),
  );

  fastify.get(
    '/cities/cities',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      try {
        return iikoAdapterService.getCladr();
      } catch (e) {
        logger.log(e);
        return reply.status(500).send();
      }
    },
  );

  fastify.get(
    '/rmsSettings/getPaymentTypes',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      try {
        return iikoAdapterService.getPayments();
      } catch (e) {
        logger.log(e);
        return reply.status(500).send();
      }
    },
  );

  fastify.get(
    '/stopLists/getDeliveryStopList',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      try {
        return iikoAdapterService.getStopList();
      } catch (e) {
        logger.log(e);
        return reply.status(500).send();
      }
    },
  );

  fastify.get(
    '/orders/deliveryHistoryByPhone',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      try {
        const { phone } = request.query;
        return iikoAdapterService.getDeliveryHistoryByPhone(phone);
      } catch (e) {
        logger.log('', e);
        return reply.status(500).send();
      }
    },
  );

  fastify.get(
    '/customers/get_customer_by_phone',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      const { phone } = request.query;
      try {
        const customer = await iikoAdapterService.getCustomerByPhone(phone);
        return customer;
      } catch (e) {
        logger.log('', e);
        if (e.message === 'Customer_CustomerNotFound') {
          return reply.status(403).send({
            code: null,
            description: 'Customer not found',
            errorCode: 'Customer_CustomerNotFound',
            httpStatusCode: 400,
            isIntegrationError: false,
            message: `There is no user with phone ${phone}`,
            uiMessage: null,
          });
        }
        return reply.status(500).send();
      }
    },
  );

  fastify.post(
    '/customers/create_or_update',
    {
      schema: {
        hide: true,
      },
    },
    async (request, reply) => {
      try {
        const customer = request.body;
        return iikoAdapterService.createOrUpdateCustomer(customer);
      } catch (e) {
        logger.log('', e);
        return reply.status(500).send();
      }
    },
  );

  done();
};
