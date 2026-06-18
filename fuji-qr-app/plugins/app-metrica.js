import { AppMetrica } from 'capacitor-appmetrica-plugin';
import { Capacitor } from '@capacitor/core';

export default () => {
  if (Capacitor.getPlatform() === 'web' || !process.env.APP_METRICA_KEY) {
    return;
  }
  AppMetrica.activate({
    apiKey: process.env.APP_METRICA_KEY,
    logs: true,
  }).then(() => {
    console.log('AppMetrica приложения запущена.');
  }).catch((error) => {
    console.log(error);
  });
};

