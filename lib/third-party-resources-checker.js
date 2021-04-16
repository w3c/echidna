/**
 * @file Check if the resources the give URL is requiring, other than what's in the allowlist and `www.w3.org`.
 */

'use strict';

const {List} = require('immutable');
const Checker = require('third-party-resources-checker');

/**
 * @exports lib/third-party-resources-checker
 */

const ThirdPartyResourcesChecker = {};

ThirdPartyResourcesChecker.check = function (url, allowlist) {
  return Checker.check(url, allowlist).then((result) => new List(result[1]));
};

module.exports = ThirdPartyResourcesChecker;
