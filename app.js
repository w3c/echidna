/**
 * @module
 */

'use strict';

console.log('Launching…');

var exec = require('child_process').exec;
var meta = require('./package.json');
var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var multer = require('multer');
var path = require('path');
var Fs = require('fs');
var Map = require('immutable').Map;
var Uuid = require('node-uuid');

var Job = require('./lib/job');
var Orchestrator = require('./lib/orchestrator');
var RequestState = require('./lib/request-state');
var SpecberusWrapper = require('./lib/specberus-wrapper');

var passport = require('passport');
var LdapAuth = require('ldapauth-fork');
var BasicStrategy = require('passport-http').BasicStrategy;

// Configuration file
require('./config.js');

var app = express();
var requests = {};
var port = process.argv[4] || global.DEFAULT_PORT;
var argTempLocation = process.argv[2] || global.DEFAULT_TEMP_LOCATION;
var argHttpLocation = process.argv[3] || global.DEFAULT_HTTP_LOCATION;
var argResultLocation = process.argv[5] || global.DEFAULT_RESULT_LOCATION;

app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(corsHandler);
app.use(express.static('assets/'));

// Index Page
app.get('/', function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

// API methods

app.get('/api/version', function (req, res) {
  res.send(meta.version);
});

app.get('/api/version-specberus', function (req, res) {
  res.send(SpecberusWrapper.version);
});

app.get('/api/status', function (req, res) {
  var id = req.query ? req.query.id : null;
  var file = argResultLocation + path.sep + id + '.json';

  if (id) {
    Fs.exists(file, function (exists) {
      if (exists) res.status(200).sendFile(file);
      else if (requests && requests[id]) {
        res.status(200).json(requests[id]);
      }
      else res.status(404).send('No job found with ID “' + id + '”.');
    });
  }
  else res.status(400).send('Missing required parameter “ID”.');
});

function dumpJobResult(dest, result) {
  Fs.writeFile(dest, JSON.stringify(result, null, 2) + '\n', function (err) {
    if (err) return console.error(err);
  });
}

var processRequest = function (req, res, isTar) {
  var id = Uuid.v4();
  var decision = req.body ? req.body.decision : null;
  var url = (!isTar && req.body) ? req.body.url : null;
  var token = (!isTar && req.body) ? req.body.token : null;
  var tar = (isTar) ? req.file : null;

  if (!((url && token) || tar) || !decision) {
    res.status(500).send(
      'Missing required parameters "url + token + decision"' +
      ' or "tar + decision".'
    );
  }
  else {
    var tempLocation = argTempLocation + path.sep + id + path.sep;
    var httpLocation = argHttpLocation + '/' + id + '/Overview.html';

    requests[id] = {};
    requests[id]['id'] = id;
    if (isTar) requests[id]['tar'] = tar.originalname;
    else requests[id]['url'] = url;
    requests[id]['version'] = meta.version;
    requests[id]['version-specberus'] = SpecberusWrapper.version;
    requests[id]['decision'] = decision;
    var jobList;

    if (isTar) {
      jobList = ['retrieve-resources', 'metadata', 'specberus',
                 'third-party-checker', 'publish', 'tr-install',
                 'update-tr-shortlink'];
    }
    else {
      jobList = ['retrieve-resources', 'specberus', 'token-checker',
                 'third-party-checker', 'publish', 'tr-install',
                 'update-tr-shortlink'];
    }

    requests[id]['results'] = new RequestState(
                  '',
                  new Map(jobList.reduce(function (o, v) {
                    o[v] = new Job();
                    return o;
                  }, {}))
                );

    var orchestrator = new Orchestrator(
      url,
      tar,
      token,
      tempLocation,
      httpLocation,
      argResultLocation
    );

    Orchestrator.iterate(
      function (state) {
        return orchestrator.next(state);
      },
      Orchestrator.hasFinished,
      function (state) {
        requests[id].results = state;
        console.log(JSON.parse(JSON.stringify(requests[id])));
        console.log('----------');
      },
      requests[id].results
    ).then(function (state) {
      var cmd = global.SENDMAIL + ' ' + state.get('status').toUpperCase() +
        ' ' + global.MAILING_LIST;

      if (state.get('status') === Orchestrator.STATUS_ERROR ||
          state.get('status') === Orchestrator.STATUS_FAILURE) {
        cmd += ' ' + url + ' \'' + JSON.stringify(requests[id], null, 2) + '\'';
      }
      else {
        cmd += ' ' + state.get('metadata').get('thisVersion') +
          ' \'Echidna ' + meta.version +
          '; Specberus ' + SpecberusWrapper.version + '\'';
      }

      console.log('[' + state.get('status').toUpperCase() + '] ' + url);
      exec(cmd, function (err, _, stderr) { if (err) console.error(stderr); });
      dumpJobResult(argResultLocation + path.sep + id + '.json', requests[id]);
    }).done();

    res.status(202).send(id);
  }
};

passport.use(new BasicStrategy(
  function (username, password, done) {
    var opts = {
      url: global.LDAP_URL,
      bindDn: global.LDAP_BIND_DN.replace(/{{username}}/, username),
      bindCredentials: password,
      searchBase: global.LDAP_SEARCH_BASE,
      searchFilter: '(uid={{username}})',
      searchAttributes: ['memberOf'],
      cache: false
    };

    var ldap = new LdapAuth(opts);

    ldap.authenticate(username, password, function (err, user) {
      if (err) {
        console.log('LDAP auth error: %s', err);
      }
      done(err, user);
    });
  }
));

app.post('/api/request', function (req, res, next) {
  if (req.is('application/x-www-form-urlencoded')) {
    processRequest(req, res, false);
  }
  else if (req.is('multipart/form-data')) {
    next();
  }
  else {
    res.status(501)
       .send({ status: 'Form Content-Type not supported' });
  }
});

app.post('/api/request',
         passport.authenticate('basic', { session: false }),
         multer().single('tar'),
         function (req, res) {
           // TODO: Check that req.user is in the deliverers of the spec
          //  res.status(501)
          //     .send({ status: 'feature locked until we can easily identify' +
          //                     ' the deliverers of the spec' });
           processRequest(req, res, true);
         }
);

/**
* Add CORS headers to responses if the client is explicitly allowed.
*
* First, this ensures that the testbed page on the test server, listening on a different port, can GET and POST to Echidna.
* Most importantly, this is necessary to attend publication requests from third parties, eg GitHub.
*/

function corsHandler(req, res, next) {
  if (req && req.headers && req.headers.origin) {
    if (global.ALLOWED_CLIENTS.some(function (regex) {
      return regex.test(req.headers.origin);
    })) {
      res.header('Access-Control-Allow-Origin', req.headers.origin);
      res.header('Access-Control-Allow-Methods', 'GET,POST');
      res.header('Access-Control-Allow-Headers', 'Content-Type');
    }
  }
  next();
}

app.listen(process.env.PORT || port).on('error', function (err) {
  if (err) {
    console.error('Error while trying to launch the server: “' + err + '”.');
  }
});

console.log(
  meta.name +
  ' version ' + meta.version +
  ' running on ' + process.platform +
  ' and listening on port ' + port +
  '. The server time is ' + new Date().toLocaleTimeString() + '.'
);
