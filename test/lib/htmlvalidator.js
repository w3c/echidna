// Simulates the HTML validator

'use strict';

const express = require('express');

const validator = express();

module.exports = validator;

validator.get('/check', (req, res) => {
  const url = req.query.uri || '';
  const result = {
    url,
    messages: [],
    source: {
      encoding: 'utf-8',
      type: 'text/html',
    },
  };

  return res.json(result);
});
