'use strict';

var List = require('immutable').List;
var Checker = require('third-party-resources-checker');

var ThirdPartyResourcesChecker = function () {};

ThirdPartyResourcesChecker.check = function (url, whitelist) {
  return Checker.check(url, whitelist).then(function (result) {
    return List(result[1]);
  });
};

module.exports = ThirdPartyResourcesChecker;
