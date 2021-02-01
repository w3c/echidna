/**
 * @file check if the user, using the token method, is authorized to publish the document. The specification shortlink should match the one associated with the token.
 */
'use strict';

var List = require('immutable').List;
var Promise = require('promise');
var Request = require('request');

/**
 * @exports lib/token-checker
 */

var TokenChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

TokenChecker.check = function (url, token) {
  return new Promise(function (resolve, reject) {
    var options = {
      uri: global.TOKEN_ENDPOINT,
      qs: { spec: url, token: token },
      // USERNAME & PASSWORD is a credential for https://www.w3.org/Web/publications/authorize?
      auth: { user: global.USERNAME, pass: global.PASSWORD }
    };

    Request.get(options, function (err, res, body) {
      if (err) reject(new Error(
        'There was an error while checking the token: ',
        err
      ));

      var report = JSON.parse(body);
      var errors = new List();

      if (!report.authorized) errors = errors.push('not-authorized');

      resolve(errors);
    });
  });
};

module.exports = TokenChecker;
