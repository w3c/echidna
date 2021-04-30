/**
 * @file A Request State is an immutable state corresponding to a request processing or processed by the system. Used for jobs, history, metadata update.
 */

'use strict';

const { Map } = require('immutable');
const History = require('./history');

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
  const me = this;
  if (typeof this !== 'object') {
    throw new TypeError('RequestState must be constructed via new');
  }

  this.status = status !== undefined ? status : '';
  if (typeof this.status !== 'string') {
    throw new TypeError('status must be a string');
  }

  this.jobs = jobs !== undefined ? jobs : new Map();
  if (!(this.jobs instanceof Map)) {
    throw new TypeError('jobs must be a Map');
  }

  this.history = history !== undefined ? history : new History();
  if (!(this.history instanceof History)) {
    throw new TypeError('history must be a History');
  }

  this.metadata = metadata !== undefined ? metadata : new Map();
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
  this.set = (k, v) => {
    switch (k) {
      case 'status':
        return new RequestState(v, me.jobs, me.history, me.metadata);
      case 'jobs':
        return new RequestState(me.status, v, me.history, me.metadata);
      case 'history':
        return new RequestState(me.status, me.jobs, v, me.metadata);
      case 'metadata':
        return new RequestState(me.status, me.jobs, me.history, v);
      default:
        return this;
    }
  };

  /**
   * Retrieves a value for a given key
   *
   * @param {string} k - The key to look up
   * @returns {*} The value bound to the given key
   */
  this.get = k => me[k];

  /**
   * Adds a fact to the history of the state and returns the new augmented state.
   *
   * @param {string} fact - The human-readable string to add to the history
   * @returns {RequestState} The new state with updated history
   */
  this.addToHistory = fact => me.set('history', me.get('history').add(fact));

  /**
   * Adds a metadata to the state and returns the new augmented state.
   *
   * @param {string} key
   * @param {string} value
   * @returns {RequestState} The new state with updated metadata
   */
  this.addToMetadata = (key, value) =>
    me.set('metadata', me.get('metadata').set(key, value));

  /**
   * Checks if a specific job has started.
   * Whether the job is in progress, was successful or has failed does not matter here.
   *
   * @param {string} jobName - The name of the job to check
   * @returns {Boolean} Whether or not the job has started
   */
  this.hasJobStarted = jobName => {
    if (!me.get('jobs').has(jobName)) return false;
    return me.get('jobs').get(jobName).get('status') === '';
  };

  /**
   * Sets the status of a specific job and returns the new augmented state.
   *
   * @param {string} jobName - The job to update
   * @param {string} newStatus - The new status for this job
   * @returns {RequestState} The new state with updated job
   */
  this.setJobStatus = (jobName, newStatus) => {
    if (!me.get('jobs').has(jobName)) return me;
    return me.set(
      'jobs',
      me
        .get('jobs')
        .set(jobName, me.get('jobs').get(jobName).set('status', newStatus)),
    );
  };

  /**
   * Sets the errors of a specific job and returns the new augmented state.
   *
   * @param {string} jobName - The job to update
   * @param {List.<string>} errors - The errors for this job
   * @returns {RequestState} The new state with updated job
   */
  this.setJobErrors = (jobName, errors) => {
    if (!me.get('jobs').has(jobName)) return me;
    return me.set(
      'jobs',
      me
        .get('jobs')
        .set(jobName, me.get('jobs').get(jobName).set('errors', errors)),
    );
  };

  Object.freeze(this);
}

module.exports = RequestState;
