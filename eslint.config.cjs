[
  {
    "extends": ["airbnb-base", "prettier", "plugin:node/recommended"],
    "plugins": ["prettier", "node"],
    "env": {
      "node": true,
      "es2022": true
    },
    "parserOptions": {
      "ecmaVersion": 2022,
      "allowImportExportEverywhere": true
    },
    "rules": {
      "prettier/prettier": "error",
      "strict": "off",
      "consistent-return": "off",
      "import/extensions": "off",
      "global-require": "off",
      "no-restricted-syntax": "warn",
      "guard-for-in": "warn",
      "prefer-destructuring": "warn",
      "import/prefer-default-export": "off",
      "no-unpublished-import": "off",
      "node/no-unsupported-features/es-syntax": [
        "warn",
        {
          "version": ">=18.0.0",
          "ignores": ["modules"]
        }
      ]
    },
    "overrides": [
      {
        "files": ["test/**/*.js"],
        "env": {
          "mocha": true
        }
      },
      {
        "files": ["assets/**/*.js"],
        "env": {
          "browser": true
        }
      }
    ]
  }
];
