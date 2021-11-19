'use strict';

const { exec } = require('child_process');
const Fs = require('fs');
const Immutable = require('immutable');

const { List } = Immutable;
const { Map } = Immutable;
const Promise = require('promise');

const DocumentDownloader = require('./document-downloader');
const JsonHttpService = require('./json-http-service');
const Publisher = require('./publisher');
const SpecberusWrapper = require('./specberus-wrapper');
const TokenChecker = require('./token-checker');
const UserChecker = require('./user-checker');
const TransitionChecker = require('./transition-checker');
const IPChecker = require('./ip-checker');

// Configuration file
const config = process.env.CONFIG || 'config.js';
// eslint-disable-next-line import/no-dynamic-require
require(`../${config}`);

// Pseudo-constants:
const W3_ORG_PREFIX = /^https?:\/\/(www\.)?w3c?\.org/i;

function trInstaller(source, dest) {
  return new Promise((resolve, reject) => {
    const cmd = global.TR_INSTALL_CMD.replace(/\$source/g, source).replace(
      /\$dest/g,
      dest,
    );

    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve();
    });
  });
}

function updateTrShortlink(uri) {
  return new Promise((resolve, reject) => {
    const cmd = `${global.UPDATE_TR_SHORTLINK_CMD} ${uri}`;

    exec(cmd, (err, stdout, stderr) => {
      if (err) reject(stderr);
      else resolve();
    });
  });
}

/**
 * @exports lib/orchestrator
 */

