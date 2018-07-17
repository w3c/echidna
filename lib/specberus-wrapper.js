'use strict';

var Promise = require('promise');
var List = require('immutable').List;
var Map = require('immutable').Map;
var Specberus = require('specberus/lib/validator').Specberus;

require('../config.js');

/**
 * @exports lib/specberus-wrapper
 */

var SpecberusWrapper = {};

SpecberusWrapper.validate = function (url, profile, isRecTrack, isEditorial) {
  return new Promise(function (resolve, reject) {
    function Sink() {}

    require('util').inherits(Sink, require('events').EventEmitter);

    var sink = new Sink();
    var errors = new List();
    var metadata = new Map();
    var specberusProfile;

    if (profile === 'WD') {
      specberusProfile = require('specberus/lib/profiles/TR/WD-Echidna');
    }
    else if (profile === 'WG-NOTE') {
      specberusProfile = require('specberus/lib/profiles/TR/WG-NOTE-Echidna');
    }
    else if (profile === 'CR') {
      specberusProfile = require('specberus/lib/profiles/TR/CR-Echidna');
    }
    else {
      return reject(new Error('Only WD, CR and Notes are allowed!'));
    }

    sink.on('end-all', function () {
      resolve({ errors: errors, metadata: metadata });
    });

    sink.on('metadata', function (key, value) {
      metadata = metadata.set(key, value);
    });

    sink.on('err', function (type, data) {
      data.type = type;
      errors = errors.push(data);
    });

    sink.on('exception', function (exception) {
      reject(new Error(exception.message));
    });

    var options = {
      url: url,
      profile: specberusProfile,
      events: sink,
      validation: 'simple-validation',
      noRecTrack: !isRecTrack,
      informativeOnly: false,
      processDocument: '2015',
      editorial: isEditorial
    };

    if (process.env.NODE_ENV === 'dev') {
      var host = 'http://localhost:' + ((process.env.PORT || 3000) + 1);

      options.cssValidator = host + '/css-validator/validator';
      options.htmlValidator = host + '/check';
    }

    new Specberus().validate(options);
  });
};

SpecberusWrapper.extractMetadata = function (url) {
  return new Promise(function (resolve, reject) {
    function Sink() {}

    require('util').inherits(Sink, require('events').EventEmitter);

    var sink = new Sink();
    var s = new Specberus();
    var errors = new List();

    sink.on('err', function (type, data) {
      errors = errors.push(data);
    });

    sink.on('end-all', function (data) {
      resolve(data.metadata);
    });

    sink.on('exception', function (exception) {
      reject(new Error(exception.message));
    });

    s.extractMetadata({ url: url, events: sink });
  });
};

SpecberusWrapper.version = new Specberus().version;

module.exports = SpecberusWrapper;
