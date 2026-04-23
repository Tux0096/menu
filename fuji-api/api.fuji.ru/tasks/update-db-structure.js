#!/usr/bin/env node

import initModels from '../models/init-models.js';
import { sequelize } from '../db.js';

/**
 * update database structure
 * @returns {Promise<void>}
 */
const main = async () => {
  try {
    // init const models need for updating structure. do not remove
    const models = initModels(sequelize);
    // await sequelize.sync({ force: true });
    console.log('Начало обновления структуры базы данных...');
    await sequelize.sync({ alter: true });
    console.log('Структура базы данных успешно обновлена!');

    console.log('Все операции выполнены успешно!');
  } catch (e) {
    console.error('Ошибка при обновлении структуры базы данных:', e);
  }
  process.exit();
};

await main();

export default main;
