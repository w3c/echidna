 
/**
 * @file A [Specberus](https://github.com/w3c/specberus) wrapper. Validate the compliance of Technical Reports with [publication rules](https://www.w3.org/pubrules/doc).
 */

'use strict';

import Promise from 'promise';
import pkg from 'immutable';
import util from 'util';
import { EventEmitter } from 'events';

const { List, Map } = pkg;

/**
 * @exports lib/specberus-wrapper
 */

const SpecberusWrapper = {};
// import specberus and create it once.
SpecberusWrapper.getSpecberus = async () => {
  const Specberus = await import('specberus/lib/validator.js');
  return new Specberus.Specberus();
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
        type.name !== 'validation.html' ||
        (type.name === 'validation.html' && !global.SKIP_VALIDATION)
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
      } else if (profile === 'DRY') {
        specberusProfile = await import(
          `specberus/lib/profiles/TR/Registry/${profile}-Echidna.js`
        );
      } else {
        return reject(
          new Error(
            'Only WD, CR, CRD, REC with candidate amendments, DNOTE, NOTE and DRY are allowed!',
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

      if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'test') {
        const host = `http://localhost:${(process.env.PORT || 3000) + 1}`;
        options.htmlValidator = `${host}/nu`;
      }

      const s = await SpecberusWrapper.getSpecberus();
      s.validate(options);
    })();
  });

SpecberusWrapper.extractMetadata = url =>
  new Promise((resolve, reject) => {
    function Sink() {}

    util.inherits(Sink, EventEmitter);

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
      const s = new Specberus.Specberus();
      s.extractMetadata({ url, events: sink });
    })();
  });

SpecberusWrapper.version = async () => {
  const s = await SpecberusWrapper.getSpecberus();
  return s.version;
};

export default SpecberusWrapper;
