// Simulates the CSS Validator

'use strict';

const express = require('express');

const tokenChecker = express();

tokenChecker.get('/authorize', (req, res) => {
  const uri = req.query.spec;
  const { token } = req.query;
  const json = {
    token,
    spec: uri,
    source: 'http://localhost:3001/',
    authorized: true,
  };

  return res.json(json);
});

module.exports = tokenChecker;
