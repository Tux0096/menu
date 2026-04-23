import * as settingRepo from './setting.repository.js';
import * as configCommon from './config/common.js';
import { getStories } from '../story/story.service.js';
import connectionManager from '../services/ConnectionManager.js';
import { processSetting, unprocessSetting } from './setting.helper.js';
import { getRevision, updateRevision } from '../storage/storage.repository.js';
import { CHECKOUT_DELIVERY_TEXT } from './config/common.js';

export const getSettingsDB = async () => {
  const settings = await settingRepo.getSettings();
  return settings.map((setting) => processSetting(setting));
};

export const getSettingByNameDB = async (name) => {
  const setting = await settingRepo.getSettingByName(name);
  if (!setting) {
    return null;
  }
  return processSetting(setting);
};

export const getSettings = async (city = 'samara', zoneId = null) => {
  try {
    const stories = await getStories();

    const settingsDBRaw = await getSettingsDB();
    const settingsDB = settingsDBRaw.reduce((acc, setting) => {
      acc[setting.name] = setting.value;
      return acc;
    }, {});

    return {
      ...configCommon,
      ...settingsDB,
      STORIES: stories,
      CATALOG_MENU: await configCommon.CATALOG_MENU(city),
      CITY_ZONES: await configCommon.CITY_ZONES(),
      DELIVERY_TERMINALS: await configCommon.DELIVERY_TERMINALS(),
      CHECKOUT_DELIVERY_TEXT: await CHECKOUT_DELIVERY_TEXT(zoneId),
    };
  } catch (error) {
    console.error('An error occurred while getting settings:', error);
    throw error;
  }
};

export const getSettingByName = async (name, zoneId = null) => {
  const config = await getSettings('samara', zoneId);
  return config[name] || false;
};

export const getSettingValueByName = async (name) => {
  const setting = await getSettingByName(name);
  return setting ? setting.value : null;
};

export const updateSetting = async (entity) => {
  await settingRepo.updateSetting(entity);
  const currentRevision = await getRevision();
  await updateRevision(currentRevision + 1);
  connectionManager.sendMessageToAll({ type: 'settings:update' });
};

export const updateSettings = async (entities) => {
  const processedSetting = entities.map((entity) => unprocessSetting(entity));
  await settingRepo.updateSettings(processedSetting);
  const currentRevision = await getRevision();
  await updateRevision(currentRevision + 1);
  connectionManager.sendMessageToAll({ type: 'settings:update' });
};

export const update = async (name, setting) => {
  if (!name && !setting) {
    return;
  }

  await settingRepo.update(name, setting.value);
  const currentRevision = await getRevision();
  await updateRevision(currentRevision + 1);
  connectionManager.sendMessageToAll({ type: 'settings:update' });
};
