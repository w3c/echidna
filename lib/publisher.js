'use strict';

var List = require('immutable').List;
var Map = require('immutable').Map;
var Moment = require('moment');
var Promise = require('promise');

/**
 * Pure function that publish a set of metadata to an external service.
 *
 * @class
 * @param {Object} service - An object implementing a `post` function
 */
var Publisher = function (service) {
  if (typeof service !== 'object' || typeof service.post !== 'function') {
    throw new TypeError(
      'service must be defined and implement a post function'
    );
  }

  this.service = service;
}

/**
 * Publish the set of metadata using a POSTable service.
 *
 * @param {Map.<string, *>} metadata - The metadata of the document to publish
 * @returns Promise.<Array.<String>> A list of publication errors for this set of metadata
 */
Publisher.prototype.publish = function (metadata) {
  if (!(metadata instanceof Map)) throw new TypeError('metadata must be a Map');

  return this.service.post({
    specversion: {
      status: metadata.get('status'),
      uri: metadata.get('thisVersion'),
      latestVersionUri: metadata.get('latestVersion'),
      previousVersionUri: metadata.get('previousVersion'),
      date: Moment(metadata.get('docDate')).format('YYYY-MM-DD'),
      title: metadata.get('title'),
      deliverers: metadata.get('delivererIDs'),
      editors: metadata.get('editorIDs'),
      informative: false, // FIXME Not always true
      editorDraft: metadata.get('editorsDraft'),
      processRules: metadata.get('process')
    }
  }).then(function (out) {
    var response = out.response;
    var body = out.body;

    switch (response.statusCode) {
      case 501: return Promise.reject(new Error(body.message));
      case 400: return Promise.resolve(List(body.errors));
      case 201: return Promise.resolve(List());
      default:
        return Promise.reject(new Error(
          'There was an error when publishing: code ' + response.statusCode
        ));
    }
  });
}

module.exports = Publisher;
