/**
 * @file A `JsonHttpService` represents an external HTTP connection with side effects.
 * It implements an authenticated POST request with a JSON response.
 */

'use strict';

const Promise = require('promise');
const Request = require('request');

/**
 * @exports lib/json-http-service
 * @param {string} url - The URL of the service to POST to
 * @param {string} user - The user used for authentication
 * @param {string} pass - The password used for authentication
 */
function JsonHttpService(url, user, pass) {
  if (typeof this !== 'object') {
    throw new TypeError('JsonHttpService must be constructed via new');
  }

  if (typeof url !== 'string') throw new TypeError('url must be a string');
  if (typeof user !== 'string') throw new TypeError('user must be a string');
  if (typeof pass !== 'string') throw new TypeError('pass must be a string');

  this.url = url;
  this.user = user;
  this.pass = pass;

  Object.freeze(this);
}

JsonHttpService.prototype = {
  /**
   * Make a POST request to the service, using a JSON payload
   *
   * @param {Object} body - The payload to send along with the POST request
   * @returns {Promise.<Object>} Promise containing `{response, body}` for this request
   */
  post(body) {
    const self = this;

    return new Promise((resolve, reject) => {
      Request.post(
        {
          url: self.url,
          json: true,
          auth: { user: self.user, pass: self.pass },
          body,
        },
        (error, response, bodyResult) => {
          if (error) reject(error);
          else resolve({ response, body: bodyResult });
        },
      );
    });
  },
};

module.exports = JsonHttpService;
