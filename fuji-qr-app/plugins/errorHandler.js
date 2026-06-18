export default function ({ app }) {
  app.vue.config.errorHandler = function globalErrorHandler(err, vm, info) {
    console.error('Vue error captured:', err, 'Info:', info);
  };
}
