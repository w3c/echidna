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
        'guard-for-in': 'warn',
        'no-restricted-globals': 'warn',
        'no-restricted-syntax': 'warn',
        // chai assertions like to.be.true are considered unused expressions
        'no-unused-expressions': 'off',
        // devDependencies are checked unless "files" or .npmignore are used https://github.com/mysticatea/eslint-plugin-node/blob/v11.1.0/docs/rules/no-unpublished-require.md
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