function Orchestrator(url, tar, token, user, tempLoc, httpLoc, resultLoc, ip) {
  this.url = url;
  this.tar = tar;
  this.token = token;
  this.user = user;
  this.tempLocation = tempLoc;
  this.httpLocation = httpLoc;
  this.resultLocation = resultLoc;
  this.ip = ip;

  Object.freeze(this);
}

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
Orchestrator.hasFinished = state => {
  const status = state.get('status');

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
Orchestrator.iterate = (iteration, condition, handler, t) => {
  if (condition(t)) return Promise.resolve(t);
  return iteration(t)
    .reduce(
      (sequence, promisedNewT) =>
        sequence.then(() =>
          promisedNewT.then(newT => {
            handler(newT);
            return newT;
          }),
        ),
      Promise.resolve(),
    )
    .then(finalT =>
      Orchestrator.iterate(iteration, condition, handler, finalT),
    );
};

Orchestrator.prototype = {
  /**
   * Run the next step of the orchestration, for a given state.
   *
   * @param {RequestState} state - A state for a specific publication request
   * @returns {List.<Promise.<RequestState>>} A list of promised states that are fulfilled at different stages of each step
   */
  next(originState) {
    let step;
    let state = originState;

    if (state.hasJobStarted('ip-checker')) {
      state = state.set('status', 'started');
      step = this.runIPChecker(this.ip);
    } else if (state.hasJobStarted('retrieve-resources')) {
      state = state.set('status', 'started');
      step = this.runDocumentDownloader(
        this.url,
        this.tar,
        this.tempLocation,
        this.httpLocation,
      );
    } else if (state.hasJobStarted('metadata')) {
      step = this.runMetadataExtractor(this.httpLocation);
    } else if (state.hasJobStarted('user-checker')) {
      step = this.runUserChecker(
        this.user,
        state.get('metadata').get('delivererIDs'),
      );
    } else if (state.hasJobStarted('specberus')) {
      step = this.runSpecberus(
        this.httpLocation,
        state.get('metadata').get('profile'),
        state.get('metadata').get('patentPolicy'),
      );
    } else if (state.hasJobStarted('transition-checker')) {
      step = this.runTransitionChecker(
        state.get('metadata').get('profile'),
        state.get('metadata').get('latestVersion'),
        state.get('metadata').get('previousVersion'),
        state.get('metadata').get('updated'),
      );
    } else if (state.hasJobStarted('token-checker')) {
      step = this.runTokenChecker(
        state.get('metadata').get('latestVersion'),
        this.token,
      );
    } else if (state.hasJobStarted('publish')) {
      step = this.runPublisher(state.get('metadata'));
    } else if (state.hasJobStarted('tr-install')) {
      step = this.runTrInstaller(
        state.get('metadata').get('thisVersion'),
        this.tempLocation,
      );
    } else if (state.hasJobStarted('update-tr-shortlink')) {
      step = this.runShortlink(state.get('metadata').get('thisVersion'));
    }

    if (step) return this.runStep(step)(state);

    state = state.set('status', 'success');
    state = state.addToHistory(
      `The document has been published at <a href="${state
        .get('metadata')
        .get('thisVersion')}">${state.get('metadata').get('thisVersion')}</a>.`,
    );

    return List.of(Promise.resolve(state));
  },
};

/**
 * @param {Map.<string, *>} step
 * @returns {function} `RequestState => List.<Promise.<RequestState>>`
 */
Orchestrator.prototype.runStep = step => state =>
  List.of(
    Promise.resolve(state.setJobStatus(step.get('name'), 'pending')),
    step
      .get('promise')
      .then(obj => {
        let newState = state;
        newState = newState.setJobStatus(step.get('name'), obj.get('status'));

        if (obj.get('status') === 'failure') {
          newState = newState.set('status', 'failure');
        } else if (obj.get('status') === 'error') {
          newState = newState.set('status', 'error');
        }

        if (obj.has('errors')) {
          newState = newState.setJobErrors(step.get('name'), obj.get('errors'));
        }
        if (obj.has('history'))
          newState = newState.addToHistory(obj.get('history'));
        if (obj.has('metadata')) {
          obj.get('metadata').forEach((v, k) => {
            newState = newState.addToMetadata(k, v);
          });
        }

        if (obj.has('cfe'))
          newState = newState.addToMetadata('cfe', obj.get('cfe'));

        return newState;
      })
      .catch(() => {
        let newState = state;
        newState = newState.set('status', 'error');
        newState = newState.addToHistory(
          'A system error occurred during the process.',
        );

        return newState;
      }),
  );

// @returns Map[String, Promise[Map[String, *]]]
Orchestrator.prototype.runDocumentDownloader = (
  url,
  tar,
  tempLocation,
  httpLocation,
) => {
  let finalUrl = url;
  const isTar = !url && tar;
  let map;

  if (isTar) {
    finalUrl = httpLocation.replace(/Overview.html/, tar.originalname);
    map = new Map({
      name: 'retrieve-resources',
      promise: DocumentDownloader.install(
        tempLocation + tar.originalname,
        tar.buffer,
      )
        .then(() => DocumentDownloader.fetchAndInstall(finalUrl, tempLocation))
        .then(() => {
          if (isTar) Fs.unlinkSync(tempLocation + tar.originalname);
          return new Map({
            status: 'ok',
            history: 'The file has been retrieved.',
          });
        })
        .catch(error => {
          if (isTar) Fs.unlinkSync(tempLocation + tar.originalname);
          return new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'The document could not be retrieved.',
          });
        }),
    });
  } else {
    map = new Map({
      name: 'retrieve-resources',
      promise: DocumentDownloader.fetchAndInstall(finalUrl, tempLocation)
        .then(
          () =>
            new Map({
              status: 'ok',
              history: 'The file has been retrieved.',
            }),
        )
        .catch(
          error =>
            new Map({
              status: 'error',
              errors: List.of(error.toString()),
              history: 'The document could not be retrieved.',
            }),
        ),
    });
  }
  return map;
};

Orchestrator.prototype.runMetadataExtractor = httpLocation =>
  new Map({
    name: 'metadata',
    promise: SpecberusWrapper.extractMetadata(httpLocation)
      .then(metadata => {
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
              implementationReport: metadata.implementationReport,
              patentPolicy: metadata.patentPolicy,
            }),
          });
        }

        return new Map({
          status: 'failure',
          errors: metadata.errors,
          history: 'Could not extract the metadata.',
        });
      })
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while running the metadata extractor.',
          }),
      ),
  });

