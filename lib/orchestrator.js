'use strict';

var exec = require('child_process').exec;
var List = require('immutable').List;
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

/**
 * @param iter : A => List[A, Promise[A]]
 * @param cond : A => Boolean
 * @param handler : A => Unit
 * @param seed : A
 * @returns Promise[A]
 */
Orchestrator.prototype.iterate = function (iter, cond, handler, seed) {
  var self = this;
  if (cond(seed)) return Promise.resolve(seed);
  else {
    var seeds = iter(seed);
    handler(seeds.get(0));
    return seeds.get(1).then(function (newSeed) {
      handler(newSeed);
      return self.iterate(iter, cond, handler, newSeed);
    });
  }
};

// @param step
// @returns state => Map[String, *]
Orchestrator.prototype.runStep = function (step) {
  return function (state) {
    state.jobs[step.get('name')].status = 'pending';
    return List.of(state, step.get('promise').then(function (obj) {
      state.jobs[step.get('name')].status = obj.get('status');

      if (obj.has('errors')) {
        state.jobs[step.get('name')].errors = obj.get('errors');
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
    }));
  };
};

// @returns Map[String, Promise[Map[String, *]]]
Orchestrator.prototype.runDocumentDownloader = function (url, tempLocation) {
  return new Map({
    name: 'retrieve-resources',
    promise: DocumentDownloader.fetchAndInstall(url, tempLocation)
      .then(function () {
        return new Map({
          status: 'ok',
          history: 'The file has been retrieved.'
        });
      }).catch(function (error) {
        return new Map({
          status: 'error',
          errors: error.toString(),
          history: 'The document could not be retrieved.'
        });
      })
  });
};

Orchestrator.prototype.runSpecberus = function (httpLocation) {
  return new Map({
    name: 'specberus',
    promise: SpecberusWrapper.validate(httpLocation).then(function (report) {
      if (report.errors.isEmpty()) {
        return new Map({
          status: 'ok',
          history: 'The document passed specberus.',
          metadata: report.metadata
        });
      }
      else {
        return new Map({
          status: 'failure',
          errors: report.errors.toJS(),
          history: 'The document failed Specberus.'
        });
      }
    }).catch(function (error) {
      return new Map({
        status: 'error',
        errors: error.toString(),
        history: 'An error occurred while running Specberus.'
      });
    })
  });
};

Orchestrator.prototype.runTokenChecker = function (latestVersion, url, token) {
  return new Map({
    name: 'token-checker',
    promise: TokenChecker.check(latestVersion, token)
      .then(function (authReport) {
        var simpleSource1 = authReport.source.replace(/^https:/i, 'http:');
        var simpleSource2 = authReport.source.replace(/^http:/i, 'https:');
        var matchSource = (
          url.indexOf(simpleSource1) === 0 ||
          url.indexOf(simpleSource2) === 0
        );

        if (authReport.authorized && matchSource) {
          return new Map({
            status: 'ok',
            history: 'You are authorized to publish'
          });
        }
        else {
          return new Map({
            status: 'failure',
            errors: 'Not authorized',
            history: 'You are not authorized to publish'
          });
        }
      }).catch(function (error) {
        return new Map({
          status: 'error',
          errors: error.toString(),
          history: 'An error occurred while running the Token Checker.'
        });
      })
  });
};

Orchestrator.prototype.runThirdPartyChecker = function (httpLocation) {
  return new Map({
    name: 'third-party-checker',
    promise: ThirdPartyChecker.check(httpLocation)
      .then(function (extResources) {
        if (extResources.length === 0) {
          return new Map({
            status: 'ok',
            history: 'The document passed the third party checker.'
          });
        }
        else {
          return new Map({
            history: 'The document contains non-authorized resources',
            status: 'failure',
            errors: extResources
          });
        }
      }).catch(function (error) {
        return new Map({
          status: 'error',
          errors: error.toString(),
          history:
            'An error occurred while running the Third Party Resources Checker.'
        });
      })
  });
};

Orchestrator.prototype.runPublisher = function (metadata) {
  var pubsystemService = new JsonHttpService(
    global.W3C_PUBSYSTEM_URL,
    global.USERNAME,
    global.PASSWORD
  );

  return new Map({
    name: 'publish',
    promise: new Publisher(pubsystemService).publish(metadata)
      .then(function (errors) {
        if (errors.isEmpty()) {
          return new Map({
            status: 'ok'
          });
        }
        else {
          return new Map({
            status: 'failure',
            errors: errors,
            history: 'The document could not be published: ' +
              errors.map(function (e) { return e.message; })
          });
        }
      }).catch(function (error) {
        return new Map({
          status: 'error',
          errors: error.toString(),
          history: 'The document could not be published: ' + error.message
        });
      })
  });
};

Orchestrator.prototype.runTrInstaller = function (thisVersion, tempLocation) {
  var finalTRpath = thisVersion.replace('http://www.w3.org', '');
  return new Map({
    name: 'tr-install',
    promise: trInstaller(tempLocation, finalTRpath).then(function () {
      return new Map({ status: 'ok' });
    }).catch(function (error) {
      return new Map({
        status: 'error',
        errors: error.toString(),
        history: 'An error occurred while installing the document in TR'
      });
    })
  });
};

Orchestrator.prototype.runShortlink = function (thisVersion) {
  return new Map({
    name: 'update-tr-shortlink',
    promise: updateTrShortlink(thisVersion).then(function () {
      return new Map({ status: 'ok' });
    }).catch(function (error) {
      return new Map({
        status: 'error',
        errors: error.toString(),
        history: 'An error occurred while updating the shortlink.'
      });
    })
  });
};

/**
 * @param state
 * @returns state => List[state, Promise[state]]
 */
Orchestrator.prototype.next = function (state) {
  if (state.jobs['retrieve-resources'].status === '') {
    return this.runStep(
      this.runDocumentDownloader(this.url, this.tempLocation)
    )(state);
  }
  else if (state.jobs['specberus'].status === '') {
    return this.runStep(this.runSpecberus(this.httpLocation))(state);
  }
  else if (state.jobs['token-checker'].status === '') {
    return this.runStep(this.runTokenChecker(
      state.metadata.get('latestVersion'), this.url, this.token)
    )(state);
  }
  else if (state.jobs['third-party-checker'].status === '') {
    return this.runStep(this.runThirdPartyChecker(this.httpLocation))(state);
  }
  else if (state.jobs['publish'].status === '') {
    return this.runStep(this.runPublisher(state.metadata))(state);
  }
  else if (state.jobs['tr-install'].status === '') {
    return this.runStep(
      this.runTrInstaller(state.metadata.get('thisVersion'), state.tempLocation)
    )(state);
  }
  else if (state.jobs['update-tr-shortlink'].status === '') {
    return this.runStep(
      this.runShortlink(state.metadata.get('thisVersion'))
    )(state);
  }
  else {
    state.status = STATUS_SUCCESS;
    state.history = 'The document has been published at ' +
        '<a href="' + this.thisVersion + '">' + this.thisVersion + '</a>.';

    return List.of(state, Promise.resolve(state));
  }
};

module.exports = Orchestrator;
