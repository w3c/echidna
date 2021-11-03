/**
 * @module
 * @file Configurate API endpoints and view pages.
 */

'use strict';

const express = require('express');
const compression = require('compression');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const Fs = require('fs');
const { Map } = require('immutable');
const { v4: uuidv4 } = require('uuid');

const passport = require('passport');
const LdapAuth = require('ldapauth-fork');
const { BasicStrategy } = require('passport-http');
const Job = require('./lib/job');
const Orchestrator = require('./lib/orchestrator');
const RequestState = require('./lib/request-state');
const SpecberusWrapper = require('./lib/specberus-wrapper');
const mailer = require('./lib/mailer');

const meta = require('./package.json');

// Configuration file
const config = process.env.CONFIG || 'config.js';
// eslint-disable-next-line import/no-dynamic-require
require(`./${config}`);
// eslint-disable-next-line no-console
console.log(`Loading config: ${config}`);

const app = express();
const requests = {};
const port = process.argv[4] || global.DEFAULT_PORT;
const argTempLocation = process.argv[2] || global.DEFAULT_TEMP_LOCATION;
const argHttpLocation = process.argv[3] || global.DEFAULT_HTTP_LOCATION;
const argResultLocation = process.argv[5] || global.DEFAULT_RESULT_LOCATION;

/**
 * Add CORS headers to responses if the client is explicitly allowed.
 *
 * First, this ensures that the testbed page on the test server, listening on a different port, can GET and POST to Echidna.
 * Most importantly, this is necessary to attend publication requests from third parties, eg GitHub.
 */

function corsHandler(req, res, next) {
  if (req && req.headers && req.headers.origin) {
    if (global.ALLOWED_CLIENTS.some(regex => regex.test(req.headers.origin))) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Methods', 'GET,POST');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
    }
  }
  next();
}

app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(corsHandler);
app.use(express.static('assets/'));
app.set('json spaces', 2);
app.set('trust proxy', true);

// Index Page
app.get('/', (request, response) => {
  response.sendFile(`${__dirname}/views/index.html`);
});

// New UI
app.get('/ui', (request, response) => {
  response.sendFile(`${__dirname}/views/web-interface.html`);
});

// API methods

app.get('/api/version', (req, res) => {
  res.send(meta.version);
});

app.get('/api/version-specberus', (req, res) => {
  res.send(SpecberusWrapper.version);
});

app.get('/api/status', (req, res) => {
  const id = req.query ? req.query.id : null;
  const file = `${argResultLocation + path.sep + id}.json`;

  if (id) {
    Fs.access(file, Fs.constants.F_OK, error => {
      if (!error) res.status(200).sendFile(file);
      else if (requests && requests[id]) res.status(200).json(requests[id]);
      else res.status(404).send(`No job found with ID “${id}”.`);
    });
  } else res.status(400).send('Missing required parameter “ID”.');
});

function dumpJobResult(dest, result) {
  Fs.writeFile(dest, `${JSON.stringify(result, null, 2)}\n`, err => {
    // eslint-disable-next-line no-console
    if (err) console.error(err);
  });
}

/**
 * @function processRequest
 * @description **Handler of user request.** Distinguish if the request contains a tar file or a link to manifest.
 * @param {Object} req
 * @param {Object} res
 * @param {Boolean} isTar whether request contains a tar file
 */
