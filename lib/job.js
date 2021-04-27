'use strict';

const { List } = require('immutable');

/**
 * @file A job is the state of a publication step, whether it is pending, finished or failed.
 *
 * @exports lib/job
 * @param {string} status - The state of the step execution
 * @param {List.<string>} errors - A list of errors in case the job has failed or error
 */
function Job(status, errors) {
  const job = this;
  if (typeof this !== 'object') {
    throw new TypeError('Job must be constructed via new');
  }

  this.status = status !== undefined ? status : '';
  if (typeof this.status !== 'string') {
    throw new TypeError('status must be a string');
  }

  this.errors = errors !== undefined ? errors : new List();
  if (!(this.errors instanceof List)) {
    throw new TypeError('errors must be a List');
  }

  /**
   * Returns a new job with a given keys set to a given value
   *
   * @param {string} k - The key to update
   * @param {*} v - The value to set
   * @returns {Job} The resulting job
   */
  this.set = (k, v) => {
    switch (k) {
      case 'status':
        return new Job(v, job.errors);
      case 'errors':
        return new Job(job.status, v);
      default:
    }
  };

  /**
   * Retrieve a value for a given key
   *
   * @param {string} k - The key to look up
   * @returns {*} The value bound to the given key
   */
  this.get = k => job[k];

  Object.freeze(this);
}

module.exports = Job;
