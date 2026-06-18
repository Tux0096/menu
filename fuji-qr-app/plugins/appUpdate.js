import { Capacitor } from '@capacitor/core';
import {
  AppUpdate,
  AppUpdateAvailability,
} from '@capawesome/capacitor-app-update';
import { nuxtInstance } from '~/plugins/nuxt-instance';

const COUNTRY_CODE = 'RU';
const CHECK_INTERVAL_MINUTES = 10;
let periodicCheckIntervalId = null;

/**
 * Проверяет доступность обновлений и инициирует процесс обновления.
 */
const checkForUpdates = async () => {
  try {
    console.log('Начинаем проверку обновлений...');

    // Для iOS указываем страну, для Android — без параметров.
    const infoForIOS = AppUpdate.getAppUpdateInfo({ country: COUNTRY_CODE });
    const infoForAndroid = AppUpdate.getAppUpdateInfo();

    const info = await Promise.any([infoForIOS, infoForAndroid]);
    console.log('test info', info)
    if (info.updateAvailability === AppUpdateAvailability.UPDATE_AVAILABLE) {
      console.log('Обновление доступно.');
      if (info.immediateUpdateAllowed) {
        console.log('Немедленное обновление доступно. Начинаем обновление.');
        await AppUpdate.performImmediateUpdate();
      } else if (info.flexibleUpdateAllowed) {
        console.log('Гибкое обновление доступно. Начинаем обновление.');
        await AppUpdate.startFlexibleUpdate();
      } else {
        console.log('Обновление доступно, но автоматическое обновление невозможно.');
        console.log('Пользователю необходимо обновить приложение вручную.');
        nuxtInstance.store.commit('modal/showAppUpdate');
        await AppUpdate.openAppStore();
      }
    } else {
      console.log('Обновлений не найдено.');
    }
  } catch (error) {
    console.error('Ошибка при проверке обновлений:', error);
  }
};

/**
 * Запускает периодическую проверку обновлений.
 * Проверка будет выполняться каждые CHECK_INTERVAL_MINUTES минут.
 */
const startPeriodicUpdateCheck = () => {
  if (periodicCheckIntervalId) {
    console.log('Периодическая проверка уже запущена.');
    return;
  }

  console.log('Запуск периодической проверки обновлений...');
  periodicCheckIntervalId = setInterval(async () => {
    console.log('Периодическая проверка обновлений...');
    await checkForUpdates();
  }, CHECK_INTERVAL_MINUTES * 60 * 1000);
};

export default async (context, inject) => {
  if (Capacitor.getPlatform() === 'web') {
    inject('checkForUpdates', async () => {});
    return;
  }
  await checkForUpdates();
  startPeriodicUpdateCheck();
  inject('checkForUpdates', checkForUpdates);
};
