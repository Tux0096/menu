import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

// в 2 местах конфиг править, здесь и для браузерных пушей (static/config/firebase.js)
export const firebaseConfig = {
  apiKey: 'AIzaSyBMwyLWaHix90EbkHKweGs_MIcIvwsTa54',
  authDomain: 'fuji-notifications.firebaseapp.com',
  projectId: 'fuji-notifications',
  storageBucket: 'fuji-notifications.appspot.com',
  messagingSenderId: '354645594816',
  appId: '1:354645594816:web:64b37d60db3e14f1495325',
  measurementId: 'G-8X1NPYTKZ9',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const performance = getPerformance(app);

// Initialize Firebase Cloud Messaging
let messaging = null;

export default (context, inject) => {
  inject('firebase', app);
  inject('analytics', analytics);
  inject('performance', performance);

  // Инициализация FCM только на клиенте
  if (process.client && 'serviceWorker' in navigator) {
    messaging = getMessaging(app);
    inject('messaging', messaging);

    // Инициализация веб-пушей
    initializeWebPush(context);

    // Отслеживаем изменения статуса авторизации для отправки токена
    context.app.store.watch(
      (state, getters) => getters['user/isAuth'],
      (isAuth, wasAuth) => {
        // Если пользователь авторизовался (с false на true) и есть FCM токен
        if (isAuth && !wasAuth && context.store.getters['notification/FCMToken']) {
          const userId = context.store.getters['user/id'];
          if (userId) {
            registerWebDevice(context.store.getters['notification/FCMToken'], userId, context);
          }
        }
      },
    );
  }
};

// Функция инициализации веб-пушей
async function initializeWebPush(context) {
  try {
    // Регистрируем Service Worker
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    // Запрашиваем разрешение на уведомления
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      console.log('Notification permission granted.');

      // Получаем FCM токен (VAPID ключ нужно получить из Firebase Console)
      const token = await getToken(messaging, {
        vapidKey: 'BHM0qEuyFNi3lcIXhV1i6ZaRhevMLdJzPjsmX8Gl0tkRfxIo2hlpfsKZbLAGIVoYk7kYOaetUCSp_laycBJEhdE',
      });

      if (token) {
        console.log('FCM Token:', token);

        // Сохраняем токен в стор независимо от статуса авторизации
        context.store.commit('notification/setFCMToken', token);

        // Регистрируем веб-устройство если пользователь авторизован
        if (context.store.getters['user/id']) {
          await registerWebDevice(token, context.store.getters['user/id'], context);
        }
      }
    } else {
      console.log('Unable to get permission to notify.');
    }

    // Обработка сообщений в foreground
    onMessage(messaging, (payload) => {
      console.log('Message received in foreground: ', payload);

      // Показываем уведомление в foreground
      if (payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/icon-192x192.png',
        });
      }
    });
  } catch (error) {
    console.error('Firebase messaging initialization error:', error);
  }
}

// Функция для регистрации веб-устройства
async function registerWebDevice(fcmToken, customerId, context) {
  try {
    await context.$axios.post(`${context.$config.FRONT_API_URL}/api/v1/notification/web-device`, {
      customerId,
      fcmToken,
    });

    console.log('Web device registered successfully');
  } catch (error) {
    console.error('Error registering web device:', error);
  }
}
