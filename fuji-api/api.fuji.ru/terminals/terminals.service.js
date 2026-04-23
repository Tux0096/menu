import Yup from 'yup';
import * as terminalsRepo from './terminals.repository.js';
import connectionManager from '../services/ConnectionManager.js';
import { getRevision, updateRevision } from '../storage/storage.repository.js';

// Схема валидации для терминала
const terminalSchema = Yup.object({
  terminalId: Yup.string().required('terminalId обязателен'),
  cityId: Yup.string().required('cityId обязателен'),
  name: Yup.string().nullable(),
  address: Yup.string().required('address обязателен'),
  organizationId: Yup.string().nullable(),
  deliveryGroupName: Yup.string().required('deliveryGroupName обязателен'),
  deliveryRestaurantName: Yup.string().required('deliveryRestaurantName обязателен'),
  isDisabled: Yup.boolean().default(false),
  isRestHide: Yup.boolean().default(false),
  isOnlinePaymentHideDelivery: Yup.boolean().default(false),
  isOnlinePaymentHideSelf: Yup.boolean().default(false),
  sberbankLogin: Yup.string().nullable(),
  sberbankPassword: Yup.string().nullable(),
  cloudPaymentsPublicId: Yup.string().nullable(),
  openingHours: Yup.mixed().nullable(),
  times: Yup.mixed().nullable(),
  technicalInformation: Yup.mixed().nullable(),
});

const terminalUpdateSchema = Yup.object({
  terminalId: Yup.string(),
  cityId: Yup.string(),
  name: Yup.string().nullable(),
  address: Yup.string(),
  organizationId: Yup.string().nullable(),
  deliveryGroupName: Yup.string(),
  deliveryRestaurantName: Yup.string(),
  isDisabled: Yup.boolean(),
  isRestHide: Yup.boolean(),
  isOnlinePaymentHideDelivery: Yup.boolean(),
  isOnlinePaymentHideSelf: Yup.boolean(),
  sberbankLogin: Yup.string().nullable(),
  sberbankPassword: Yup.string().nullable(),
  cloudPaymentsPublicId: Yup.string().nullable(),
  openingHours: Yup.mixed().nullable(),
  times: Yup.mixed().nullable(),
  technicalInformation: Yup.mixed().nullable(),
});

/**
 * Обновление ревизии и уведомление клиентов об изменениях терминалов
 */
const updateRevisionAndNotifyClients = async () => {
  try {
    const currentRevision = await getRevision();
    await updateRevision(currentRevision + 1);
    connectionManager.sendMessageToAll({ type: 'settings:update' });
  } catch (error) {
    console.error('Ошибка при обновлении ревизии терминалов:', error);
  }
};

/**
 * Получить все терминалы
 */
export const getAllTerminals = async () => await terminalsRepo.getAllTerminals();

/**
 * Получить терминал по ID
 */
export const getTerminalById = async (id) => await terminalsRepo.getTerminalById(id);

/**
 * Получить терминалы по городу
 */
export const getTerminalsByCity = async (cityId) => await terminalsRepo.getTerminalsByCity(cityId);

/**
 * Создать новый терминал
 */
export const createTerminal = async (terminalData) => {
  // Валидация данных
  const validatedData = await terminalSchema.validate(terminalData, {
    stripUnknown: true,
    abortEarly: false,
  });

  // Проверка уникальности terminalId
  const existingTerminal = await terminalsRepo.findByTerminalId(validatedData.terminalId);
  if (existingTerminal) {
    throw new Error('Терминал с таким terminalId уже существует');
  }

  // Создание терминала
  const terminal = await terminalsRepo.createTerminal(validatedData);

  // Сброс кеша настроек
  await updateRevisionAndNotifyClients();

  return terminal;
};

/**
 * Обновить терминал
 */
export const updateTerminal = async (id, terminalData) => {
  // Проверяем существование терминала
  const terminal = await terminalsRepo.getTerminalById(id);
  if (!terminal) {
    return null;
  }

  // Если terminalId изменяется, проверяем уникальность
  if (terminalData.terminalId && terminalData.terminalId !== terminal.terminalId) {
    const existingTerminal = await terminalsRepo.findByTerminalId(terminalData.terminalId);
    if (existingTerminal) {
      throw new Error('Терминал с таким terminalId уже существует');
    }
  }

  // Валидация данных (только переданные поля)
  const validatedData = await terminalUpdateSchema.validate(terminalData, {
    stripUnknown: true,
    abortEarly: false,
  });

  // Обновляем терминал
  const updatedTerminal = await terminalsRepo.updateTerminal(id, validatedData);

  // Сброс кеша настроек
  await updateRevisionAndNotifyClients();

  return updatedTerminal;
};

/**
 * Удалить терминал
 */
export const deleteTerminal = async (id) => {
  const result = await terminalsRepo.deleteTerminal(id);

  // Сброс кеша настроек
  await updateRevisionAndNotifyClients();

  return result;
};

/**
 * Получить активные терминалы (для интеграции)
 */
export const getActiveTerminals = async () => await terminalsRepo.getActiveTerminals();

/**
 * Получить терминалы в формате для списка ресторанов
 */
export const getRestaurantList = async () => {
  const terminals = await terminalsRepo.getTerminalsForRestaurantList();

  return terminals.map((terminal) => ({
    text: terminal.address,
    value: terminal.terminalId,
  }));
};

/**
 * Получить терминалы по городам (для совместимости со старым API)
 */
export const getTerminalsByCity4legacy = async () => {
  const terminals = await terminalsRepo.getActiveTerminals();

  // Группировка по городам (как в старом коде)
  return terminals.reduce((acc, terminal) => {
    if (!acc[terminal.cityId]) {
      acc[terminal.cityId] = [];
    }
    acc[terminal.cityId].push({
      deliveryTerminalId: terminal.terminalId,
      name: terminal.name,
      address: terminal.address,
      isDisable: terminal.isDisabled,
      deliveryGroupName: terminal.deliveryGroupName,
      deliveryRestaurantName: terminal.deliveryRestaurantName,
      organizationId: terminal.organizationId,
    });
    return acc;
  }, {});
};

/**
 * Получить массив ID всех активных терминалов (для совместимости)
 */
export const getAllActiveTerminalIds = async () => {
  const terminals = await terminalsRepo.getActiveTerminals();
  return terminals.map((terminal) => terminal.terminalId);
};

/**
 * Проверить доступность терминала по ID
 */
export const isTerminalAvailable = async (terminalId) => {
  const terminal = await terminalsRepo.findByTerminalId(terminalId);
  return terminal && !terminal.isDisabled;
};
