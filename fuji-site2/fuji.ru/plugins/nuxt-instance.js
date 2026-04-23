let nuxtInstance;

export default ({ app }, inject) => {
  nuxtInstance = app;
  inject('nuxtInstance', app);
};

export { nuxtInstance };
