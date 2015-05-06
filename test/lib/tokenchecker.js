// Simulates the CSS Validator
'use strict';

var express = require('express');
var tokenChecker = express();

tokenChecker.get('/authorize', function (req, res) {
  var uri = req.query.spec;
  var token = req.query.token;
  var json = {
    token: token,
    spec: uri,
    source: 'http://localhost:3001/drafts/',
    authorized: true
  };

  return res.json(json);
});

module.exports = tokenChecker;
