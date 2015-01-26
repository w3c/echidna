
/**
 * History (logging) management.
 */

'use strict';

require('./config.js');
var Stack = require('immutable').Stack;

var History = function (facts) {
  if (typeof this !== 'object')
    throw new TypeError('Jobs must be constructed via new');
  this.facts = typeof(facts) === 'undefined' ? Stack() : facts;
};

History.prototype.add = function (fact) {

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

