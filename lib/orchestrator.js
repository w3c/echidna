'use strict';

var exec = require('child_process').exec;
var Fs = require('fs');
var Map = require('immutable').Map;
var Path = require('path');
var Promise = require('promise');

var DocumentDownloader = require('./document-downloader');
var JsonHttpService = require('./json-http-service');
var Publisher = require('./publisher');
var SpecberusWrapper = require('../functions.js').SpecberusWrapper;
var ThirdPartyChecker = require('./third-party-resources-checker');
var TokenChecker = require('../functions.js').TokenChecker;

var STATUS_ERROR = 'error';
var STATUS_SUCCESS = 'success';

// Configuration file
require('../config.js');

var argTempLocation = process.argv[2] || global.DEFAULT_TEMP_LOCATION;
var argHttpLocation  = process.argv[3] || global.DEFAULT_HTTP_LOCATION;
var argResultLocation = process.argv[5] || global.DEFAULT_RESULT_LOCATION;

function Job() {
  if (typeof this !== 'object') {
    throw new TypeError('Job must be constructed via new');
  }

  this.status = '';
  this.errors = [];
}

function dumpJobResult(dest, result) {
  Fs.writeFile(dest, JSON.stringify(result, null, 2) + '\n', function (err) {
    if (err) return console.error(err);
  });
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

var Orchestrator = function () {};

Orchestrator.prototype.runStep = function (step) {
  return function (state) {
    return step.then(function (obj) {
      state.jobs[obj.name].status = obj.get('status');

      if (obj.has('errors')) state.jobs[obj.name].errors = obj.get('errors');
      if (obj.has('history')) {
        state.history = state.history.add(obj.get('history'));
      }
      if (obj.has('metadata')) state.metadata = obj.get('metadata');

      return state;
    });
  };
};

Orchestrator.prototype.runDocumentDownloader = function (url, tempLocation) {
  // return function (state) {
  //   if (state.jobs['retrieve-resources'].status !== 'pending') return state;
  // };

  return DocumentDownloader.fetchAndInstall(url, tempLocation)
    .then(function () {
      return new Map({
        name: 'retrieve-resources',
        status: 'ok',
        history: 'The file has been retrieved.'
      });
    }).catch(function (error) {
      return new Map({
        name: 'retrieve-resources',
        status: 'error',
        errors: error.toString(),
        history: 'The document could not be retrieved.'
      });
    });
};

Orchestrator.prototype.runSpecberus = function (httpLocation) {
  // return function (state) {
  //   if (state.jobs['specberus'].status !== 'pending') {
  //     return Promise.resolve(state);
  //   }
  // };

  return SpecberusWrapper.validate(httpLocation).then(function (report) {
    if (report.errors.isEmpty()) {
      return new Map({
        name: 'specberus',
        status: 'ok',
        history: 'The document passed specberus.',
        metadata: report.metadata
      });
    }
    else {
      return new Map({
        name: 'specberus',
        status: 'failure',
        errors: report.errors,
        history: 'The document failed Specberus.'
      });
    }
  }).catch(function (error) {
    return new Map({
      name: 'specberus',
      status: 'error',
      errors: error.toString(),
      history: 'An error occurred while running Specberus.'
    });
  });
};

Orchestrator.prototype.runTokenChecker = function (latestVersion, url, token) {
  // return function (state) {
  //   if (state.jobs['token-checker'].status !== 'pending') {
  //     return Promise.resolve(state);
  //   }
  // };

  return TokenChecker.check(latestVersion, token).then(function (authReport) {
    var simpleSource1 = authReport.source.replace(/^https:/i, 'http:');
    var simpleSource2 = authReport.source.replace(/^http:/i, 'https:');
    var matchSource = (
      url.indexOf(simpleSource1) === 0 ||
      url.indexOf(simpleSource2) === 0
    );

    if (authReport.authorized && matchSource) {
      return new Map({
        name: 'token-checker',
        status: 'ok',
        history: 'You are authorized to publish'
      });
    }
    else {
      return new Map({
        name: 'token-checker',
        status: 'failure',
        errors: 'Not authorized',
        history: 'You are not authorized to publish'
      });
    }
  }).catch(function (error) {
    return new Map({
      name: 'token-checker',
      status: 'error',
      errors: error.toString(),
      history: 'An error occurred while running the Token Checker.'
    });
  });
};

Orchestrator.prototype.runThirdPartyChecker = function (httpLocation) {
  // return function (state) {
  //   if (state.jobs['third-party-checker'].status !== 'pending') return state;
  // };

  return ThirdPartyChecker.check(httpLocation).then(function (extResources) {
    if (extResources.length === 0) {
      return new Map({
        name: 'third-party-checker',
        status: 'ok',
        history: 'The document passed the third party checker.'
      });
    }
    else {
      return new Map({
        history: 'The document contains non-authorized resources',
        name: 'third-party-checker',
        status: 'failure',
        errors: extResources
      });
    }
  }).catch(function (error) {
    return new Map({
      name: 'third-party-checker',
      status: 'error',
      errors: error.toString(),
      history:
        'An error occurred while running the Third Party Resources Checker.'
    });
  });
};

Orchestrator.prototype.runPublisher = function (metadata) {
  // return function (state) {
  //   if (state.jobs['publish'].status !== 'pending') return state;
  // };

  var pubsystemService = new JsonHttpService(
    global.W3C_PUBSYSTEM_URL,
    global.USERNAME,
    global.PASSWORD
  );

  return new Publisher(pubsystemService).publish(metadata)
    .then(function (errors) {
      if (errors.isEmpty()) {
        return new Map({
          name: 'publish',
          status: 'ok'
        });
      }
      else {
        return new Map({
          name: 'publish',
          status: 'failure',
          errors: errors,
          history: 'The document could not be published: ' +
            errors.map(function (e) { return e.message; })
        });
      }
    }).catch(function (error) {
      return new Map({
        name: 'publish',
        status: 'error',
        errors: error.toString(),
        history: 'The document could not be published: ' + error.message
      });
    });
};

Orchestrator.prototype.runTrInstaller = function (thisVersion, tempLocation) {
  // return function (state) {
  //   if (state.jobs['tr-install'].status !== 'pending') return state;
  // };

  var finalTRpath = thisVersion.replace('http://www.w3.org', '');
  return trInstaller(tempLocation, finalTRpath).then(function () {
    return new Map({
      name: 'tr-install',
      status: 'ok'
    });
  }).catch(function (error) {
    return new Map({
      name: 'tr-install',
      status: 'error',
      errors: error.toString(),
      history: 'An error occurred while installing the document in TR'
    });
  });
};

Orchestrator.prototype.runShortlink = function (thisVersion) {
  // return function (state) {
  //   if (state.jobs['update-tr-shortlink'].status !== 'pending') return state;
  // };

  return updateTrShortlink(thisVersion).then(function () {
    return new Map({
      name: 'update-tr-shortlink',
      status: 'ok'
    });
  }).catch(function (error) {
    return new Map({
      name: 'update-tr-shortlink',
      status: 'error',
      errors: error.toString(),
      history: 'An error occurred while updating the shortlink.'
    });
  });
};

Orchestrator.prototype.finishTasks = function (thisVersion) { // , resultLocation) {
  // return function (state) {
  //   var cmd =
  //     global.SENDMAIL + ' SUCCESS ' + global.MAILING_LIST + ' ' + thisVersion;

  //   exec(cmd, function (err, stdout, stderr) {
  //     if (err) console.error(stderr);
  //   });

  //   dumpJobResult(resultLocation, state);
  // };

  return new Map({
    status: STATUS_SUCCESS,
    history: 'The document has been published at ' +
      '<a href="' + thisVersion + '">' + thisVersion + '</a>.'
  });
};

Orchestrator.prototype.markStarted = function (jobName, previousJobName) {
  return function (state) {
    if (previousJobName === undefined ||
        state.jobs[previousJobName].status === 'ok') {
      state.jobs[jobName].status = 'pending';
    }
    return state;
  };
};

Orchestrator.prototype.run = function (spec, token) {
  var self = this;

  spec.jobs['retrieve-resources'] = new Job();
  spec.jobs['specberus'] = new Job();
  spec.jobs['token-checker'] = new Job();
  spec.jobs['third-party-checker'] = new Job();
  spec.jobs['publish'] = new Job();
  spec.jobs['tr-install'] = new Job();
  spec.jobs['update-tr-shortlink'] = new Job();

  var tempLocation = argTempLocation + Path.sep + spec.id + Path.sep;
  var resultLocation = argResultLocation + Path.sep + spec.id + '.json';
  var httpLocation = argHttpLocation + '/' + spec.id + '/Overview.html';

  return Promise.resolve(self.markStarted('retrieve-resources')(spec))
    .then(self.runStep(self.runDocumentDownloader(spec.url, tempLocation)))
    .then(self.markStarted('specberus', 'retrieve-resources'))
    .then(self.runStep(self.runSpecberus(httpLocation)))
    .then(function (state) {
      var metadata = state.metadata;

      if (metadata === undefined) return state;

      return Promise.resolve(
        self.markStarted('token-checker', 'specberus')(state)
      )
        .then(self.runStep(
          self.runTokenChecker(metadata.get('latestVersion'), spec.url, token)
        )).then(self.markStarted('third-party-checker', 'token-checker'))
        .then(self.runStep(self.runThirdPartyChecker(httpLocation)))
        .then(self.markStarted('publish', 'third-party-checker'))
        .then(self.runStep(self.runPublisher(metadata)))
        .then(self.markStarted('tr-install', 'publish'))
        .then(self.runStep(
          self.runTrInstaller(metadata.get('thisVersion'), tempLocation)
        )).then(self.markStarted('update-tr-shortlink', 'tr-install'))
        .then(self.runStep(self.runShortlink(metadata.get('thisVersion'))))
        .then(function (state) {
          self.runStep(
            self.finishTasks(metadata.get('thisVersion'), resultLocation)
          );

          dumpJobResult(resultLocation, state);
        });
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
};

module.exports = Orchestrator;
