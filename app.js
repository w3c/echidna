
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

var Promise = require('promise');

var meta = require('./package.json')
,   express = require('express')
,   ejs = require('ejs')
,   spawn = require('child_process').spawn
,   app = express()
,   port = 3000
,   requests = {}
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
    if (requests[url]) {
      res.json(requests[url]);
    }
    else {
      res.send(500, {error: 'Request of URL ' + url + ' does not exist.'});
    }
  }
  else {
    result = {'requests': {}};
    for (entry in requests) {
      result.requests[entry] = requests[entry];
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
    if (requests[url]) {
      res.send('Spec at ' + url + ' is yet pending validation OR has been already submitted. Check “/api/status”.');
    }
    else {
      requests[url] = {'decision': decision, 'stage': -1, 'jobs': {}, 'errors': []};
      orchestrate(url);
      res.send(200, 'Spec at ' + url + ' (decision: ' + decision + ') added to the queue.');
    }
  }
});

function dumpLine(data) {
  console.log(data);
}


function retrieve(url) {
  return new Promise(function (resolve, reject) {
    var job = spawn('stubs/retrieve-resources.sh', [url]);

    job.on('exit', function (innerCode, innerSignal) {
      if (innerCode === 0) {
        resolve(url);
      }
      else {
        reject("retrieve step failed.");
      }
    });
  });

}

function specberus(url) {
  return new Promise(function (resolve, reject) {
    var job = spawn('stubs/specberus.sh', [url]);

    job.on('exit', function (innerCode, innerSignal) {
      if (innerCode === 0) {
        resolve(url);
      }
      else {
        reject("specberus step failed.");
      }
    });
  });
}

function orchestrate(url) {
  var spec = requests[url];

  spec.jobs['retrieve-resources'] = {};
  spec.jobs['retrieve-resources'].status = 'pending';

  retrieve(url).then(
    function (url) {
      spec.jobs['retrieve-resources'].status = 'ok';

      spec.jobs['specberus'] = {};
      spec.jobs['specberus'].status = 'pending';
      return specberus(url);
    },
    function (err) {
      spec.jobs['retrieve-resources'].status = 'failure';
      spec.errors.push(err);
    }
  ).then(
    function (url) {
      spec.jobs['specberus'].status = 'ok';
    },
    function (err) {
      spec.jobs['specberus'].status = 'failure';
      spec.errors.push(err);
    }
  );

}


function processJob(url, code, signal) {
  var spec
  ,   job;
  if (requests[url]) {
    spec = requests[url];
    if (code && 0 !== code) {
      spec.jobs[STEPS[spec.stage]].status = 'failure';
      spec.errors.push(STEPS[spec.stage] + ' failed with code ' + code + '.');
    }
    else if (spec.stage >= -1 && spec.stage < STEPS.length - 1) {
      if (spec.stage !== -1) {
        spec.jobs[STEPS[spec.stage]].status = 'ok';
      }
      spec.stage ++;
      spec.jobs[STEPS[spec.stage]] = {};
      spec.jobs[STEPS[spec.stage]].status = 'pending';
      job = spawn(PREFIX + STEPS[spec.stage] + SUFFIX, [url]);
      /* job.stdout.on('data', dumpLine);
      job.stderr.on('data', dumpLine); */
      job.on('exit', function(innerCode, innerSignal) {
        processJob(url, innerCode, innerSignal);
      });
    }
    else if (STEPS.length - 1 === spec.stage) {
      spec.jobs[STEPS[spec.stage]].status = 'ok';
      console.log('Spec at ' + url + ' (decision: ' + spec.decision + ') has finished.');
      requests[url].time = new Date().toLocaleTimeString('en-GB');
    }
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

