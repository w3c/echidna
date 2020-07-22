/**
 * @file History (logging) management. Called by request-state.js
 */

'use strict';

var meta = require('../package.json');
var Fs = require('fs');
var Path = require('path');
var Stack = require('immutable').Stack;

let config = process.env.CONFIG || "config.js";
require("../" + config);

// TODO Move this function out to keep the class pure
function appendToLog(filename, message) {
  console.log('history appendToLog:', message);
  if (filename) {
    Fs.appendFile(filename,
      new Date().toISOString() + '\t' + message + '\n',
      'utf8',
      function (err) {
        if (err) throw new Error('ERROR: can\'t write to log file.\n' + err);
      }
    );
  }
}

/**
 * @exports lib/history
 * @param {string} fact The human-readable string to add to the history
 */
var History = function (facts) {
  console.log('history NEW:');
  if (typeof this !== 'object') {
    throw new TypeError('History must be constructed via new');
  }

  this.facts = (facts !== undefined ? facts : new Stack());
  if (!(this.facts instanceof Stack)) {
    throw new TypeError('facts must be a Stack');
  }

  this.logFilename =
    global.DEFAULT_LOG_LOCATION + Path.sep +
    meta.name + '-' + meta.version + '.log';

  // TODO Remove side-effect below
  appendToLog(
    this.logFilename,
    '“' + meta.name + '” version “' + meta.version + '” logging here…'
  );

  Object.freeze(this);
};

/**
 * Adds a fact to the history.
 * TODO Remove logging side-effect
 * TODO Make function testable by explicitely dealing with time
 *
 * @param {string} fact - The statement to add to the history
 * @returns {History} The new augmented history
 */
History.prototype.add = function (fact) {
  appendToLog(this.logFilename, fact);
  return new History(this.facts.unshift({ time: new Date(), fact: fact }));
};

// Override
History.prototype.toJSON = function () {
  return this.facts.reverse().toJSON();
};

module.exports = History;
