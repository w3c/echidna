'use strict';

var exec = require('child_process').exec;
var Map = require('immutable').Map;
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

var Orchestrator = function (url, token, tempLoc, httpLoc, resultLoc) {
  this.url = url;
  this.token = token;
  this.tempLocation = tempLoc;
  this.httpLocation = httpLoc;
  this.resultLocation = resultLoc;
};

Orchestrator.prototype.runStep = function (step) {
  return function (state) {
    return step.then(function (obj) {
      state.jobs[obj.get('name')].status = obj.get('status');

      if (obj.has('errors')) {
        state.jobs[obj.get('name')].errors = obj.get('errors');
      }
      if (obj.has('history')) {
        state.history = state.history.add(obj.get('history'));
      }
      if (obj.has('metadata')) state.metadata = obj.get('metadata');

      return state;
    });
  };
};

Orchestrator.prototype.runDocumentDownloader = function (url, tempLocation) {
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

Orchestrator.prototype.finishTasks = function (thisVersion) {
  exec(
    global.SENDMAIL + ' SUCCESS ' + global.MAILING_LIST + ' ' + thisVersion,
    function (err, stdout, stderr) {
      if (err) console.error(stderr);
    }
  );

  return new Map({
    status: STATUS_SUCCESS,
    history: 'The document has been published at ' +
      '<a href="' + thisVersion + '">' + thisVersion + '</a>.'
  });
};

/**
 * @param iter : A => Promise[A]
 * @param cond : A => Boolean
 * @param handler : A => Unit
 * @param seed : A
 * @returns Promise[A]
 */
Orchestrator.prototype.iterate = function (iter, cond, handler, seed) {
  var self = this;
  if (cond(seed)) {
    return Promise.resolve(seed);
  }
  else {
    return iter(seed).then(function (seed) {
      handler(seed);
      return self.iterate(iter, cond, handler, seed);
    });
  }
};

Orchestrator.prototype.runStep = function (step) {
  return function (state) {
    return step.then(function (obj) {
      state.jobs[obj.get('name')].status = obj.get('status');

      if (obj.has('errors')) {
        state.jobs[obj.get('name')].errors = obj.get('errors');
      }
      if (obj.has('history')) {
        state.history = state.history.add(obj.get('history'));
      }
      if (obj.has('metadata')) state.metadata = obj.get('metadata');

      return state;
    })
    .catch(function (err) {
      console.log(err.stack);

      state.status = STATUS_ERROR;
      state.history = state.history.add(
        'A system error occurred during the process.'
      );

      return state;
    });
  };
};

/**
 * @param state
 * @returns state => state
 */
Orchestrator.prototype.next = function (state) {
  if (state.jobs['retrieve-resources'].status === '') {
    state.jobs['retrieve-resources'].status = 'pending';
    return Promise.resolve(state);
  }
  else if (state.jobs['retrieve-resources'].status === 'pending') {
    return this.runStep(
      this.runDocumentDownloader(this.url, this.tempLocation)
    )(state);
  }
  else if (state.jobs['specberus'].status === '') {
    state.jobs['specberus'].status = 'pending';
    return Promise.resolve(state);
  }
  else if (state.jobs['specberus'].status === 'pending') {
    return this.runStep(this.runSpecberus(this.httpLocation))(state);
  }
  else if (state.jobs['token-checker'].status === '') {
    state.jobs['token-checker'].status = 'pending';
    return Promise.resolve(state);
  }
  else if (state.jobs['token-checker'].status === 'pending') {
    return this.runStep(this.runTokenChecker(
      state.metadata.get('latestVersion'), this.url, this.token)
    )(state);
  }
  else if (state.jobs['third-party-checker'].status === '') {
    state.jobs['third-party-checker'].status = 'pending';
    return Promise.resolve(state);
  }
  else if (state.jobs['third-party-checker'].status === 'pending') {
    return this.runStep(this.runThirdPartyChecker(this.httpLocation))(state);
  }
  else if (state.jobs['publish'].status === '') {
    state.jobs['publish'].status = 'pending';
    return Promise.resolve(state);
  }
  else if (state.jobs['publish'].status === 'pending') {
    return this.runStep(this.runPublisher(state.metadata))(state);
  }
  else if (state.jobs['tr-install'].status === '') {
    state.jobs['tr-install'].status = 'pending';
    return Promise.resolve(state);
  }
  else if (state.jobs['tr-install'].status === 'pending') {
    return this.runStep(
      this.runTrInstaller(state.metadata.get('thisVersion'), state.tempLocation)
    )(state);
  }
  else if (state.jobs['update-tr-shortlink'].status === '') {
    state.jobs['update-tr-shortlink'].status = 'pending';
    return Promise.resolve(state);
  }
  else if (state.jobs['update-tr-shortlink'].status === 'pending') {
    return this.runStep(
      this.runShortlink(state.metadata.get('thisVersion'))
    )(state);
  }
  else return this.runStep(
    this.finishTasks(this.metadata.get('thisVersion'), this.resultLocation)
  )(state);
};

module.exports = Orchestrator;
