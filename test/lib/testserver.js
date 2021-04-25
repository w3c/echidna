'use strict';

const fs = require('fs');
const express = require('express');

const app = express();
const morgan = require('morgan');
const request = require('request');
const ldap = require('ldapjs');
const cssvalidator = require('./cssvalidator');
const htmlvalidator = require('./htmlvalidator');
const tokenChecker = require('./tokenchecker');
const htmlTemplate = require('./htmltemplate');
const { getMetadata } = require('./utils');
const { draftsSystemPath } = require('./utils');

const PublishService = require('./fake-http-services').CreatedService;

let port = (parseInt(process.env.PORT) || 3000) + 1;
const ldapPort = 1389;
require('../../config-dev.js');

/**
 * @exports test/lib/TestServer
 */

const TestServer = function () {};

app.use(
  morgan('dev', {
    stream: fs.createWriteStream('/tmp/echidna-testserver.log', { flags: 'w' }),
  }),
);

app.use(cssvalidator);
app.use(htmlvalidator);
app.use(tokenChecker);

// Setup the templating before using express static
app.use(htmlTemplate('/drafts', draftsSystemPath));
app.use('/drafts', express.static(draftsSystemPath));
app.use(express.static('assets/'));
app.use(express.static('test/views/'));
app.use(express.static('test/staging/'));

app.get('/data/specs.json', (req, res) => {
  const specs = [];
  let metadata;
  const listing = fs.readdirSync(draftsSystemPath);

  for (let i = 0; i < listing.length; ++i) {
    metadata = getMetadata(listing[i]);
    if (metadata) specs.push({ id: listing[i], metadata });
    else
      throw new Error(
        `Spec “${listing[i]}” does not have associated metadata!`,
      );
  }

  res.send({ specs });
});

app.get('/robots', (req, res) => {
  res.send('<!doctype html><p>Those are not the robots you are looking for.');
});

app.get('/elvis', (req, res) => {
  res.send('<!doctype html><p>Elvis is alive.');
});

// Pseudo-endpoint for spec generator
app.get('/generate', (req, res) => {
  const type = (req.query.type || '').toLowerCase();
  const { url } = req.query;

  if (!url || !type) {
    return res.status(500).json({
      error: 'Both `type` and `url` are required.',
    });
  }
  if (type !== 'test') {
    return res.status(500).json({ error: `Unknown type \`${type}\`` });
  }

  request(url, (err, response, body) => {
    res.send(body.replace('<title>', '<title>Spec-generated '));
  });
});

app.post('/publish', (_, res) => {
  new PublishService()
    .post()
    .then(out => res.status(out.response.statusCode).json(out.body));
});

let server;
const ldapServer = ldap.createServer();

ldapServer.bind('uid=foo,ou=user,dc=example,dc=org', (req, res, next) => {
  if (req.credentials !== global.LDAP_PASSWORD) {
    return next(new ldap.InvalidCredentialsError());
  }
  console.log(`bind DN: ${req.dn.toString()}`);
  console.log(`bind PW: ${req.credentials}`);
  res.end();
  return next();
});

ldapServer.search(global.LDAP_SEARCH_BASE, (req, res, next) => {
  const obj = {
    dn: `uid=${global.LDAP_USER},${req.dn.toString()}`,
    attributes: {
      uid: global.LDAP_USER,
      objectclass: ['top', 'person'],
      o: 'example',
      memberOf: global.LDAP_GROUPS,
    },
  };

  if (req.filter.matches(obj.attributes)) res.send(obj);

  res.end();
  return next();
});

TestServer.start = function () {
  const limitPort = port + 30;

  do {
    server = app.listen(port).on('error', err => {
      // Only when there's an error because the port is already in use,
      // we simply continue trying.
      if (err.code !== 'EADDRINUSE') {
        throw new Error(`Error while trying to launch the test server: ${err}`);
      }
    });
    port += 1;
  } while (server.address() === null && port < limitPort);

  if (server.address() === null) {
    throw new Error(`Cannot find a free port for the test server ${port}`);
  }

  ldapServer.listen(ldapPort, 'localhost', () => {
    console.log(`LDAP server listening at ${ldapServer.url}`);
  });

  console.log(`Token checker ready at ${this.location()} /authorize`);
  console.log(`Spec generator ready at ${this.location()} /generate`);
  console.log(`Publication backend ready at ${this.location()} /publish`);
};

TestServer.location = function () {
  if (server && server.address()) {
    return `http://localhost:${server.address().port}`;
  }
};

// This will return metadata associate with a draft
TestServer.getMetadata = function (name) {
  const data = getMetadata(name);

  if (data.location === undefined) {
    data.location = `${this.location()}/drafts/${name}/`;
  }
  return data;
};

TestServer.close = () => {
  server.close();
  ldapServer.close();
};

TestServer.start();

module.exports = TestServer;
