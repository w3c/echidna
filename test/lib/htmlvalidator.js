// Simulates the HTML validator

'use strict';

const express = require('express');

const validator = express();

module.exports = validator;

validator.get('/nu', (req, res) => {
  const url = req.query.doc || '';
  const errors = [
    {
      type: 'error',
      lastLine: 0,
      lastColumn: 0,
      message: 'inline-box is not a display value : ',
    },
  ];
  const warnings = [
    {
      type: 'info',
      subType: 'warning',
      message: 'Property -moz-border-radius is an unknown vendor extension',
    },
  ];
  const result = {
    url,
    messages: [],
    source: {
      encoding: 'utf-8',
      type: 'text/html',
    },
  };

  if (url.indexOf('csserror') !== -1) {
    result.messages = errors;
  }
  if (url.indexOf('csswarning') !== -1) {
    result.messages = warnings;
  }

  return res.json(result);
});
