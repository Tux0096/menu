module.exports = {
  apps: [
    {
      name: 'fuji-back-v3',
      script: 'app.js',
      exec_mode: 'cluster',
      instances: 1,
      env: {
        NODE_ENV: 'production',
      },
    },
    {
      name: 'order-status-worker',
      script: 'order/order-status-worker.js',
      exec_mode: 'cluster',
      instances: 4,
      env: {
        NODE_ENV: 'production',
        ORDER_STATUS_SYNC: 'false',
      },
    },
  ],
};
