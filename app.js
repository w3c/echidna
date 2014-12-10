
'use strict';

console.log('Launching…');

var Promise = require('promise');
var Immutable = require('immutable');

var meta = require('./package.json')
,   express = require('express')
,   ejs = require('ejs')
,   spawn = require('child_process').spawn
,   app = express()
,   port = 3000
,   requests = {}
,   DocumentDownloader = require("./functions.js").DocumentDownloader
;

app.use(express.compress());
app.use(express.bodyParser({}));

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
      res.send(500, { error: 'Request of URL ' + url + ' does not exist.' });
    }
  }
  else {
    res.json({ 'requests': requests });
  }
});

app.post('/api/request', function(req, res) {
  var url = req.body ? req.body.url : null
  ,   decision = req.body ? req.body.decision : null
  ;
  if (!url || !decision) {
    res.send(500, {error: 'Missing parameters {url, decision}.'});
  }
  else {
    if (requests[url]) {
      res.send('Spec at ' + url + ' is yet pending validation OR has been already submitted. Check “/api/status”.');
    }
    else {
      requests[url] = {
        'url': url,
        'decision': decision,
        'jobs': {},
        'history': new History()
      };
      orchestrate(requests[url]).then(function () {
        console.log('Spec at ' + url + ' (decision: ' + decision + ') has FINISHED.');
      }, function (err) {
        console.log('Spec at ' + url + ' (decision: ' + decision + ') has FAILED.');
      });
      res.send(200, 'Spec at ' + url + ' (decision: ' + decision + ') added to the queue.');
    }
  }
});

function retrieve(from, to) {
  return new Promise(function (resolve, reject) {
    var job = spawn('stubs/retrieve-resources.sh', [from]);

    job.on('exit', function (innerCode, innerSignal) {
      if (innerCode === 0) {
        resolve();
      }
      else {
        reject(new Error("retrieve-resources step failed with code " + innerCode));
      }
    });
  });
}

function specberus(url, profile) {
  return new Promise(function (resolve, reject) {
    var job = spawn('stubs/specberus.sh', [url]);

    job.on('exit', function (innerCode, innerSignal) {
      if (innerCode === 0) {
        resolve();
      }
      else {
        reject(new Error("specberus step failed with code " + innerCode));
      }
    });
  });
}

function thirdPartyChecker(url) {
  return new Promise(function (resolve, reject) {
    var job = spawn('stubs/third-party-checker.sh', [url]);

    job.on('exit', function (innerCode, innerSignal) {
      if (innerCode === 0) {
        resolve();
      }
      else {
        reject(new Error("third-party-checker step failed with code " + innerCode));
      }
    });
  });
}

function parseMetadata(url) {
  return new Promise(function (resolve, reject) {
    var job = spawn('stubs/parse-metadata.sh', [url]);

    job.on('exit', function (innerCode, innerSignal) {
      if (innerCode === 0) {
        var metadata = {};
        resolve();
      }
      else {
        reject(new Error("parse-metadata step failed with code " + innerCode));
      }
    });
  });
}

function publish(url) {
  return new Promise(function (resolve, reject) {
    var job = spawn('stubs/publish.sh', [url]);

    job.on('exit', function (innerCode, innerSignal) {
      if (innerCode === 0) {
        resolve();
      }
      else {
        reject(new Error("publish step failed with code " + innerCode));
      }
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

function orchestrate(spec) {
  spec.jobs['retrieve-resources'] = new Job();
  spec.jobs['specberus'] = new Job();
  spec.jobs['third-party-checker'] = new Job();
  spec.jobs['parse-metadata'] = new Job();
  spec.jobs['publish'] = new Job();

  spec.jobs['retrieve-resources'].status = 'pending';

  var tempLocation = '/tmp/' + new Date() + '/';
  var finalLocation = 'bar';

  return new DocumentDownloader().fetchAndInstall(spec.url, tempLocation, false).then(
    function () {
      spec.jobs['retrieve-resources'].status = 'ok';
      spec.history = spec.history.add('The file has been retrieved.');

      spec.jobs['specberus'].status = 'pending';
      return specberus(tempLocation, 'WD').then(
        function () {
          spec.jobs['specberus'].status = 'ok';
          spec.history = spec.history.add('The document passed specberus.');

          spec.jobs['third-party-checker'].status = 'pending';
          return thirdPartyChecker(tempLocation).then(
            function () {
              spec.jobs['third-party-checker'].status = 'ok';
              spec.history = spec.history.add('The document passed the third party checker.');

              spec.jobs['parse-metadata'].status = 'pending';
              return parseMetadata(tempLocation).then(
                function (metadata) {
                  spec.jobs['parse-metadata'].status = 'ok';

                  spec.jobs['publish'].status = 'pending';
                  return publish(tempLocation, finalLocation).then(
                    function () {
                      spec.jobs['publish'].status = 'ok';
                      spec.history = spec.history.add('The document has been published at <a href="' + finalLocation + '">' + finalLocation + '</a>.');
                      return Promise.resolve("finished");
                    },
                    function (err) {
                      spec.jobs['publish'].status = 'failure';
                      spec.jobs['publish'].errors.push(err.toString());
                      return Promise.reject(err);
                    }
                  );
                },
                function (err) {
                  spec.jobs['parse-metadata'].status = 'failure';
                  spec.jobs['parse-metadata'].errors.push(err.toString());
                  return Promise.reject(err);
                }
              );
            }, function (err) {
              spec.history = spec.history.add('The document failed the third-party-checker.');
              spec.jobs['third-party-checker'].status = 'failure';
              spec.jobs['third-party-checker'].errors.push(err.toString());
              return Promise.reject(err);
            }
          );
        },
        function (err) {
          spec.history = spec.history.add('The document failed specberus.');
          spec.jobs['specberus'].status = 'failure';
          spec.jobs['specberus'].errors.push(err.toString());
          return Promise.reject(err);
        }
      );
    },
    function (err) {
      spec.history = spec.history.add('The document could not be retrieved.');
      spec.jobs['retrieve-resources'].status = 'failure';
      spec.jobs['retrieve-resources'].errors.push(err.toString());
      return Promise.reject(err);
    }
  ).catch(function (err) {
    return Promise.reject(new Error('Orchestrator has failed.'));
  });
}

app.listen(process.env.PORT || port);

console.log(meta.name +
  ' version ' + meta.version +
  ' running on ' + process.platform +
  ' and listening on port ' + port +
  '. The server time is ' + new Date().toLocaleTimeString() + '.');
