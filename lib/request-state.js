/**
 * @file A Request State is an immutable state corresponding to a request processing or processed by the system. Used for jobs, history, metadata update.
 */
'use strict';

var Map = require('immutable').Map;
var History = require('./history');

/**
 * A Request State is an immutable state corresponding to a request processing or processed by the system.
 *
 * @exports lib/request-state
 * @param {string} status - The current status of the request
 * @param {Map.<string, Job>} jobs - A map of all the jobs related to this request
 * @param {History} history - A human-readable history for this request
 * @param {Map.<string, *>} metadata - The metadata extracted by Specberus for this request
 */
function RequestState(status, jobs, history, metadata) {
  if (typeof this !== 'object') {
    throw new TypeError('RequestState must be constructed via new');
  }

  this.status = (status !== undefined ? status : '');
  if (typeof this.status !== 'string') {
    throw new TypeError('status must be a string');
  }

  this.jobs = (jobs !== undefined ? jobs : new Map());
  if (!(this.jobs instanceof Map)) {
    throw new TypeError('jobs must be a Map');
  }

  this.history = (history !== undefined ? history : new History());
  if (!(this.history instanceof History)) {
    throw new TypeError('history must be a History');
  }

  this.metadata = (metadata !== undefined ? metadata : new Map());
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
      default: return this;
    }
  };

  /**
   * Retrieves a value for a given key
   *
   * @param {string} k - The key to look up
   * @returns {*} The value bound to the given key
   */
  this.get = function (k) {
    return this[k];
  };

  /**
   * Adds a fact to the history of the state and returns the new augmented state.
   *
   * @param {string} fact - The human-readable string to add to the history
   * @returns {RequestState} The new state with updated history
   */
  this.addToHistory = function (fact) {
    return this.set('history', this.get('history').add(fact));
  };

  /**
   * Adds a metadata to the state and returns the new augmented state.
   *
   * @param {string} key
   * @param {string} value
   * @returns {RequestState} The new state with updated metadata
   */
  this.addToMetadata = function (key, value) {
    return this.set('metadata', this.get('metadata').set(key, value));
  };

  /**
   * Checks if a specific job has started.
   * Whether the job is in progress, was successful or has failed does not matter here.
   *
   * @param {string} jobName - The name of the job to check
   * @returns {Boolean} Whether or not the job has started
   */
  this.hasJobStarted = function (jobName) {
    if (!this.get('jobs').has(jobName)) return false;
    else return this.get('jobs').get(jobName).get('status') === '';
  };

  /**
   * Sets the status of a specific job and returns the new augmented state.
   *
   * @param {string} jobName - The job to update
   * @param {string} status - The new status for this job
   * @returns {RequestState} The new state with updated job
   */
  this.setJobStatus = function (jobName, status) {
    if (!this.get('jobs').has(jobName)) return this;
    else return this.set(
      'jobs',
      this.get('jobs').set(
        jobName,
        this.get('jobs').get(jobName).set('status', status)
      )
    );
  };

  /**
   * Sets the errors of a specific job and returns the new augmented state.
   *
   * @param {string} jobName - The job to update
   * @param {List.<string>} errors - The errors for this job
   * @returns {RequestState} The new state with updated job
   */
  this.setJobErrors = function (jobName, errors) {
    if (!this.get('jobs').has(jobName)) return this;
    else return this.set(
      'jobs',
      this.get('jobs').set(
        jobName,
        this.get('jobs').get(jobName).set('errors', errors)
      )
    );
  };

  Object.freeze(this);
}

module.exports = RequestState;
