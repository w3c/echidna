/**
 * @file Token method is restricted to CI tools only. Check if the origin IP is allowed to submit the request
 */

'use strict';

import Promise from 'promise';
import { Octokit } from '@octokit/core';
import fs from 'fs';
import ipRangeCheck from 'ip-range-check';
import pkg from 'immutable';
import path from 'path';
import { fileURLToPath } from 'url';

const { List } = pkg;
// eslint-disable-next-line no-underscore-dangle
const __filenameNew = fileURLToPath(import.meta.url);
// eslint-disable-next-line no-underscore-dangle
const __dirname = path.dirname(__filenameNew);

/**
 * @exports lib/ip-checker
 */

const IPChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

IPChecker.check = ip =>
  new Promise(resolve => {
    let errors = new List();
    const octokit = new Octokit({ auth: global.GH_TOKEN });
    const ghIp = octokit.request('GET /meta');
    // downloaded from https://www.microsoft.com/en-us/download/details.aspx?id=56519
    const azureIp = fs.promises
      // eslint-disable-next-line no-undef
      .readFile(`${__dirname}/../ServiceTags_Public.json`)
      .then(JSON.parse);
    Promise.all([ghIp, azureIp])
      .then(values => {
        let allowedIPs = [];
        values.forEach(v => {
          if (v.data) {
            allowedIPs = allowedIPs.concat([
              ...v.data.hooks,
              ...v.data.web,
              ...v.data.actions,
            ]); // GH Actions
          } else if (v.values) {
            allowedIPs = allowedIPs.concat(
              ...v.values.map(a => a.properties.addressPrefixes),
            ); // azure IP Ranges
          }
        });

        if (!ipRangeCheck(ip, allowedIPs)) {
          errors = errors.push(
            "The token method is restricted to GitHub Actions only. If you don't want to rely on GitHub Actions, please use the tar method.",
          );
        }
        resolve(errors);
      })
      // eslint-disable-next-line no-console
      .catch(e => console.error(e));
  });

export default IPChecker;
