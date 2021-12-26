module.exports = {
  extends: ['airbnb-base', 'plugin:node/recommended', 'prettier'],
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
        browser: true,
      },
      rules: {
        'func-names': 'off',
        'global-require': 'off',
        'guard-for-in': 'off',
        'import/extensions': 'off',
        'no-alert': 'off',
        'no-console': 'off',
        'no-new': 'off',
        'no-plusplus': 'off',
        'no-restricted-globals': 'off',
        'no-restricted-syntax': 'off',
        'no-shadow': 'off',
        'no-unused-expressions': 'off',
        'no-use-before-define': 'off',
        'node/no-unpublished-require': 'off',
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
