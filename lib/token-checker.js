'use strict';

var List = require('immutable').List;
var Promise = require('promise');
var Request = require('request');

var TokenChecker = {};

// @returns Promise.<List.<String>>
TokenChecker.check = function (url, token, source) {
  return new Promise(function (resolve, reject) {
    var options = {
      uri: global.TOKEN_ENDPOINT,
      qs: { spec: url, token: token },
      auth: { user: global.USERNAME, pass: global.PASSWORD }
    };

    Request.get(options, function (err, res, body) {
      if (err) reject(new Error(
        'There was an error while checking the token: ',
        err
      ));

      var report = JSON.parse(body);
      var matchSource = (
        source.indexOf(report.source.replace(/^https:/i, 'http:')) === 0 ||
        source.indexOf(report.source.replace(/^http:/i, 'https:')) === 0
      );
      var errors = new List();

      if (!report.authorized) errors = errors.push('not-authorized');
      if (!matchSource) errors = errors.push('bad-source');

      resolve(errors);
    });
  });
};

module.exports = TokenChecker;
