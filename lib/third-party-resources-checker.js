/**
 * @file Check if the resources the give URL is requiring, other than what's in the allowlist and `www.w3.org`.
 */
'use strict';

var List = require('immutable').List;
var Checker = require('third-party-resources-checker');

/**
 * @exports lib/third-party-resources-checker
 */

var ThirdPartyResourcesChecker = {};

ThirdPartyResourcesChecker.check = function (url, allowlist) {
  return Checker.check(url, allowlist).then(function (result) {
    return new List(result[1]);
  });
};

module.exports = ThirdPartyResourcesChecker;
