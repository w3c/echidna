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
 * Check if, for a given state, the orchestrator has finished is job or not
 * (success or failure).
 *
 * @param {Object} state - A state for a specific publication request
 * @returns {Boolean} Whether or not all jobs have finished or one has failed
 */
Orchestrator.hasFinished = function (state) {
  return state.status !== 'started';
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
 * @param {Promise.<Map.<string, *>>} step
 * @returns {Object => List.<Promise.<Object>>}
 */
Orchestrator.prototype.runStep = function (step) {
  return function (state) {
    state.jobs[step.get('name')] = state.jobs[step.get('name')]
      .set('status', 'pending');
    return List.of(
      Promise.resolve(state),
      step.get('promise').then(function (obj) {
        state.jobs[step.get('name')] = state.jobs[step.get('name')]
          .set('status', obj.get('status'));

        if (obj.has('errors')) {
          state.jobs[step.get('name')] = state.jobs[step.get('name')]
            .set('errors', obj.get('errors'));
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
            errors: List.of('Not authorized'),
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
    promise: ThirdPartyChecker.check(httpLocation)
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
  var finalTRpath = thisVersion.replace('http://www.w3.org', '');
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
 * @param {Object} state - A state for a specific publication request
 * @returns {List.<Promise.<Object>>} A list of promised states that are fulfilled at different stages of each step
 */
Orchestrator.prototype.next = function (state) {
  if (state.jobs['retrieve-resources'].get('status') === '') {
    return this.runStep(
      this.runDocumentDownloader(this.url, this.tempLocation)
    )(state);
  }
  else if (state.jobs['specberus'].get('status') === '') {
    return this.runStep(this.runSpecberus(this.httpLocation))(state);
  }
  else if (state.jobs['token-checker'].get('status') === '') {
    return this.runStep(this.runTokenChecker(
      state.metadata.get('latestVersion'), this.url, this.token)
    )(state);
  }
  else if (state.jobs['third-party-checker'].get('status') === '') {
    return this.runStep(this.runThirdPartyChecker(this.httpLocation))(state);
  }
  else if (state.jobs['publish'].get('status') === '') {
    return this.runStep(this.runPublisher(state.metadata))(state);
  }
  else if (state.jobs['tr-install'].get('status') === '') {
    return this.runStep(
      this.runTrInstaller(state.metadata.get('thisVersion'), state.tempLocation)
    )(state);
  }
  else if (state.jobs['update-tr-shortlink'].get('status') === '') {
    return this.runStep(
      this.runShortlink(state.metadata.get('thisVersion'))
    )(state);
  }
  else {
    state.status = STATUS_SUCCESS;
    state.history = 'The document has been published at ' +
        '<a href="' + this.thisVersion + '">' + this.thisVersion + '</a>.';

    return List.of(Promise.resolve(state));
  }
};

module.exports = Orchestrator;
