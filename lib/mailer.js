/**
 * @file Send e-mail notification about a publication job. Called by app.js after Orchestrator has initiated the jobs.
 */
/* eslint-disable no-console */

'use strict';

const fs = require('fs');
const nodemailer = require('nodemailer');
const meta = require('../package.json');
const Orchestrator = require('./orchestrator');
const SpecberusWrapper = require('./specberus-wrapper');

const mailTemplatesDir = `${__dirname}/../assets/mail-templates/`;
const fields = [
  'TITLE',
  'SHORTNAME',
  'TYPE',
  'URL',
  'DESTINATION',
  'ID',
  'TIMESTAMP',
  'ECHIDNA',
  'SPECBERUS',
  'SOURCE',
  'ENCODEDSOURCE',
  'ERRORS',
];
const pubrulesInstance = 'https://www.w3.org/pubrules/doc/rules/?profile=';

let templateTextFailure;
let templateTextSuccess;

const transporter = nodemailer.createTransport({
  sendmail: true,
  newline: 'unix',
  path: '/usr/sbin/sendmail',
});

const formatErrors = (s, profile) => {
  let result = '  👎 Unspecified error\n';

  if (s) {
    result = '';

    if (s.history && s.history.facts) {
      const sortedFacts = s.history.facts.toArray().sort((a, b) => {
        if (a.time < b.time) return -1;
        if (b.time < a.time) return 1;
        return 0;
      });

      result = sortedFacts.reduce(
        (tempResult, h) => `${tempResult}    ${h.fact}\n`,
        result,
      );
    }

    if (s.jobs) {
      s.jobs.forEach(job => {
        console.log(JSON.stringify(job, null, 2));
        if (
          Orchestrator.STATUS_FAILURE === job.get('status') ||
          Orchestrator.STATUS_ERROR === job.get('status')
        )
          if (job.errors)
            job.errors.forEach(e => {
              if (typeof e === 'string') result += `  👎 ${e}\n`;
              else if (typeof e === 'object') {
                if (e.extra && e.extra.message)
                  result += `  👎 ${e.extra.message}\n`;
                else if (e.key) result += `  👎 Error code “${e.key}”.\n`;
                if (e.type && e.type.rule && profile)
                  result += `      ⮡ cf ${pubrulesInstance}${profile}#${e.type.rule}\n`;
              }
            });
      });
    }
  }

  return result;
};

const extractFields = (s, json) => {
  const R = s ? s.results : null;
  const M = R ? R.get('metadata') : null;
  const regex = /.*\/([^/]+)\/$/;
  let shortname;
  if (M) {
    if (M.get('thisVersion') && regex.test(M.get('thisVersion'))) {
      [, shortname] = M.get('thisVersion').match(regex);
    } else {
      shortname = '[unknown]';
    }
  } else {
    shortname = '[unknown]';
  }

  let source;
  if (s) {
    if (s.url) source = s.url;
    else if (s.tar) source = `“${s.tar}”`;
    else source = 'a spec';
  }

  const encodeSource = encodeURIComponent(source);
  return {
    TITLE: M ? M.get('title') : '[unknown]',
    SHORTNAME: shortname,
    TYPE: M ? M.get('profile') : '[unknown]',
    URL: s ? s.url : '[unknown]',
    DESTINATION: M ? M.get('thisVersion') : '[unknown]',
    ID: s ? s.id : '[unknown]',
    TIMESTAMP: new Date().toLocaleString(),
    ECHIDNA: s ? s.version : meta.version,
    SPECBERUS: s ? s['version-specberus'] : SpecberusWrapper.version,
    SOURCE: source,
    ENCODEDSOURCE: encodeSource,
    ERRORS: formatErrors(json, s.results ? M.get('profile') : null),
  };
};

const interpolateTemplate = (t, v) => {
  let result = t;

  console.log(`interpolate before: ${t}`);

  fields.every(f => {
    result = result.replace(new RegExp(`@${f}`, 'gi'), v[f]);
    return true;
  });

  console.log(`interpolate after: ${result}`);
  return result;
};

const prepareTemplates = () => {
  fs.readFile(`${mailTemplatesDir}failure.txt`, (err1, txtFailure) => {
    if (err1)
      throw new Error(
        `Cannot read plain-text mail template for failures: “${err1}”`,
      );
    else
      fs.readFile(`${mailTemplatesDir}success.txt`, (err2, txtSuccess) => {
        if (err2)
          throw new Error(
            `Cannot read plain-text mail template for successes: “${err2}”`,
          );
        else {
          templateTextFailure = String(txtFailure);
          templateTextSuccess = String(txtSuccess);
        }
      });
  });
};

const composeSubject = (success, state, url) => {
  let result = '[Echidna] ';

  if (success)
    result += `✔️ Success: ${state.get('metadata').get('thisVersion')}`;
  else result += `✗ Failure: ${url}`;

  return result;
};

const composeTextBody = (success, state, json) => {
  let result;

  if (success) result = templateTextSuccess;
  else result = templateTextFailure;

  result = interpolateTemplate(result, extractFields(json, state));

  return result;
};

/**
 * Send e-mail notification about a publication job.
 *
 * @param id - job ID.
 * @param state - orchestrator state.
 * @param json - JSON data about the request.
 * @param url - URL (or TAR filename) that was to be published.
 */

const sendMessage = (id, state, json, url, ccEmail) => {
  const success = Orchestrator.STATUS_SUCCESS === state.get('status');
  // https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input/email#Basic_validation
  const re =
    /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/i;
  let additionalEmails = ',';
  if (ccEmail)
    additionalEmails += ccEmail
      .split(/[\s,;\t\n]+/)
      .filter(e => re.test(e))
      .join(',');

  const message = {
    from: global.MAIL_SENDER,
    to: global.MAILING_LIST + additionalEmails,
    subject: composeSubject(success, state, url),
    text: composeTextBody(success, state, json),
    replyTo: global.MAIL_REPLYTO,
  };

  if (global.ATTACH_JSON) {
    message.text = message.text.replace(
      '@ATTACHMENT',
      ' (and in the file attached)',
    );
    message.attachments = [
      {
        filename: `${id}.json`,
        content: json,
      },
    ];
  } else message.text = message.text.replace('@ATTACHMENT', '');

  transporter.sendMail(message, (error, info) => {
    if (error) return console.log(error);
    console.log(`Message ${info.messageId} sent: ${info.response}`);
  });
};

prepareTemplates();

module.exports.sendMessage = sendMessage;
