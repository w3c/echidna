'use strict';

var exec = require('child_process').exec;
var Immutable = require('immutable');
var List = Immutable.List;
var Map = Immutable.Map;
var Promise = require('promise');

var DocumentDownloader = require('./document-downloader');
var JsonHttpService = require('./json-http-service');
var Publisher = require('./publisher');
var SpecberusWrapper = require('./specberus-wrapper');
var ThirdPartyChecker = require('./third-party-resources-checker');
var TokenChecker = require('./token-checker');

// Configuration file
require('../config.js');

// Pseudo-constants:
var W3_ORG_PREFIX = /^https?:\/\/(www\.)?w3c?\.org/i;

function trInstaller(source, dest) {
  return new Promise(function (resolve, reject) {
    var cmd = global.TR_INSTALL_CMD
      .replace(/\$source/g, source)
      .replace(/\$dest/g, dest);

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

  Object.freeze(this);
};

/**
 * Check if, for a given state, the orchestrator has finished is job or not
 * (success or failure).
 *
 * @param {RequestState} state - A state for a specific publication request
 * @returns {Boolean} Whether or not all jobs have finished or one has failed
 */
Orchestrator.hasFinished = function (state) {
  var status = state.get('status');

  return status === 'success' || status === 'failure' || status === 'error';
};

/**
 * Iteratively calls a function over a value until a condition is reached.
 * This function produces a list of promised values, and a handler function is run on each of these values.
 *
 * @param {T => List.<Promise.<T>>} iteration - A function to repeatedly generate a new list of T from a previous T until a condition is reached
 * @param {T => Boolean} condition - A function that returns true when the iteration must stop for a given T
 * @param {T => ()} handler - A function to handle each promise produced by `iteration` as soon as they are fulfilled
 * @param {T} t - A starting value
 * @returns {Promise.<T>} The result of the last call to `iteration` before it stops
 */
Orchestrator.iterate = function (iteration, condition, handler, t) {
  if (condition(t)) return Promise.resolve(t);
  else return iteration(t).reduce(function (sequence, promisedNewT) {
    return sequence.then(function () {
      return promisedNewT.then(function (newT) {
        handler(newT);
        return newT;
      });
    });
  }, Promise.resolve()).then(function (finalT) {
    return Orchestrator.iterate(iteration, condition, handler, finalT);
  });
};

/**
 * @param {Map.<string, *>} step
 * @returns {RequestState => List.<Promise.<RequestState>>}
 */
Orchestrator.prototype.runStep = function (step) {
  return function (state) {
    return List.of(
      Promise.resolve(state.setJobStatus(step.get('name'), 'pending')),
      step.get('promise').then(function (obj) {
        state = state.setJobStatus(step.get('name'), obj.get('status'));

        if (obj.get('status') === 'failure') {
          state = state.set('status', 'failure');
        }
        else if (obj.get('status') === 'error') {
          state = state.set('status', 'error');
        }

        if (obj.has('errors')) {
          state = state.setJobErrors(step.get('name'), obj.get('errors'));
        }
        if (obj.has('history')) state = state.addToHistory(obj.get('history'));
        if (obj.has('metadata')) {
          state = state.set('metadata', obj.get('metadata'));
        }

        return state;
      })
      .catch(function (err) {
        console.log(err.stack);

        state = state.set('status', 'error');
        state = state.addToHistory(
          'A system error occurred during the process.'
        );

        return state;
      })
    );
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
          errors: List.of(error.toString()),
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
          errors: report.errors,
          history: 'The document failed Specberus.'
        });
      }
    }).catch(function (error) {
      return new Map({
        status: 'error',
        errors: List.of(error.toString()),
        history: 'An error occurred while running Specberus.'
      });
    })
  });
};

Orchestrator.prototype.runTokenChecker = function (latestVersion, url, token) {
  return new Map({
    name: 'token-checker',
    promise: TokenChecker.check(latestVersion, token, url)
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
            history: 'You are not authorized to publish'
          });
        }
      }).catch(function (error) {
        return new Map({
          status: 'error',
          errors: List.of(error.toString()),
          history: 'An error occurred while running the Token Checker.'
        });
      })
  });
};

Orchestrator.prototype.runThirdPartyChecker = function (httpLocation) {
  return new Map({
    name: 'third-party-checker',
    promise: ThirdPartyChecker.check(httpLocation, global.RESOURCES_WHITELIST)
      .then(function (extResources) {
        if (extResources.isEmpty()) {
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
          errors: List.of(error.toString()),
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
          errors: List.of(error.toString()),
          history: 'The document could not be published: ' + error.message
        });
      })
  });
};

Orchestrator.prototype.runTrInstaller = function (thisVersion, tempLocation) {
  var finalTRpath = thisVersion.replace(W3_ORG_PREFIX, '');

  return new Map({
    name: 'tr-install',
    promise: trInstaller(tempLocation, finalTRpath).then(function () {
      return new Map({ status: 'ok' });
    }).catch(function (error) {
      return new Map({
        status: 'error',
        errors: List.of(error.toString()),
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
        errors: List.of(error.toString()),
        history: 'An error occurred while updating the shortlink.'
      });
    })
  });
};

/**
 * Run the next step of the orchestration, for a given state.
 *
 * @param {RequestState} state - A state for a specific publication request
 * @returns {List.<Promise.<RequestState>>} A list of promised states that are fulfilled at different stages of each step
 */
Orchestrator.prototype.next = function (state) {
  var step;

  if (state.hasJobStarted('retrieve-resources')) {
    state = state.set('status', 'started');
    step = this.runDocumentDownloader(this.url, this.tempLocation);
  }
  else if (state.hasJobStarted('specberus')) {
    step = this.runSpecberus(this.httpLocation);
  }
  else if (state.hasJobStarted('token-checker')) {
    step = this.runTokenChecker(
      state.get('metadata').get('latestVersion'),
      this.url,
      this.token
    );
  }
  else if (state.hasJobStarted('third-party-checker')) {
    step = this.runThirdPartyChecker(this.httpLocation);
  }
  else if (state.hasJobStarted('publish')) {
    step = this.runPublisher(state.get('metadata'));
  }
  else if (state.hasJobStarted('tr-install')) {
    step = this.runTrInstaller(
      state.get('metadata').get('thisVersion'),
      this.tempLocation
    );
  }
  else if (state.hasJobStarted('update-tr-shortlink')) {
    step = this.runShortlink(state.get('metadata').get('thisVersion'));
  }

  if (step) return this.runStep(step)(state);
  else {
    state = state.set('status', 'success');
    state = state.addToHistory(
      'The document has been published at ' +
      '<a href="' + state.get('metadata').get('thisVersion') + '">' +
        state.get('metadata').get('thisVersion') +
      '</a>.'
    );

    return List.of(Promise.resolve(state));
  }
};

module.exports = Orchestrator;
