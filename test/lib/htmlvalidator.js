// Simulates the HTML validator
'use strict';

var express = require('express');
var validator = express();
module.exports = validator;

validator.get('/check', function (req, res) {
  var url = req.query.uri || '';
  var result = {
    url: url,
    messages: [],
    source: {
      encoding: 'utf-8',
      type: 'text/html'
    }
  };
  return res.json(result);
});
