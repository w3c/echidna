'use strict';

var exec = require('child_process').exec;
var Fs = require('fs');
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
var UserChecker = require('./user-checker');
var TransitionChecker = require('./transition-checker');

// Configuration file
let config = process.env.CONFIG || "config.js";
require("../" + config);

// Pseudo-constants:
var W3_ORG_PREFIX = /^https?:\/\/(www\.)?w3c?\.org/i;

function trInstaller(source, dest) {
  return new Promise(function (resolve, reject) {
    var cmd = global.TR_INSTALL_CMD
      .replace(/\$source/g, source)
      .replace(/\$dest/g, dest);

    exec(cmd, function (err, stdout, stderr) {
      if (err) reject(stderr);
      else resolve();
    });
  });
}

function updateTrShortlink(uri) {
  return new Promise(function (resolve, reject) {
    var cmd = global.UPDATE_TR_SHORTLINK_CMD + ' ' + uri;

    exec(cmd, function (err, stdout, stderr) {
      if (err) reject(stderr);
      else resolve();
    });
  });
}

/**
 * @exports lib/orchestrator
 */

var Orchestrator = function (url,
                             tar,
                             token,
                             isEditorial,
                             user,
                             tempLoc,
                             httpLoc,
                             resultLoc) {
  this.url = url;
  this.tar = tar;
  this.token = token;
  this.isEditorial = isEditorial;
  this.user = user;
  this.tempLocation = tempLoc;
  this.httpLocation = httpLoc;
  this.resultLocation = resultLoc;

  Object.freeze(this);
};

/**
 * Pseudo-constant to indicate a step that finished OK.
 */

Orchestrator.STATUS_OK = 'ok';

/**
 * Pseudo-constant to indicate successful completion.
 */

Orchestrator.STATUS_SUCCESS = 'success';

/**
 * Pseudo-constant to indicate failure.
 */

Orchestrator.STATUS_FAILURE = 'failure';

/**
 * Pseudo-constant to indicate errors.
 */

Orchestrator.STATUS_ERROR = 'error';

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
 * @param {function} iteration `T => List.<Promise.<T>>` function to repeatedly generate a new list of T from a previous T until a condition is reached
 * @param {function} condition `T => Boolean` function that returns true when the iteration must stop for a given T
 * @param {function} handler `T => ()` function to handle each promise produced by `iteration` as soon as they are fulfilled
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
 * @returns {function} `RequestState => List.<Promise.<RequestState>>`
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
          obj.get('metadata').forEach(function (v, k) {
            state = state.addToMetadata(k, v);
          });
        }

        if (obj.has('cfe'))
          state = state.addToMetadata('cfe', obj.get('cfe'));

        return state;
      })
      .catch(function () {

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
Orchestrator.prototype.runDocumentDownloader = function (url,
                                                         tar,
                                                         tempLocation,
                                                         httpLocation) {
  var finalUrl = url;
  var isTar = (!url && tar);
  var map;

  if (isTar) {
    finalUrl = httpLocation.replace(/Overview.html/, tar.originalname);
    map = new Map({
      name: 'retrieve-resources',
      promise: DocumentDownloader.install(tempLocation + tar.originalname,
                                          tar.buffer)
        .then(function () {
          return DocumentDownloader.fetchAndInstall(finalUrl, tempLocation);
        }).then(function () {
          if (isTar) Fs.unlinkSync(tempLocation + tar.originalname);
          return new Map({
            status: 'ok',
            history: 'The file has been retrieved.'
          });
        }).catch(function (error) {
          if (isTar) Fs.unlinkSync(tempLocation + tar.originalname);
          return new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'The document could not be retrieved.'
          });
        })
    });
  }
  else {
    map = new Map({
      name: 'retrieve-resources',
      promise: DocumentDownloader.fetchAndInstall(finalUrl, tempLocation)
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
  }
  return map;
};

Orchestrator.prototype.runMetadataExtractor = function (httpLocation) {
  return new Map({
    name: 'metadata',
    promise: SpecberusWrapper.extractMetadata(httpLocation)
      .then(function (metadata) {
        if (metadata) {
          return new Map({
            status: 'ok',
            history: 'The metadata have been extracted.',
            metadata: new Map({
              profile: metadata.profile,
              thisVersion: metadata.thisVersion,
              latestVersion: metadata.latestVersion,
              previousVersion: metadata.previousVersion,
              docDate: metadata.docDate,
              title: metadata.title,
              delivererIDs: metadata.delivererIDs,
              editors: metadata.editorIDs,
              rectrack: metadata.rectrack,
              informative: metadata.informative,
              editorDraft: metadata.editorsDraft,
              processRules: metadata.process,
              implementationFeedbackDue: metadata.implementationFeedbackDue,
              implementationReport: metadata.implementationReport
            })
          });
        }
        else {
          return new Map({
            status: 'failure',
            errors: metadata.errors,
            history: 'Could not extract the metadata.'
          });
        }
      }).catch(function (error) {
        return new Map({
          status: 'error',
          errors: List.of(error.toString()),
          history: 'An error occurred while running the metadata extractor.'
        });
      })
  });
};

Orchestrator.prototype.runUserChecker = function (user, delivererIDs) {
  return new Map({
    name: 'user-checker',
    promise: UserChecker.check(user, delivererIDs)
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
        history: 'An error occurred while running the user checker.'
      });
    })
  });
};

