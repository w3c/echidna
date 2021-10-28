/**
 * @file Call the publication backend with a list of metadata
 * Post service defined in lib/json-http-service.
 */

'use strict';

const { List } = require('immutable');
const { Map } = require('immutable');
const Moment = require('moment');
const Promise = require('promise');

/**
 * Pure function that publish a set of metadata to an external service.
 *
 * @exports lib/publisher
 * @param {Object} service - An object implementing a `post` function
 */
function Publisher(service) {
  if (typeof service !== 'object' || typeof service.post !== 'function') {
    throw new TypeError(
      'service must be defined and implement a post function',
    );
  }

  this.service = service;

  Object.freeze(this);
}

Publisher.prototype = {
  /**
   * Publish the set of metadata using a POSTable service.
   *
   * @param {Map.<string, *>} metadata - The metadata of the document to publish
   * @returns Promise.<Array.<String>> A list of publication errors for this set of metadata
   */
  publish(metadata) {
    if (!(metadata instanceof Map))
      throw new TypeError('metadata must be a Map');
    return this.service
      .post({
        specversion: {
          status: metadata.get('profile'),
          uri: metadata.get('thisVersion'),
          latestVersionUri: metadata.get('latestVersion'),
          previousVersionUri: metadata.get('previousVersion'),
          date: new Moment(metadata.get('docDate'), 'YYYY-MM-DD').format(
            'YYYY-MM-DD',
          ),
          title: metadata.get('title'),
          deliverers: metadata.get('delivererIDs'),
          editors: metadata.get('editors'),
          track: metadata.get('rectrack'),
          editorDraft: metadata.get('editorDraft'),
          processRules: metadata.get('processRules'),
          implementationReport: metadata.get('implementationReport'),
          implementationFeedbackDue: new Moment(
            metadata.get('implementationFeedbackDue'),
            'YYYY-MM-DD',
          ).format('YYYY-MM-DD'),
          cfe: metadata.get('cfe'),
        },
      })
      .then(out => {
        const { response } = out;
        const { body } = out;

        switch (response.statusCode) {
          case 501:
            return Promise.reject(new Error(body.message));
          case 400:
            return Promise.resolve(new List(body.errors));
          case 201:
            return Promise.resolve(new List());
          default:
            return Promise.reject(
              new Error(
                `There was an error when publishing: code ${response.statusCode}`,
              ),
            );
        }
      });
  },
};

module.exports = Publisher;
