/**
 * @file When using CURL with tar file, check if the user can publish the document by checking if he's participating in the WG
 */

'use strict';

const { List } = require('immutable');
const Promise = require('promise');

/**
 * @exports lib/user-checker
 */

const UserChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

UserChecker.check = (user, delivererIDs) =>
  new Promise(resolve => {
    let errors = new List();
    const groups = new Set(
      user.memberOf.map(group => {
        const matches = group.match(/^cn=(\d*),ou=groups,dc=w3,dc=org$/i);
        if (matches) return Number(matches[1]);
        return null;
      }),
    );
    const delivererSet = new Set(delivererIDs);

    if (![...groups].some(x => delivererSet.has(x))) {
      errors = errors.push(
        `You are not participating in the following groups: ${delivererIDs.join(
          ', ',
        )}`,
      );
    }
    resolve(errors);
  });

module.exports = UserChecker;
