module.exports = {
  apps: [
    {
      name: 'fuji-web-v3.fuji.ru',
      exec_mode: 'cluster',
      instances: 1,
      script: './node_modules/nuxt/bin/nuxt.js',
      args: 'start',
    },
  ],
};
