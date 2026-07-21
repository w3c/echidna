// Simulates the HTML validator

'use strict';

import express from 'express';

const validator = express();

validator.get('/nu', (req, res) => {
  const url = req.query.doc || '';
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

export default validator;
