'use strict';

var Map = require('immutable').Map;
var History = require('./history');

/**
 * A Request State is an immutable state corresponding to a request processing or processed by the system.
 *
 * @param {string} status - The current status of the request
 * @param {Map.<string, Job>} jobs - A map of all the jobs related to this request
 * @param {History} history - A human-readable history for this request
 * @param {Map.<string, *>} metadata - The metadata extracted by Specberus for this request
 */
function RequestState(status, jobs, history, metadata) {
  if (typeof this !== 'object') {
    throw new TypeError('RequestState must be constructed via new');
  }

  this.status = typeof status !== 'undefined' ? status : '';
  if (typeof this.status !== 'string') {
    throw new TypeError('status must be a string');
  }

  this.jobs = typeof jobs !== 'undefined' ? jobs : new Map();
  if (!(this.jobs instanceof Map)) {
    throw new TypeError('jobs must be a Map');
  }

  this.history = typeof history !== 'undefined' ? history : new History();
  if (!(this.history instanceof History)) {
    throw new TypeError('history must be a History');
  }

  this.metadata = typeof metadata !== 'undefined' ? metadata : new Map();
  if (!(this.metadata instanceof Map)) {
    throw new TypeError('metadata must be a Map');
  }

  /**
   * Returns a new job with a given keys set to a given value
   *
   * @param {string} k - The key to update
   * @param {*} v - The value to set
   * @returns {RequestState} The resulting request state
   */
  this.set = function (k, v) {
    switch (k) {
      case 'status':
        return new RequestState(v, this.jobs, this.history, this.metadata);
      case 'jobs':
        return new RequestState(this.status, v, this.history, this.metadata);
      case 'history':
        return new RequestState(this.status, this.jobs, v, this.metadata);
      case 'metadata':
        return new RequestState(this.status, this.jobs, this.history, v);
    }
  };

  /**
   * Retrieve a value for a given key
   *
   * @param {string} k - The key to look up
   * @returns {*} The value bound to the given key
   */
  this.get = function (k) {
    return this[k];
  };

  Object.freeze(this);
}

module.exports = RequestState;
