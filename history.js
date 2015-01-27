
/**
 * History (logging) management.
 */

'use strict';

var meta = require('./package.json');
var fs = require('fs');
var path = require('path');
var Stack = require('immutable').Stack;

require('./config.js');

function appendToLog(filename, message) {

  if(filename) {
    fs.appendFile(filename,
      new Date().toISOString() + '\t' + message + '\n',
      'utf8',
      function (err) {
        if (err) {
          console.error('ERROR: can\'t write to log file.\n' + err);
        }
      }
    );
  }

}

var History = function (facts) {

  if (typeof this !== 'object') {
    throw new TypeError('Jobs must be constructed via new');
  }

  this.facts = typeof(facts) === 'undefined' ? Stack() : facts;
  this.logFilename = global.DEFAULT_LOG_LOCATION + path.sep + meta.name + '-' + meta.version + '.log';
  appendToLog(this.logFilename, '“' + meta.name + '” version “' + meta.version + '” logging here…');

};

History.prototype.add = function (fact) {

  appendToLog(this.logFilename, fact);

  return new History(this.facts.unshift({
    time: new Date(),
    fact: fact
  }));

};

// Override
History.prototype.toJSON = function () {

  return this.facts.reverse().toJSON();

};

exports.History = History;

// EOF

