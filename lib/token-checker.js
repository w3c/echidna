/**
 * @file check if the user, using the token method, is authorized to publish the document. The specification shortlink should match the one associated with the token.
 */

'use strict';

import Promise from 'promise';
import sua from 'superagent';
import pkg from 'immutable';

const { List } = pkg;

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

    sua
      .get(global.TOKEN_ENDPOINT)
      .set('User-Agent', 'W3C/Echidna')
      .set('X-W3C-Sso', 'bypass')
      .query({ spec: url, token })
      .auth(global.USERNAME, global.PASSWORD)
      .end((err, res) => {
        if (err) reject(new Error('There was an error while checking the token: ', err));

        const report = res.body;
        let errors = new List();

        if (!report.authorized) errors = errors.push('not-authorized');

        resolve(errors);
      });
  });

export default TokenChecker;
