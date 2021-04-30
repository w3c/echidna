/**
 * @file History (logging) management. Called by request-state.js
 */

'use strict';

const Fs = require('fs');
const Path = require('path');
const { Stack } = require('immutable');
const meta = require('../package.json');

const config = process.env.CONFIG || 'config.js';
// eslint-disable-next-line import/no-dynamic-require
require(`../${config}`);

// TODO Move this function out to keep the class pure
function appendToLog(filename, message) {
  if (filename) {
    Fs.appendFile(
      filename,
      `${new Date().toISOString()}\t${message}\n`,
      'utf8',
      err => {
        if (err) throw new Error(`ERROR: can't write to log file.\n${err}`);
      },
    );
  }
}

/**
 * @exports lib/history
 * @param {string} fact The human-readable string to add to the history
 */
function History(facts) {
  if (typeof this !== 'object') {
    throw new TypeError('History must be constructed via new');
  }

  this.facts = facts !== undefined ? facts : new Stack();
  if (!(this.facts instanceof Stack)) {
    throw new TypeError('facts must be a Stack');
  }

  this.logFilename = `${global.DEFAULT_LOG_LOCATION + Path.sep + meta.name}-${
    meta.version
  }.log`;

  // TODO Remove side-effect below
  appendToLog(
    this.logFilename,
    `“${meta.name}” version “${meta.version}” logging here…`,
  );

  Object.freeze(this);
}

History.prototype = {
  /**
   * Adds a fact to the history.
   * TODO Remove logging side-effect
   * TODO Make function testable by explicitely dealing with time
   *
   * @param {string} fact - The statement to add to the history
   * @returns {History} The new augmented history
   */
  add(fact) {
    appendToLog(this.logFilename, fact);
    return new History(this.facts.unshift({ time: new Date(), fact }));
  },

  // Override
  toJSON() {
    return this.facts.reverse().toJSON();
  },
};

module.exports = History;
