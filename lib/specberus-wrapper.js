/* eslint-disable global-require */
/**
 * @file A [Specberus](https://github.com/w3c/specberus) wrapper. Validate the compliance of Technical Reports with [publication rules](https://www.w3.org/pubrules/doc).
 */

'use strict';

const Promise = require('promise');
const { List } = require('immutable');
const { Map } = require('immutable');
const { Specberus } = require('specberus/lib/validator');
const util = require('util');
const { EventEmitter } = require('events');

const config = process.env.CONFIG || 'config.js';
// eslint-disable-next-line import/no-dynamic-require
require(`../${config}`);

/**
 * @exports lib/specberus-wrapper
 */

const SpecberusWrapper = {};

SpecberusWrapper.validate = (url, profile, patentPolicy) =>
  new Promise((resolve, reject) => {
    function Sink() {}

    util.inherits(Sink, EventEmitter);

    const sink = new Sink();
    let errors = new List();
    let metadata = new Map();
    let specberusProfile;

    if (profile === 'WD') {
      specberusProfile = require('specberus/lib/profiles/TR/Recommendation/WD-Echidna');
    } else if (profile === 'NOTE') {
      specberusProfile = require('specberus/lib/profiles/TR/Note/NOTE-Echidna');
    } else if (profile === 'DNOTE') {
      specberusProfile = require('specberus/lib/profiles/TR/Note/DNOTE-Echidna');
    } else if (profile === 'CR') {
      specberusProfile = require('specberus/lib/profiles/TR/Recommendation/CR-Echidna');
    } else if (profile === 'CRD') {
      specberusProfile = require('specberus/lib/profiles/TR/Recommendation/CRD-Echidna');
    } else {
      return reject(new Error('Only WD, CR, CRD and Notes are allowed!'));
    }

    sink.on('end-all', () => {
      resolve({ errors, metadata });
    });

    sink.on('metadata', (key, value) => {
      metadata = metadata.set(key, value);
    });

    sink.on('err', (type, errData) => {
      const data = errData;
      data.type = type;
      if (
        !['validation.html', 'validation.css'].includes(type.name) ||
        !global.SKIP_VALIDATION
      ) {
        errors = errors.push(data);
      }
    });

    sink.on('exception', exception => {
      reject(new Error(exception.message));
    });

    const pp =
      patentPolicy === 'https://www.w3.org/Consortium/Patent-Policy-20170801/'
        ? 'pp2004'
        : 'pp2020';
    const options = {
      url,
      profile: specberusProfile,
      events: sink,
      validation: 'simple-validation',
      informativeOnly: false,
      patentPolicy: pp,
    };

    if (process.env.NODE_ENV === 'dev') {
      const host = `http://localhost:${(process.env.PORT || 3000) + 1}`;

      options.cssValidator = `${host}/css-validator/validator`;
      options.htmlValidator = `${host}/check`;
    }

    new Specberus(process.env.W3C_API_KEY).validate(options);
  });

SpecberusWrapper.extractMetadata = url =>
  new Promise((resolve, reject) => {
    function Sink() {}

    require('util').inherits(Sink, require('events').EventEmitter);

    const sink = new Sink();
    const s = new Specberus();
    let errors = new List();

    sink.on('err', (type, data) => {
      errors = errors.push(data);
    });

    sink.on('end-all', data => {
      resolve(data.metadata);
    });

    sink.on('exception', exception => {
      reject(new Error(exception.message));
    });

    s.extractMetadata({ url, events: sink });
  });

SpecberusWrapper.version = new Specberus(process.env.W3C_API_KEY).version;

module.exports = SpecberusWrapper;
