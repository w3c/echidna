
'use strict';

console.log('Launching…');

// Pseudo-constants:
require('./const.js');

var Promise = require('promise');
var Immutable = require('immutable');
var Request = require('request');

var meta = require('./package.json')
,   express = require('express')
,   compression = require('compression')
,   bodyParser = require('body-parser')
,   ejs = require('ejs')
,   spawn = require('child_process').spawn
,   exec = require('child_process').exec
,   DocumentDownloader = require("./functions.js").DocumentDownloader
,   SpecberusWrapper = require("./functions.js").SpecberusWrapper
,   ThirdPartyChecker = require("./functions.js").ThirdPartyChecker
,   TokenChecker = require("./functions.js").TokenChecker
,   path = require('path')
,   app = express()
,   requests = {}
,   argTempLocation = process.argv[2] || global.DEFAULT_TEMP_LOCATION
,   argHttpLocation  = process.argv[3] || global.DEFAULT_HTTP_LOCATION
,   port = process.argv[4] || global.DEFAULT_PORT
;

app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('view engine', 'ejs');
app.engine('.html', ejs.renderFile);

if (process.env.NODE_ENV === 'production') {
  app.set('views', __dirname + '/dist/views');
  app.use(express.static(__dirname + '/dist/assets'));
} else {
  app.set('views', __dirname + '/views');
  app.use(express.static(__dirname + '/assets'));
}

// Index Page
app.get('/', function(request, response, next) {
  response.render('index.html');
});

// API methods

app.get('/api/version', function(req, res) {
  res.send(meta.name +
    ' version ' + meta.version +
    ' running on ' + process.platform +
    ' and listening on port ' + port +
    '. The server time is ' + new Date().toLocaleTimeString() + '.');
});

app.get('/api/status', function(req, res) {
  var result
  ,   url = req.query ? req.query.url : null
  ,   entry
  ;
  if (url) {
    if (requests[url]) {
      res.json({ 'request': requests[url] });
    }
    else {
      res.status(500).send({ error: 'Request of URL ' + url + ' does not exist.' });
    }
  }
  else {
    res.json({ 'requests': requests });
  }
});

app.post('/api/request', function(req, res) {
  var url = req.body ? req.body.url : null
  ,   decision = req.body ? req.body.decision : null
  ,   isManifest = req.body ? req.body.isManifest === 'true' : false
  ;
  if (!url || !decision) {
    res.status(500).send({error: 'Missing parameters {url, decision}.'});
  }
  else {
    if (requests[url]) {
      res.send('Spec at ' + url + ' is yet pending validation OR has been already submitted. Check “/api/status”.');
    }
    else {
      requests[url] = {
        'url': url,
        'decision': decision,
        'isManifest': isManifest,
        'jobs': {},
        'history': new History()
      };
      orchestrate(requests[url], isManifest).then(function () {
        console.log('Spec at ' + url + ' (decision: ' + decision + ') has FINISHED.');
      }, function (err) {
        console.log('Spec at ' + url + ' (decision: ' + decision + ') has FAILED.');
      });
      res.send('Spec at ' + url + ' (decision: ' + decision + ') added to the queue.');
    }
  }
});

