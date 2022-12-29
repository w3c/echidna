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
let SpecberusCached;
// import specberus and create it once.
SpecberusWrapper.getSpecberus = async () => {
  if (SpecberusCached) return SpecberusCached;

  const Specberus = await import('specberus/lib/validator.js');
  SpecberusCached = new Specberus.Specberus(process.env.W3C_API_KEY);
  return SpecberusCached;
};

SpecberusWrapper.validate = (url, stateMetadata) =>
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
      const profile = stateMetadata.get('profile');
      const patentPolicy = stateMetadata.get('patentPolicy');
      if (
        ['WD', 'CR', 'CRD'].includes(profile) ||
        (profile === 'REC' && stateMetadata.get('recCandidateAmendments'))
      ) {
        specberusProfile = await import(
          `specberus/lib/profiles/TR/Recommendation/${profile}-Echidna.js`
        );
      } else if (['NOTE', 'DNOTE'].includes(profile)) {
        specberusProfile = await import(
          `specberus/lib/profiles/TR/Note/${profile}-Echidna.js`
        );
      } else {
        return reject(
          new Error(
            'Only WD, CR, CRD, REC with candidate amendments, DNOTE and NOTE are allowed!',
          ),
        );
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

      const s = await SpecberusWrapper.getSpecberus();
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

SpecberusWrapper.version = async () => {
  const s = await SpecberusWrapper.getSpecberus();
  return s.version;
};

module.exports = SpecberusWrapper;