Orchestrator.prototype.runSpecberus = function (httpLocation,
                                                profile,
                                                recTrack,
                                                isEditorial) {
  return new Map({
    name: 'specberus',
    promise: SpecberusWrapper.validate(httpLocation, profile, recTrack, isEditorial)
      .then(function (report) {
        if (report.errors.isEmpty()) {
          return new Map({
            status: 'ok',
            history: 'The document passed Specberus.'
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

Orchestrator.prototype.runTransitionChecker = function (profile, latestVersion, previousVersion, isEditorial, isUpdate) {
  return new Map({
    name: 'transition-checker',
    promise: TransitionChecker.check(profile, latestVersion, previousVersion, isEditorial, isUpdate)
      .then(function (report) {
        if (report.errors.isEmpty()) {
          return new Map({
            status: 'ok',
            history: 'The document passed the transition checker.',
            cfe: report.requiresCfE
          });
        }
        else {
          return new Map({
            status: 'failure',
            errors: report.errors,
            history: 'The document failed the transition checker.'
          });
        }
      }).catch(function (error) {
        return new Map({
          status: 'error',
          errors: List.of(error.toString()),
          history: 'An error occurred while running the transition checker.'
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
  console.log('=======Orchestrator runThirdPartyChecker, httpLocation ', httpLocation);
  return new Map({
    name: 'third-party-checker',
    promise: ThirdPartyChecker.check(httpLocation, global.RESOURCES_ALLOWLIST)
      .then(function (extResources) {
        console.log('===== ThirdPartyChecker then: extResources', extResources);
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
    step = this.runDocumentDownloader(this.url,
                                      this.tar,
                                      this.tempLocation,
                                      this.httpLocation);
  }
  else if (state.hasJobStarted('metadata')) {
    step = this.runMetadataExtractor(this.httpLocation);
  }
  else if (state.hasJobStarted('user-checker')) {
    step = this.runUserChecker(this.user,
                               state.get('metadata').get('delivererIDs'));
  }
  else if (state.hasJobStarted('specberus')) {
    step = this.runSpecberus(this.httpLocation,
                             state.get('metadata').get('profile'),
                             state.get('metadata').get('rectrack'),
                             this.isEditorial);
  }
  else if (state.hasJobStarted('transition-checker')) {
    step = this.runTransitionChecker(state.get('metadata').get('profile'),
                                     state.get('metadata').get('latestVersion'),
                                     state.get('metadata').get('previousVersion'),
                                     this.isEditorial,
                                     state.get('metadata').get('updated'));
  }
  else if (state.hasJobStarted('token-checker')) {
    step = this.runTokenChecker(
      state.get('metadata').get('latestVersion'),
      this.url,
      this.token
    );
  }
  else if (state.hasJobStarted('third-party-checker')) {
    console.log('====step: third-party-checker hasJobStarted');
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
