import { initializeApp } from 'firebase/app';
import { getAnalytics } from 'firebase/analytics';
import { getPerformance } from 'firebase/performance';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

export const firebaseConfig = {
  apiKey: 'AIzaSyBMwyLWaHix90EbkHKweGs_MIcIvwsTa54',
  authDomain: 'fuji-notifications.firebaseapp.com',
  projectId: 'fuji-notifications',
  storageBucket: 'fuji-notifications.appspot.com',
  messagingSenderId: '354645594816',
  appId: '1:354645594816:web:64b37d60db3e14f1495325',
  measurementId: 'G-8X1NPYTKZ9',
};

export default (context, inject) => {
  if (!process.client) {
    return;
  }

  let app;
  try {
    app = initializeApp(firebaseConfig);
    inject('firebase', app);
    try {
      inject('analytics', getAnalytics(app));
    } catch (e) {
      console.warn('Firebase analytics unavailable:', e.message);
    }
    try {
      inject('performance', getPerformance(app));
    } catch (e) {
      console.warn('Firebase performance unavailable:', e.message);
    }
  } catch (e) {
    console.warn('Firebase init skipped:', e.message);
    return;
  }

  if ('serviceWorker' in navigator) {
    initializeWebPush(context, app);
  }
};

async function initializeWebPush(context, app) {
  let messaging;
  try {
    messaging = getMessaging(app);
    context.inject('messaging', messaging);
  } catch (e) {
    console.warn('Firebase messaging unavailable:', e.message);
    return;
  }

  try {
    await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const permission = await Notification.requestPermission();

    if (permission === 'granted') {
      const token = await getToken(messaging, {
        vapidKey: 'BHM0qEuyFNi3lcIXhV1i6ZaRhevMLdJzPjsmX8Gl0tkRfxIo2hlpfsKZbLAGIVoYk7kYOaetUCSp_laycBJEhdE',
      });

      if (token) {
        context.store.commit('notification/setFCMToken', token);
        if (context.store.getters['user/id']) {
          await registerWebDevice(token, context.store.getters['user/id'], context);
        }
      }
    }

    onMessage(messaging, (payload) => {
      if (payload.notification) {
        new Notification(payload.notification.title, {
          body: payload.notification.body,
          icon: '/icon-192x192.png',
        });
      }
    });
  } catch (error) {
    console.warn('Firebase messaging init skipped:', error.message);
  }
}

async function registerWebDevice(fcmToken, customerId, context) {
  try {
    await context.$axios.post(`${context.$config.FRONT_API_URL}/api/v1/notification/web-device`, {
      customerId,
      fcmToken,
    });
  } catch (error) {
    console.warn('Web device registration skipped:', error.message);
  }
}
