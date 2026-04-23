module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'plugin:vue/recommended',
    'airbnb-base',
    'airbnb-typescript/base',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: './tsconfig.json',
    extraFileExtensions: ['.vue'],
  },
  plugins: [
    'vue',
    '@typescript-eslint',
  ],
  rules: {
    'max-len': ['error', { code: 120 }],
    'vue/no-multiple-template-root': 'off',
    'vue/max-len': [
      'error', {
        code: 120,
        template: 120,
      }],
    'no-param-reassign': 0,
    'no-shadow': 0,
    'global-require': 'off',
  },
  settings: {
    'import/resolver': {
      nuxt: {
        extensions: ['.js', '.vue', '.ts'],
      },
    },
  },
  ignorePatterns: ['temp.js', '**/vendor/*.js', '**/static/*'],
};
