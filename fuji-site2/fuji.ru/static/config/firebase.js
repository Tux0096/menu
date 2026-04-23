// Firebase configuration - единый файл конфигурации
export const firebaseConfig = {
    apiKey: 'AIzaSyBMwyLWaHix90EbkHKweGs_MIcIvwsTa54',
    authDomain: 'fuji-notifications.firebaseapp.com',
    projectId: 'fuji-notifications',
    storageBucket: 'fuji-notifications.appspot.com',
    messagingSenderId: '354645594816',
    appId: '1:354645594816:web:64b37d60db3e14f1495325',
    measurementId: 'G-8X1NPYTKZ9',
};

// Для Service Worker - делаем глобальную переменную
if (typeof self !== 'undefined') {
    self.firebaseConfig = firebaseConfig;
} 