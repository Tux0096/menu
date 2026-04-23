import { sequelize } from '../db.js';
import initModels from '../models/init-models.js';

const models = initModels(sequelize);
const {
  DeliveryTerminals,
} = models;

/**
 * Получить все терминалы
 */
export const getAllTerminals = async () => await DeliveryTerminals.findAll({
  order: [['cityId', 'ASC'], ['name', 'ASC']],
});

/**
 * Получить терминал по ID
 */
export const getTerminalById = async (id) => await DeliveryTerminals.findByPk(id);

/**
 * Получить терминалы по городу
 */
export const getTerminalsByCity = async (cityId) => await DeliveryTerminals.findAll({
  where: { cityId },
  order: [['name', 'ASC']],
});

/**
 * Найти терминал по terminalId
 */
export const findByTerminalId = async (terminalId) => await DeliveryTerminals.findOne({
  where: { terminalId },
});

/**
 * Создать новый терминал
 */
export const createTerminal = async (terminalData) => await DeliveryTerminals.create(terminalData);

/**
 * Обновить терминал
 */
export const updateTerminal = async (id, terminalData) => {
  const terminal = await DeliveryTerminals.findByPk(id);
  if (!terminal) {
    return null;
  }

  await terminal.update(terminalData);
  return terminal;
};

/**
 * Удалить терминал
 */
export const deleteTerminal = async (id) => {
  const terminal = await DeliveryTerminals.findByPk(id);
  if (!terminal) {
    return false;
  }

  await terminal.destroy();
  return true;
};

/**
 * Получить активные терминалы
 */
export const getActiveTerminals = async () => await DeliveryTerminals.findAll({
  where: { isDisabled: false },
  order: [['cityId', 'ASC'], ['name', 'ASC']],
});

/**
 * Получить терминалы для списка ресторанов
 */
export const getTerminalsForRestaurantList = async () => await DeliveryTerminals.findAll({
  where: { isDisabled: false },
  attributes: ['terminalId', 'address'],
});
