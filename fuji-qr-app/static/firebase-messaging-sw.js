// в 2 местах конфиг править, здесь и для мобил (plugins/firebase.js)
const firebaseConfig = {
  apiKey: 'AIzaSyBMwyLWaHix90EbkHKweGs_MIcIvwsTa54',
  authDomain: 'fuji-notifications.firebaseapp.com',
  projectId: 'fuji-notifications',
  storageBucket: 'fuji-notifications.appspot.com',
  messagingSenderId: '354645594816',
  appId: '1:354645594816:web:64b37d60db3e14f1495325',
  measurementId: 'G-8X1NPYTKZ9',
};

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Fuji';
  const notificationOptions = {
    body: payload.notification?.body || 'У вас новое уведомление',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'fuji-notification',
    data: {
      url: payload.data?.route || '/personal/notification',
    },
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// ✅ Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw.js] Notification click received.');
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(urlToOpen) && 'focus' in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
