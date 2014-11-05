
'use strict';

console.log('Launching…');

// Pseudo-constants:
var PREFIX = 'stubs/'
,   SUFFIX = '.sh'
,   STEPS = [
      'retrieve-resources'
    , 'third-party-checker'
    , 'specberus'
    , 'link-checker'
    , 'parse-metadata'
    , 'publish'
    ]
;

var meta = require('./package.json')
,   express = require('express')
,   ejs = require('ejs')
,   spawn = require('child_process').spawn
,   app = express()
,   port = 3000
,   pending = {}
,   processed = {}
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
  ,   url = req.body ? req.body.url : null
  ,   entry
  ;
  if (url) {
    if (processed[url]) {
      res.json(processed[url]);
    }
    else if (pending[url]) {
      res.json(pending[url]);
    }
    else {
      res.send(500, {error: 'Request of URL ' + url + ' does not exist.'});
    }
  }
  else {
    result = {'processed': {}, 'pending': {}};
    for (entry in processed) {
      result.processed[entry] = processed[entry];
    }
    for (entry in pending) {
      result.pending[entry] = pending[entry];
    }
    res.json(result);
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
    if (pending[url]) {
      res.send('Spec at ' + url + ' is yet pending validation.');
    }
    else if (processed[url]) {
      res.send('Spec at ' + url + ' has been already submitted. Check “/api/status”.');
    }
    else {
      pending[url] = {'decision': decision, 'stage': -1, 'status': 'queued', 'errors': []};
      processJob(url);
      res.send(200, 'Spec at ' + url + ' (decision: ' + decision + ') added to the queue.');
    }
  }
});

function dumpLine(data) {
  console.log(data);
}

function processJob(url, code, signal) {
  var spec
  ,   job;
  if (pending[url]) {
    spec = pending[url];
    if (code && 0 !== code) {
      spec.errors.push(STEPS[spec.stage] + ' failed with code ' + code + '.');
    }
    if (spec.stage >= -1 && spec.stage < STEPS.length - 1) {
      spec.stage ++;
      spec.status = STEPS[spec.stage];
      job = spawn(PREFIX + STEPS[spec.stage] + SUFFIX, [url]);
      /* job.stdout.on('data', dumpLine);
      job.stderr.on('data', dumpLine); */
      job.on('exit', function(innerCode, innerSignal) {
        processJob(url, innerCode, innerSignal);
      });
    }
    else if (STEPS.length - 1 === spec.stage) {
      console.log('Spec at ' + url + ' (decision: ' + spec.decision + ') has finished.');
      processed[url] = {'decision': spec.decision, 'time': new Date().toLocaleTimeString('en-GB'), 'errors': spec.errors};
      delete(pending[url]);
    }
  }
  else if (processed[url]) {
    console.error('Spec at "' + url + '" has finished processing already.');
  }
  else {
    console.error('Cannot find spec at "' + url + '".');
  }
}

app.listen(process.env.PORT || port);

console.log(meta.name +
  ' version ' + meta.version +
  ' running on ' + process.platform +
  ' and listening on port ' + port +
  '. The server time is ' + new Date().toLocaleTimeString() + '.');

// EOF