function trInstaller(source, dest) {
  return new Promise(function (resolve, reject) {
    var cmd = global.TR_INSTALL_CMD + ' ' + source + ' ' + dest;
    exec(cmd, function (err, stdout, stderr) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function updateTrShortlink(uri) {
  return new Promise(function (resolve, reject) {
    var cmd = global.UPDATE_TR_SHORTLINK_CMD + ' ' + uri;
    exec(cmd, function (err, stdout, stderr) {
      if (err) reject(err);
      else resolve();
    });
  });
}

function publish(metadata) {
  return new Promise(function (resolve, reject) {
    Request.post({
      url: global.W3C_PUBSYSTEM_URL,
      form: {
        specversion: {
          uri: metadata.get('thisVersion'),
          latestVersionUri: metadata.get('latestVersion'),
          // old: [{
          //   uri: metadata.get('previousVersion'),
          //   wgid: 0, // FIXME metadata.wgId
          // }],
          date: metadata.get('docDate'),
          title: metadata.get('title'),
          // wgid: 0, // FIXME metadata.wgId
          reportEditors: metadata.get('editorIds'),
          informative: false, // FIXME Not always true
          editorDraft: metadata.get('editorsDraft'),
          processRules: metadata.get('process')
        }
      }
    }, function(/*err, httpResponse, body*/){
      // console.log(err);
      // console.log(httpResponse);
      // console.log(body);
      resolve();
    });
  });
}

function Job() {
  if (typeof this !== 'object') throw new TypeError('Jobs must be constructed via new');

  this.status = '';
  this.errors = [];
}

var History = function History (facts) {
  if (typeof this !== 'object') throw new TypeError('Jobs must be constructed via new');

  this.facts = typeof(facts) === 'undefined' ? Immutable.Stack() : facts;
};

History.prototype.add = function (fact) {
  return new History(this.facts.unshift({
    time: new Date(),
    fact: fact
  }));
};

// Override
History.prototype.toJSON = function () {
  return this.facts.reverse().toJSON();
};

function orchestrate(spec, isManifest) {
  spec.jobs['retrieve-resources'] = new Job();
  spec.jobs['token-checker'] = new Job();
  spec.jobs['specberus'] = new Job();
  spec.jobs['third-party-checker'] = new Job();
  spec.jobs['tr-install'] = new Job();
  spec.jobs['update-tr-shortlink'] = new Job();
  spec.jobs['publish'] = new Job();

  var date = new Date().getTime();
  var tempLocation = (argTempLocation || global.DEFAULT_TEMP_LOCATION) + path.sep + date + path.sep;
  var httpLocation = (argHttpLocation || global.DEFAULT_SPECBERUS_LOCATION) + '/' + date + '/Overview.html';
  var finalLocation = 'bar';
  var token; //@todo retrieve token

  spec.jobs['retrieve-resources'].status = 'pending';
  return DocumentDownloader.fetchAndInstall(spec.url, tempLocation, isManifest).then(function () {
    spec.jobs['retrieve-resources'].status = 'ok';
    spec.history = spec.history.add('The file has been retrieved.');

    spec.jobs['token-checker'].status = 'pending';
    var shortlink; //@todo retrieve shortlink
    return TokenChecker.check(shortlink, token).then(function(authReport) {
      if(authReport.authorized) {
        spec.jobs['token-checker'].status = 'ok';
        spec.history = spec.history.add('You are authorized to publish');

        spec.jobs['specberus'].status = 'pending';
        return SpecberusWrapper.validate(httpLocation).then(function (report) {
          if(report.errors.size === 0) {
            spec.jobs['specberus'].status = 'ok';
            spec.history = spec.history.add('The document passed specberus.');

            spec.jobs['third-party-checker'].status = 'pending';
            return ThirdPartyChecker.check(httpLocation).then(function (extResources) {
              if (extResources.length === 0) {
                spec.jobs['third-party-checker'].status = 'ok';
                spec.history = spec.history.add('The document passed the third party checker.');

                spec.jobs['tr-install'].status = 'pending';
                return trInstall(tempLocation, finalLocation).then(function () {
                  spec.jobs['tr-install'].status = 'ok';

                  spec.jobs['update-tr-shortlink'].status = 'pending';
                  return updateTrShortlink(report.metadata.get('thisVersion')).then(function () {
                    spec.jobs['update-tr-shortlink'].status = 'ok';

                    spec.jobs['publish'].status = 'pending';
                    return publish(report.metadata).then(function () {
                      spec.jobs['publish'].status = 'ok';
                      var cmd = global.SENDMAIL + ' ' + global.MAILING_LIST + ' ' + report.metadata.get('thisVersion');
                      exec(cmd, function (err, stdout, stderr) {
                        if (err) console.error(stderr);
                      });
                      spec.history = spec.history.add('The document has been published at <a href="' + report.metadata.get('thisVersion') + '">' + report.metadata.get('thisVersion') + '</a>.');
                      return Promise.resolve("finished");
                    }, function (err) {
                      spec.jobs['publish'].status = 'error';
                      spec.jobs['publish'].errors.push(err.toString());
                      return Promise.reject(err);
                    });
                  }, function (err) {
                    spec.jobs['update-tr-shortlink'].status = 'error';
                    spec.jobs['update-tr-shortlink'].errors.push(err.toString());
                    return Promise.reject(err);
                  });
                }, function (err) {
                  spec.jobs['tr-install'].status = 'error';
                  spec.jobs['tr-install'].errors.push(err.toString());
                  return Promise.reject(err);
                });
              }
              else {
                spec.history = spec.history.add('The document contains non-authorized resources');
                spec.jobs['third-party-checker'].status = 'failure';
                spec.jobs['third-party-checker'].errors = extResources;
                return Promise.reject(new Error("Failed Third-Party checker"));
              }
            }, function (err) {
              spec.jobs['third-party-checker'].status = 'error';
              spec.jobs['third-party-checker'].errors.push(err.toString());
              return Promise.reject(err);
            });
          }
          else {
            spec.jobs['specberus'].status = 'failure';
            spec.jobs['specberus'].errors = report.errors;
            spec.history = spec.history.add('The document failed specberus.');
            return Promise.reject(new Error("Failed Specberus"));
          }
        }, function (err) {
          spec.jobs['specberus'].status = 'error';
          spec.jobs['specberus'].errors.push(err.toString());
          return Promise.reject(err);
        });
      }
      else {
        spec.jobs['token-checker'].status = 'failure';
        spec.jobs['token-checker'].errors.push('Not authorized');
        spec.history = spec.history.add('You are not authorized to publish');
        return Promise.reject(new Error("Failed Token checker"));
      }
    }, function (err) {
      spec.jobs['token-checker'].status = 'error';
      spec.jobs['token-checker'].errors.push(err.toString());
      return Promise.reject(err);
    });
  }, function (err) {
    spec.history = spec.history.add('The document could not be retrieved.');
    spec.jobs['retrieve-resources'].status = 'error';
    spec.jobs['retrieve-resources'].errors.push(err.toString());
    return Promise.reject(err);
  }).catch(function (err) {
    spec.history = spec.history.add('A system error occurred during the process.');
    return Promise.reject(new Error('Orchestrator has failed.'));
  });
}

app.listen(process.env.PORT || port);

console.log(meta.name +
  ' version ' + meta.version +
  ' running on ' + process.platform +
  ' and listening on port ' + port +
  '. The server time is ' + new Date().toLocaleTimeString() + '.');
