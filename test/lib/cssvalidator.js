// Simulates the CSS Validator

'use strict';

const express = require('express');

const validator = express();

/**
 * @exports test/lib/validator
 */

module.exports = validator;

validator.get('/css-validator/validator', (req, res) => {
  const uri = req.query.uri || '';
  const profile = req.query.profile || 'css3';
  const today = new Date();
  const errors = [
    {
      source: uri,
      context: '.ds',
      type: 'value',
      message: 'inline-box is not a display value : ',
    },
    {
      source: uri,
      context: '.kd-button-submit',
      type: 'value',
      message: 'top is not a color value',
    },
  ];
  const warnings = [
    {
      source: uri,
      line: 0,
      message: 'Property -moz-border-radius is an unknown vendor extension',
      type: 'vendor-extension',
      level: 0,
    },
    {
      source: uri,
      line: 0,
      message: 'Property -webkit-border-radius is an unknown vendor extension',
      type: 'vendor-extension',
      level: 0,
    },
  ];
  const json = {
    cssvalidation: {
      uri,
      checkedby: 'http://www.w3.org/2005/07/css-validator',
      csslevel: profile,
      date: today.toISOString(),
      timestamp: String(today.getTime()),
      validity: true,
      result: {
        errorcount: 0,
        warningcount: 0,
      },
    },
  };

  if (uri.indexOf('csserror') !== -1) {
    json.cssvalidation.validity = false;
    json.cssvalidation.errors = errors;
    json.cssvalidation.result.errorcount = errors.length;
  }
  if (uri.indexOf('csswarning') !== -1) {
    json.cssvalidation.warnings = warnings;
    json.cssvalidation.result.warningcount = warnings.length;
  }
  return res.json(json);
});
