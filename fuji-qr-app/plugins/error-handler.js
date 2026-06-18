import Vue from 'vue';

export default function () {
  Vue.config.errorHandler = (error, vm, info) => {
    console.log('errorHandler');
    console.error('TODO: обработать ошибки', error, vm, info);
  };

  Vue.mixin({
    errorCaptured(error, vm, info) {
      console.log('errorCaptured');
      console.error('TODO: обработать ошибки', error, vm, info);
      // Возвращение false предотвращает дальнейшую передачу ошибки
      return false;
    },
  });
}
