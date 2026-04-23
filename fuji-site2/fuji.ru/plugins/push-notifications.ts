import {
  PushNotifications,
  PushNotificationSchema,
  ActionPerformed,
  Token,
} from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

import { handleNotification } from '~/lib/common';

export default ({ app }, inject) => {
  // Проверяем, что мы не в веб окружении
  if (Capacitor.getPlatform() === 'web') {
    console.log('Push notifications are not available in web environment');
    return;
  }

  // Запрос разрешения на использование пуш-уведомлений
  PushNotifications.requestPermissions().then((result) => {
    if (result.receive === 'granted') {
      // Регистрация для получения пуш-уведомлений через APNS/FCM
      PushNotifications.register();
    } else {
      // Обработка ошибки при отказе в разрешении
      console.error('Permission for push notifications was denied');
    }
  }).catch((error) => {
    console.error('Error requesting push notification permissions', error);
  });

  // Обработчик успешной регистрации для получения уведомлений
  PushNotifications.addListener('registration', (token: Token) => {
    console.log(`Push registration success, token: ${token.value}`);

    if (token) {
      // Проверяем существование модуля notification в store
      if (app.store._modules && app.store._modules.root._children.notification) {
        app.store.commit('notification/setFCMToken', token.value);
      } else {
        // Временно сохраняем токен в localStorage для веб окружения
        if (process.client) {
          localStorage.setItem('fcmToken', token.value);
        }
      }
    }
  });

  // Обработчик ошибки регистрации
  PushNotifications.addListener('registrationError', (error: any) => {
    console.error(`Error on registration: ${JSON.stringify(error)}`);
  });

  // Обработчик нажатия на уведомление
  PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
    handleNotification(notification.notification, app);
  });
};
