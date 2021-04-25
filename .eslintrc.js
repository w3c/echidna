module.exports = {
  extends: ['airbnb-base', 'prettier'],
  plugins: ['prettier', 'node'],
  env: {
    node: true,
    es2017: true,
  },
  rules: {
    'prettier/prettier': 'error',

    // https://github.com/airbnb/javascript/blob/master/packages/eslint-config-airbnb-base/rules/strict.js
    // airbnb uses babel to insert `'use strict', but we don't;
    strict: 'off',
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: {
        mocha: true,
      },
    },
  ],
};
