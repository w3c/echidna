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

var DocumentDownloader = require('./lib/document-downloader');
var History = require('./lib/history');
var JsonHttpService = require('./lib/json-http-service');
var Publisher = require('./lib/publisher');
var SpecberusWrapper = require('./functions.js').SpecberusWrapper;
var ThirdPartyResourcesChecker = require('./lib/third-party-resources-checker');
var TokenChecker = require('./functions.js').TokenChecker;

// Configuration file
require('./config.js');

// Pseudo-constants:
var STATUS_STARTED = 'started';
var STATUS_ERROR = 'error';
var STATUS_SUCCESS = 'success';

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

function trInstaller(source, dest) {
  return new Promise(function (resolve, reject) {
    var cmd = global.TR_INSTALL_CMD + ' ' + source + ' ' + dest;
    exec(cmd, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function updateTrShortlink(uri) {
  return new Promise(function (resolve, reject) {
    var cmd = global.UPDATE_TR_SHORTLINK_CMD + ' ' + uri;
    exec(cmd, function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
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

  var W3C_PREFIX = 'http://www.w3.org';

  var tempLocation = argTempLocation + path.sep + spec.id + path.sep;
  var resultLocation = argResultLocation + path.sep + spec.id + '.json';
  var httpLocation = argHttpLocation + '/' + spec.id + '/Overview.html';

  function runDocumentDownloader(url, tempLocation) {
    return function (state) {
      state.jobs['retrieve-resources'].status = 'pending';

      return DocumentDownloader.fetchAndInstall(url, tempLocation)
        .then(function () {
          state.jobs['retrieve-resources'].status = 'ok';
          state.history = state.history.add('The file has been retrieved.');

          return state;
        }).catch(function (error) {
          state.jobs['retrieve-resources'].status = 'error';
          state.jobs['retrieve-resources'].errors.push(error.toString());
          state.history = state.history.add(
            'The document could not be retrieved.'
          );

          return state;
        });
    };
  }

  function runSpecberus(httpLocation) {
    return function (state) {
      state.jobs['specberus'].status = 'pending';

      return SpecberusWrapper.validate(httpLocation)
        .then(function (report) {
          if (report.errors.isEmpty()) {
            state.jobs['specberus'].status = 'ok';
            state.history = state.history.add('The document passed specberus.');
            state.metadata = report.metadata;
          }
          else {
            state.jobs['specberus'].status = 'failure';
            state.jobs['specberus'].errors = report.errors;
            state.history = state.history.add('The document failed Specberus.');
          }

          return state;
        }).catch(function (error) {
          state.jobs['specberus'].status = 'error';
          state.jobs['specberus'].errors.push(error.toString());
          state.history = state.history.add(
            'An error occurred while running Specberus.'
          );

          return state;
        });
    };
  }

  function runTokenChecker(latestVersion, url) {
    return function (state) {
      state.jobs['token-checker'].status = 'pending';

      return TokenChecker.check(latestVersion, token)
        .then(function (authReport) {
          var simpleSource1 = authReport.source.replace(/^https:/i, 'http:');
          var simpleSource2 = authReport.source.replace(/^http:/i, 'https:');
          var matchSource = (
            url.indexOf(simpleSource1) === 0 ||
            url.indexOf(simpleSource2) === 0
          );

          if (authReport.authorized && matchSource) {
            state.jobs['token-checker'].status = 'ok';
            state.history = state.history.add('You are authorized to publish');

            return state;
          }
          else {
            state.jobs['token-checker'].status = 'failure';
            state.jobs['token-checker'].errors.push('Not authorized');
            state.history = state.history.add(
              'You are not authorized to publish'
            );

            return state;
          }
        }).catch(function (error) {
          state.jobs['token-checker'].status = 'error';
          state.jobs['token-checker'].errors.push(error.toString());
          state.history = state.history.add(
            'An error occurred while running the Token Checker.'
          );

          return state;
        });
    };
  }

  function runThirdPartyResourcesChecker(httpLocation) {
    return function (state) {
      state.jobs['third-party-checker'].status = 'pending';

      return ThirdPartyResourcesChecker.check(httpLocation)
        .then(function (extResources) {
          if (extResources.length === 0) {
            state.jobs['third-party-checker'].status = 'ok';
            state.history = state.history.add(
              'The document passed the third party checker.'
            );

            return state;
          }
          else {
            state.history = state.history.add(
              'The document contains non-authorized resources'
            );
            state.jobs['third-party-checker'].status = 'failure';
            state.jobs['third-party-checker'].errors = extResources;

            return state;
          }
        }).catch(function (error) {
          state.jobs['third-party-checker'].status = 'error';
          state.jobs['third-party-checker'].errors.push(error.toString());
          state.history = state.history.add(
            'An error occurred while running the Third Party Resources Checker.'
          );

          return state;
        });
    };
  }

  function runPublisher(metadata) {
    return function (state) {
      state.jobs['publish'].status = 'pending';

      var pubsystemService = new JsonHttpService(
        global.W3C_PUBSYSTEM_URL,
        global.USERNAME,
        global.PASSWORD
      );

      return new Publisher(pubsystemService).publish(metadata)
        .then(function (errors) {
          if (errors.isEmpty()) {
            state.jobs['publish'].status = 'ok';

            return state;
          }
          else {
            state.jobs['publish'].status = 'failure';
            state.jobs['publish'].errors = errors;
            state.history = state.history.add(
              'The document could not be published: ' +
              errors.map(function (error) {
                return error.message;
              })
            );

            return state;
          }
        }).catch(function (error) {
          state.jobs['publish'].status = 'error';
          state.jobs['publish'].errors.push(error.toString());
          state.history = state.history.add(
            'The document could not be published: ' +
            error.message
          );

          return state;
        });
    };
  }

  function runTrInstaller(thisVersion, tempLocation) {
    return function (state) {
      state.jobs['tr-install'].status = 'pending';

      var finalTRpath = thisVersion.replace(W3C_PREFIX, '');

      return trInstaller(tempLocation, finalTRpath)
        .then(function () {
          state.jobs['tr-install'].status = 'ok';

          return state;
        }).catch(function (error) {
          state.jobs['tr-install'].status = 'error';
          state.jobs['tr-install'].errors.push(error.toString());
          state.history = state.history.add(
            'An error occurred while installing the document in TR'
          );

          return state;
        });
    };
  }

  function runShortlink(thisVersion) {
    return function (state) {
      state.jobs['update-tr-shortlink'].status = 'pending';

      return updateTrShortlink(thisVersion)
        .then(function () {
          state.jobs['update-tr-shortlink'].status = 'ok';

          return state;
        }).catch(function (error) {
          state.jobs['update-tr-shortlink'].status = 'error';
          state.jobs['update-tr-shortlink'].errors.push(error.toString());
          state.history = state.history.add(
            'An error occurred while updating the shortlink.'
          );

          return state;
        });
    };
  }

  function finishTasks(thisVersion, resultLocation) {
    return function (state) {
      var cmd =
        global.SENDMAIL + ' SUCCESS ' + global.MAILING_LIST + ' ' + thisVersion;

      exec(cmd, function (err, stdout, stderr) {
        if (err) console.error(stderr);
      });

      state.history = state.history.add(
        'The document has been published at ' +
        '<a href="' + thisVersion + '">' + thisVersion + '</a>.'
      );
      state.status = STATUS_SUCCESS;

      dumpJobResult(resultLocation, state);

      return state;
    };
  }

  return runDocumentDownloader(spec.url, tempLocation)(spec)
    .then(runSpecberus(httpLocation))
    .then(function (state) {
      var metadata = state.metadata;

      return runTokenChecker(metadata.get('latestVersion'), spec.url)(state)
        .then(runThirdPartyResourcesChecker(httpLocation))
        .then(runPublisher(metadata))
        .then(runTrInstaller(metadata.get('thisVersion'), tempLocation))
        .then(runShortlink(metadata.get('thisVersion')))
        .then(finishTasks(metadata.get('thisVersion'), resultLocation))
        .catch(function (err) {
          console.log(err.stack);

          spec.status = STATUS_ERROR;
          var cmd =
            global.SENDMAIL + ' ERROR ' + global.MAILING_LIST + ' ' +
            spec.url + ' \'' + JSON.stringify(spec, null, 2) + '\'';

          exec(cmd, function (err, stdout, stderr) {
            if (err) console.error(stderr);
          });

          spec.history = spec.history.add(
            'A system error occurred during the process.'
          );

          dumpJobResult(resultLocation, spec);
          return Promise.reject(new Error('Orchestrator has failed.'));
        });
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
