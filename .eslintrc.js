module.exports = {
  extends: ['airbnb-base', 'prettier', 'plugin:node/recommended'],
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

    // https://eslint.org/docs/rules/consistent-return
    // If you want to allow functions to have different return behavior depending on code branching, then it is safe to disable this rule.
    'consistent-return': 'off',
  },
  overrides: [
    {
      files: ['test/**/*.js'],
      env: {
        mocha: true,
      },
    },
    {
      files: ['assets/**/*.js'],
      env: {
        browser: true,
      },
    },
  ],
};
