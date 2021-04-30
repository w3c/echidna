/**
 * @file check if the user, using the token method, is authorized to publish the document. The specification shortlink should match the one associated with the token.
 */

'use strict';

const { List } = require('immutable');
const Promise = require('promise');
const Request = require('request');

/**
 * @exports lib/token-checker
 */

const TokenChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

TokenChecker.check = (url, token) =>
  // url shortlink
  new Promise((resolve, reject) => {
    const options = {
      uri: global.TOKEN_ENDPOINT,
      qs: { spec: url, token },
      // USERNAME & PASSWORD is a credential for https://www.w3.org/Web/publications/authorize?
      auth: { user: global.USERNAME, pass: global.PASSWORD },
    };

    Request.get(options, (err, res, body) => {
      if (err)
        reject(new Error('There was an error while checking the token: ', err));

      const report = JSON.parse(body);
      let errors = new List();

      if (!report.authorized) errors = errors.push('not-authorized');

      resolve(errors);
    });
  });

module.exports = TokenChecker;
