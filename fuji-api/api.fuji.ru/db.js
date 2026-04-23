import { Sequelize } from 'sequelize';

import env from './env.js';

const sequelize = new Sequelize(env.API_DB_NAME, env.API_DB_USER, env.API_DB_PASSWORD, {
  dialect: env.API_DB_DIALECT,
  host: env.API_DB_HOST,
  logging: false,
  dialectOptions: {
    socketPath: env.API_DB_SOCKET_PATH,
  },
  define: {
    charset: 'utf8mb4',
    collate: 'utf8mb4_unicode_ci',
    timestamps: true,
  },
});

export { sequelize };
