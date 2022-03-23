/* eslint-disable node/no-unsupported-features/es-syntax */
/* eslint-disable global-require */
/**
 * @file A [Specberus](https://github.com/w3c/specberus) wrapper. Validate the compliance of Technical Reports with [publication rules](https://www.w3.org/pubrules/doc).
 */

'use strict';

const Promise = require('promise');
const { List } = require('immutable');
const { Map } = require('immutable');
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

    (async () => {
      if (profile === 'WD') {
        specberusProfile = await import(
          'specberus/lib/profiles/TR/Recommendation/WD-Echidna.js'
        );
      } else if (profile === 'NOTE') {
        specberusProfile = await import(
          'specberus/lib/profiles/TR/Note/NOTE-Echidna.js'
        );
      } else if (profile === 'DNOTE') {
        specberusProfile = await import(
          'specberus/lib/profiles/TR/Note/DNOTE-Echidna.js'
        );
      } else if (profile === 'CR') {
        specberusProfile = await import(
          'specberus/lib/profiles/TR/Recommendation/CR-Echidna.js'
        );
      } else if (profile === 'CRD') {
        specberusProfile = await import(
          'specberus/lib/profiles/TR/Recommendation/CRD-Echidna.js'
        );
      } else {
        return reject(new Error('Only WD, CR, CRD and Notes are allowed!'));
      }

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

      const Specberus = await import('specberus/lib/validator.js');
      const s = new Specberus.Specberus(process.env.W3C_API_KEY);
      s.validate(options);
    })();
  });

SpecberusWrapper.extractMetadata = url =>
  new Promise((resolve, reject) => {
    function Sink() {}

    require('util').inherits(Sink, require('events').EventEmitter);

    const sink = new Sink();
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

    (async () => {
      const Specberus = await import('specberus/lib/validator.js');
      const s = new Specberus.Specberus(process.env.W3C_API_KEY);
      s.extractMetadata({ url, events: sink });
    })();
  });

SpecberusWrapper.version = async function () {
  const Specberus = await import('specberus/lib/validator.js');
  const s = new Specberus.Specberus(process.env.W3C_API_KEY);
  return s.version;
};

module.exports = SpecberusWrapper;
