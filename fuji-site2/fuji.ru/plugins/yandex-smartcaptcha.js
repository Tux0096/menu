let widgetId = null;
let scriptLoadPromise = null;

export default ({ store }, inject) => {
  if (!store.getters['setting/IS_WITHOUT_CAPTCHA']) {
    const loadSmartCaptchaScript = () => {
      if (scriptLoadPromise) {
        return scriptLoadPromise;
      }

      if (window.smartCaptcha) {
        return Promise.resolve();
      }

      scriptLoadPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://smartcaptcha.yandexcloud.net/captcha.js?render=onload';
        script.defer = true;

        script.onload = () => {
          console.log('SmartCaptcha успешно загружен.');
          scriptLoadPromise = null;
          resolve();
        };

        script.onerror = () => {
          console.error('Не удалось загрузить скрипт SmartCaptcha.');
          scriptLoadPromise = null;
          reject(new Error('Failed to load SmartCaptcha script'));
        };

        document.head.appendChild(script);
      });

      return scriptLoadPromise;
    };

    inject('executeYandexCaptcha', async (callback) => {
      try {
        if (!window.smartCaptcha) {
          await loadSmartCaptchaScript();
        }

        widgetId = window.smartCaptcha.render('captcha-container', {
          sitekey: store.getters['setting/SMARTCAPTCHA_SITE_KEY'],
          invisible: true,
          hl: 'ru',
          test: false,
          hideShield: true,
          callback,
        });

        window.smartCaptcha.execute(widgetId);
      } catch (error) {
        console.error('Ошибка при выполнении executeYandexCaptcha:', error);
      }
    });

    inject('getResponseYandexCaptcha', async () => {
      try {
        if (!window.smartCaptcha) {
          await loadSmartCaptchaScript();
        }

        if (!window.smartCaptcha || widgetId === null) {
          console.error('SmartCaptcha не инициализирован или widgetId не установлен.');
          return null;
        }

        return window.smartCaptcha.getResponse(widgetId);
      } catch (error) {
        console.error('Ошибка при получении ответа капчи:', error);
        return null;
      }
    });
  }
};
