import path from 'path';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import appRoot from 'app-root-path';
import fastifyStatic from '@fastify/static';
import fastifyMiddie from '@fastify/middie';
import fastifyFormBody from '@fastify/formbody';
import websocketPlugin from '@fastify/websocket';
import fastifyCookie from '@fastify/cookie';
import fastifyMultipart from '@fastify/multipart';
import { createIPX, createIPXMiddleware } from 'ipx';
import swagger from '@fastify/swagger';
import createCatalogMonitor from './catalog/init.catalog.js';
import connectionManager from './services/ConnectionManager.js';

import env from './env.js';
import { registerRouters } from './router.js';
import initAnalyticService from './analytics/analytics.service.js';

const fastify = Fastify({
  // logger: true,
});
await fastify.register(cors, {});

await fastify.register(fastifyMiddie, {
  hook: 'onRequest',
});

fastify.register(fastifyCookie, {
  hook: 'onRequest',
  parseOptions: {},
});

await fastify.register(swagger, {
  routePrefix: '/documentation',
  swagger: {
    info: {
      title: 'Fuji API',
      description: '',
      version: '0.0.1',
    },
    externalDocs: {
      url: 'https://swagger.io',
      description: 'Find more info here',
    },
    host: env.SWAGGER_FULL_URL,
    schemes: ['http', 'https'],
    consumes: ['application/json'],
    produces: ['application/json'],
    tags: [
      { name: 'Адрес', description: '' },

    ],
    definitions: {
      // Address: addressSchema,
    },
    securityDefinitions: {
      apiKey: {
        type: 'apiKey',
        name: 'authorization',
        in: 'header',
      },
      externalApiKey: {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
    },
  },
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false,
  },
  uiHooks: {
    onRequest(request, reply, next) { next(); },
    preHandler(request, reply, next) { next(); },
  },
  staticCSP: true,
  transformStaticCSP: (header) => header,
  exposeRoute: true,
});

fastify.register(websocketPlugin);
fastify.register(fastifyMultipart);
fastify.register(fastifyFormBody);

const ipx = createIPX({
  dir: env.IPX_DIR,
  maxAge: 31536000,
});
fastify.use('/_ipx', createIPXMiddleware(ipx));

fastify.register(fastifyStatic, {
  root: path.join(appRoot.path, 'public'),
  prefix: '/',
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000');
  },
});

registerRouters(fastify);

const start = async () => {
  try {
    initAnalyticService();

    const catalogMonitor = createCatalogMonitor({});

    // Обработчик обновления каталога
    const handleCatalogUpdate = (updatedCatalog) => {
      console.log('Каталог обновлён:', updatedCatalog);
      connectionManager.sendMessageToAll({
        type: 'catalog:update',
        data: { hash: updatedCatalog },
        timestamp: new Date().toISOString(),
      });
    };

    catalogMonitor.on('update', handleCatalogUpdate);

    // Graceful shutdown - очистка ресурсов
    const gracefulShutdown = async (signal) => {
      console.log(`\nПолучен сигнал ${signal}, начинаем graceful shutdown...`);

      try {
        // Останавливаем и очищаем монитор каталога
        catalogMonitor.destroy();
        console.log('✅ Монитор каталога остановлен');

        // Закрываем Fastify сервер
        await fastify.close();
        console.log('✅ Fastify сервер закрыт');

        process.exit(0);
      } catch (error) {
        console.error('❌ Ошибка при graceful shutdown:', error);
        process.exit(1);
      }
    };

    // Обработчики сигналов завершения
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

    const address = await fastify.listen({
      host: env.API_SERVER_HOST,
      port: env.API_SERVER_PORT,
    });
    console.log(`server listening on ${address}`);
  } catch (err) {
    console.log(err);
    fastify.log.error(err);
    process.exit(1);
  }
};
start()
  .then();
