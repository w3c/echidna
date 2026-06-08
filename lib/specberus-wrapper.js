/**
 * @file A [Specberus](https://github.com/w3c/specberus) wrapper. Validate the compliance of Technical Reports with [publication rules](https://www.w3.org/pubrules/doc).
 */

'use strict';

import { List } from 'immutable';

/**
 * @exports lib/specberus-wrapper
 */

const SpecberusWrapper = {};
// import specberus and create it once.
SpecberusWrapper.getSpecberus = async () => {
  const { Specberus } = await import('specberus');
  return new Specberus();
};

SpecberusWrapper.validate = async (url, stateMetadata) => {
  let errors = new List();
  let specberusProfile;

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
    throw new Error(
      'Only WD, CR, CRD, REC with candidate amendments, DNOTE, NOTE and DRY are allowed!',
    );
  }

  const options = {
    url,
    profile: specberusProfile,
  };

  if (process.env.NODE_ENV === 'dev' || process.env.NODE_ENV === 'test') {
    const host = `http://localhost:${(process.env.PORT || 3000) + 1}`;
    options.htmlValidator = `${host}/nu`;
  }

  const sr = await SpecberusWrapper.getSpecberus();
  sr.on('err', (type, errData) => {
    const data = errData;
    data.type = type;
    if (
      type.name !== 'validation.html' ||
      (type.name === 'validation.html' && !global.SKIP_VALIDATION)
    ) {
      errors = errors.push(data);
    }
  });

  return sr
    .validate(options)
    .then(({ metadata }) => ({ errors, metadata }));
};

SpecberusWrapper.extractMetadata = async url => {
  const sr = await SpecberusWrapper.getSpecberus();
  return sr
    .extractMetadata({ url })
    .then(({ metadata }) => metadata);
};

SpecberusWrapper.version = async () => {
  const sr = await SpecberusWrapper.getSpecberus();
  return sr.version;
};

export default SpecberusWrapper;