const processRequest = (req, res, isTar) => {
  const id = uuidv4();
  const decision = req.body ? req.body.decision : null;
  const url = !isTar && req.body ? req.body.url : null;
  const token = req.body ? req.body.token : null;
  const tar = isTar ? req.file : null;
  const { user } = req;
  const dryRun = Boolean(
    req.body && req.body['dry-run'] && /^true$/i.test(req.body['dry-run']),
  );
  const ccEmail = req.body ? req.body.cc : null;

  if (!(url || tar) || !decision) {
    res
      .status(400) // Bad Request
      .send(
        'Missing parameters. The valid combination of parameters are "url + token + decision",' +
          ' "tar + token + decision" or "tar + W3C credentials + decision".',
      );
  } else if (tar && !user && (url || tar) && !token) {
    // If the submitting the tar without W3C credentials, or submitting the tar or URL without token
    res
      .status(401) // Unauthorized
      .send(
        'Unauthorized request, missing "token" or "W3C credentials" in the parameters. The valid combination of parameters are "url + token + decision", "tar + token + decision" or "tar + W3C credentials + decision".',
      );
  } else {
    const tempLocation = `${argTempLocation}/${id}/`;
    const httpLocation = `${argHttpLocation}/${id}/Overview.html`;

    requests[id] = {};
    requests[id].id = id;
    if (req.body && req.body.annotation)
      requests[id].annotation = req.body.annotation;
    if (isTar) requests[id].tar = tar.originalname;
    else requests[id].url = url;
    requests[id].version = meta.version;
    requests[id]['version-specberus'] = SpecberusWrapper.version;
    requests[id].decision = decision;
    const jobList = [
      'retrieve-resources',
      'metadata',
      'specberus',
      'transition-checker',
      'publish',
      'tr-install',
      'update-tr-shortlink',
    ];

    if (token) {
      jobList.unshift('ip-checker');
      jobList.splice(3, 0, 'token-checker');
    } else {
      // submitted with credentials
      jobList.splice(2, 0, 'user-checker');
    }

    if (dryRun) jobList.splice(jobList.indexOf('publish'));

    // create empty result placeholder in /api/status?id=xxx
    requests[id].results = new RequestState(
      '',
      new Map(
        jobList.reduce((object, value) => {
          // eslint-disable-next-line no-param-reassign
          object[value] = new Job();
          return object;
        }, {}),
      ),
    );

    // Orchestrator: jobList executed.
    const orchestrator = new Orchestrator(
      url,
      tar,
      token,
      user,
      tempLocation,
      httpLocation,
      argResultLocation,
      req.ip,
    );

    Orchestrator.iterate(
      state => orchestrator.next(state),
      Orchestrator.hasFinished,
      state => {
        requests[id].results = state;
      },
      requests[id].results,
    )
      .then(state => {
        // eslint-disable-next-line no-console
        console.log(`[${state.get('status').toUpperCase()}] ${url}`);
        dumpJobResult(
          `${argResultLocation + path.sep + id}.json`,
          requests[id],
        );
        // eslint-disable-next-line no-console
        if (dryRun) console.log('Dry-run: omitting e-mail notification');
        else {
          mailer.sendMessage(
            id,
            state,
            requests[id],
            url || tar.originalname,
            ccEmail,
          );
        }
      })
      .done();

    res.status(202).send(id);
  }
};

// Making sure the user and password match, and the user participate in the group delivering the document.
passport.use(
  new BasicStrategy((username, password, done) => {
    const opts = {
      url: global.LDAP_URL,
      bindDn: global.LDAP_BIND_DN.replace(/{{username}}/, username),
      bindCredentials: password,
      searchBase: global.LDAP_SEARCH_BASE,
      searchFilter: '(uid={{username}})',
      searchAttributes: ['memberOf'],
      cache: false,
    };

    const ldap = new LdapAuth(opts);

    ldap.authenticate(username, password, (err, user) => {
      if (err) {
        // eslint-disable-next-line no-console
        console.log('LDAP auth error: %s', err);
      }
      done(null, user);
    });
  }),
);

app.post('/api/request', (req, res, next) => {
  if (req.is('application/x-www-form-urlencoded')) {
    // URL + token method
    processRequest(req, res, false);
  } else if (req.is('multipart/form-data')) {
    // tar method
    next();
  } else {
    res.status(501).send({ status: 'Form Content-Type not supported' });
  }
});

app.post('/api/request', multer().single('tar'), (req, res, next) => {
  if (req.headers.authorization) {
    // basic authentication
    next();
  } else {
    processRequest(req, res, true); // token
  }
});

app.post(
  '/api/request',
  passport.authenticate('basic', { session: false }),
  (req, res) => {
    processRequest(req, res, true);
  },
);

app.listen(process.env.PORT || port).on('error', err => {
  if (err) {
    // eslint-disable-next-line no-console
    console.error(`Error while trying to launch the server: “${err}”.`);
  }
});

// eslint-disable-next-line no-console
console.log(
  `${meta.name} version ${meta.version} running on ${
    process.platform
  } and listening on port ${port}. The server time is ${new Date().toLocaleTimeString()}.`,
);