Orchestrator.prototype.runUserChecker = (user, delivererIDs) =>
  new Map({
    name: 'user-checker',
    promise: UserChecker.check(user, delivererIDs)
      .then(errors => {
        if (errors.isEmpty()) {
          return new Map({
            status: 'ok',
          });
        }

        return new Map({
          status: 'failure',
          errors,
          history: 'You are not authorized to publish',
        });
      })
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while running the user checker.',
          }),
      ),
  });

Orchestrator.prototype.runIPChecker = ip =>
  new Map({
    name: 'ip-checker',
    promise: IPChecker.check(ip)
      .then(errors => {
        if (errors.isEmpty()) {
          return new Map({
            status: 'ok',
          });
        }

        return new Map({
          status: 'failure',
          errors,
          history: `This IP ${ip} isn't authorized to use the token method`,
        });
      })
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while running the IP checker.',
          }),
      ),
  });

Orchestrator.prototype.runSpecberus = (httpLocation, profile, patentPolicy) =>
  new Map({
    name: 'specberus',
    promise: SpecberusWrapper.validate(httpLocation, profile, patentPolicy)
      .then(report => {
        if (report.errors.isEmpty()) {
          return new Map({
            status: 'ok',
            history: 'The document passed Specberus.',
          });
        }

        return new Map({
          status: 'failure',
          errors: report.errors,
          history: 'The document failed Specberus.',
        });
      })
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while running Specberus.',
          }),
      ),
  });

Orchestrator.prototype.runTransitionChecker = (
  profile,
  latestVersion,
  previousVersion,
  isUpdate,
) =>
  new Map({
    name: 'transition-checker',
    promise: TransitionChecker.check(
      profile,
      latestVersion,
      previousVersion,
      isUpdate,
    )
      .then(report => {
        if (report.errors.isEmpty()) {
          return new Map({
            status: 'ok',
            history: 'The document passed the transition checker.',
            cfe: report.requiresCfE,
          });
        }

        return new Map({
          status: 'failure',
          errors: report.errors,
          history: 'The document failed the transition checker.',
        });
      })
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while running the transition checker.',
          }),
      ),
  });

Orchestrator.prototype.runTokenChecker = (latestVersion, token) =>
  new Map({
    name: 'token-checker',
    promise: TokenChecker.check(latestVersion, token)
      .then(errors => {
        if (errors.isEmpty()) {
          return new Map({
            status: 'ok',
          });
        }

        return new Map({
          status: 'failure',
          errors,
          history: 'You are not authorized to publish',
        });
      })
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while running the Token Checker.',
          }),
      ),
  });

Orchestrator.prototype.runPublisher = metadata => {
  const pubsystemService = new JsonHttpService(
    global.W3C_PUBSYSTEM_URL,
    global.USERNAME,
    global.PASSWORD,
  );

  return new Map({
    name: 'publish',
    promise: new Publisher(pubsystemService)
      .publish(metadata)
      .then(errors => {
        if (errors.isEmpty()) {
          return new Map({
            status: 'ok',
          });
        }

        return new Map({
          status: 'failure',
          errors,
          history: `The document could not be published: ${errors.map(
            e => e.message,
          )}`,
        });
      })
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: `The document could not be published: ${error.message}`,
          }),
      ),
  });
};

Orchestrator.prototype.runTrInstaller = (thisVersion, tempLocation) => {
  const finalTRpath = thisVersion.replace(W3_ORG_PREFIX, '');

  return new Map({
    name: 'tr-install',
    promise: trInstaller(tempLocation, finalTRpath)
      .then(() => new Map({ status: 'ok' }))
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while installing the document in TR',
          }),
      ),
  });
};

Orchestrator.prototype.runShortlink = thisVersion =>
  new Map({
    name: 'update-tr-shortlink',
    promise: updateTrShortlink(thisVersion)
      .then(() => new Map({ status: 'ok' }))
      .catch(
        error =>
          new Map({
            status: 'error',
            errors: List.of(error.toString()),
            history: 'An error occurred while updating the shortlink.',
          }),
      ),
  });

module.exports = Orchestrator;
