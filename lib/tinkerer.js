/**
 * @file Tweak a document before publishing it.
 * @author Antonio Olmo Titos <antonio@w3.org>
 */

'use strict';

var FS = require('fs');
var Promise = require('promise');

/**
 * @exports lib/tinkerer
 */

var Tinkerer = {};

/**
 * Tweak the document
 * @param {String} tempLocation temporary, local path to the document.
 */

Tinkerer.tinker = function (tempLocation) {
  var change = function (resolve, reject) {
    // Tinker with the document located at "tempLoation".
    // Invoke either "reject" or "resolve", depending on the result.
    if (tempLocation) {
      FS.access(tempLocation, FS.R_OK | FS.W_OK, function (errors) {
        if (!errors) resolve();
        else reject();
      });
    }
    else reject();
  };

  var result = new Promise(change);

  return result;
};

module.exports = Tinkerer;
