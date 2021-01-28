/**
 * @file Token method is restricted to CI tools only. Check if the origin IP is allowed to submit the request
 */
'use strict';

var List = require('immutable').List;
var Promise = require('promise');

/**
 * @exports lib/ip-checker
 */

var IPChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

IPChecker.check = function (ip) {
  return new Promise(function (resolve) {
    var errors = new List();
    const { Octokit } = require("@octokit/core");
    const ipRangeCheck = require("ip-range-check");
    const octokit = new Octokit({ auth: global.GH_TOKEN });
    let allowedIPs = global.TRAVIS_IP; // travis IPs
    octokit.request('GET /meta').then(res => {
      if (res.data && res.data.actions) {
        // GH actions IPs
        allowedIPs = allowedIPs.concat(res.data.actions);
      }
      if (!ipRangeCheck(ip, allowedIPs)) {
        errors = errors.push('The token method is restricted to GitHub Actions and Travis CI only. If ' +
        'you want to submit a request outside these tools, please use the tar method.');
      }
      resolve(errors);
    });
  });
};

module.exports = IPChecker;
