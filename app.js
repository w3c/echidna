'use strict';

console.log('Launching…');

var meta = require('./package.json');
var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var exec = require('child_process').exec;
var path = require('path');
var Fs = require('fs');
var Promise = require('promise');
var Uuid = require('node-uuid');

var History = require('./lib/history');
var Orchestrator = require('./lib/orchestrator');

// Configuration file
require('./config.js');

// Pseudo-constants:
var STATUS_STARTED = 'started';
var STATUS_ERROR = 'error';

var app = express();
var requests = {};
var argTempLocation = process.argv[2] || global.DEFAULT_TEMP_LOCATION;
var argHttpLocation  = process.argv[3] || global.DEFAULT_HTTP_LOCATION;
var port = process.argv[4] || global.DEFAULT_PORT;
var argResultLocation = process.argv[5] || global.DEFAULT_RESULT_LOCATION;

app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(corsHandler);
app.use(express.static('views'));
app.use(express.static('assets'));

if (process.env.NODE_ENV === 'production') {
  app.set('views', __dirname + '/dist/views');
  app.use(express.static(__dirname + '/dist/assets'));
}
else {
  app.set('views', __dirname + '/views');
  app.use(express.static(__dirname + '/assets'));
}

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

app.post('/api/request', function (req, res) {
  var url = req.body ? req.body.url : null;
  var decision = req.body ? req.body.decision : null;
  var token = req.body ? req.body.token : null;
  var id = Uuid.v4();

  if (!url || !decision || !token) {
    res.status(500).send(
      'Missing required parameters “url”, “decision” and/or “token”.'
    );
  }
  else {
    requests[id] = {
      id: id,
      url: url,
      version: meta.version,
      'version-specberus': SpecberusWrapper.version,
      decision: decision,
      jobs: {},
      history: new History(),
      status: STATUS_STARTED
    };

    orchestrate(requests[id], token).then(function () {
      console.log(
        'Spec at ' + url + ' (decision: ' + decision + ') has FINISHED.'
      );
    }, function () {
      console.log(
        'Spec at ' + url + ' (decision: ' + decision + ') has FAILED.'
      );
    });
    res.status(202).send(id);
  }
});

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

function Job() {
  if (typeof this !== 'object') {
    throw new TypeError('Jobs must be constructed via new');
  }

  this.status = '';
  this.errors = [];
}

function dumpJobResult(dest, result) {
  Fs.writeFile(dest, JSON.stringify(result, null, 2) + '\n', function (err) {
    if (err) return console.error(err);
  });
}

function orchestrate(spec, token) {
  spec.jobs['retrieve-resources'] = new Job();
  spec.jobs['specberus'] = new Job();
  spec.jobs['token-checker'] = new Job();
  spec.jobs['third-party-checker'] = new Job();
  spec.jobs['publish'] = new Job();
  spec.jobs['tr-install'] = new Job();
  spec.jobs['update-tr-shortlink'] = new Job();

  var tempLocation = argTempLocation + path.sep + spec.id + path.sep;
  var resultLocation = argResultLocation + path.sep + spec.id + '.json';
  var httpLocation = argHttpLocation + '/' + spec.id + '/Overview.html';

  var o = new Orchestrator();

  return o.runDocumentDownloader(spec.url, tempLocation)(spec)
    .then(o.runSpecberus(httpLocation))
    .then(function (state) {
      var metadata = state.metadata;

      return o.runTokenChecker(
          metadata.get('latestVersion'),
          spec.url,
          token
        )(state)
        .then(o.runThirdPartyChecker(httpLocation))
        .then(o.runPublisher(metadata))
        .then(o.runTrInstaller(metadata.get('thisVersion'), tempLocation))
        .then(o.runShortlink(metadata.get('thisVersion')))
        .then(o.finishTasks(metadata.get('thisVersion'), resultLocation));
    })
    .catch(function (err) {
      console.log(err.stack);

      spec.status = STATUS_ERROR;

      var cmd =
        global.SENDMAIL + ' ERROR ' + global.MAILING_LIST + ' ' + spec.url +
        ' \'' + JSON.stringify(spec, null, 2) + '\'';

      exec(cmd, function (err, stdout, stderr) {
        if (err) console.error(stderr);
      });

      spec.history = spec.history.add(
        'A system error occurred during the process.'
      );

      dumpJobResult(resultLocation, spec);
      return Promise.reject(new Error('Orchestrator has failed.'));
    });
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
