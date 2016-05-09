'use strict';

var List = require('immutable').List;
var Promise = require('promise');

/**
 * @exports lib/user-checker
 */

var UserChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

UserChecker.check = function (user, delivererIDs) {
  return new Promise(function (resolve) {
    var errors = new List();
    var groups = user.memberOf.map(function (group) {
      var matches = group.match(/^cn=(\d*),ou=groups,dc=w3,dc=org$/i);

      if (matches) return Number(matches[1]);
    });

    for (var i = 0; i < delivererIDs.length; i++) {
      if (groups.indexOf(delivererIDs[i]) < 0) {
        errors = errors.push('You are not participating in group: ' +
          delivererIDs[i]);
      }
    }
    resolve(errors);
  });
};

module.exports = UserChecker;
