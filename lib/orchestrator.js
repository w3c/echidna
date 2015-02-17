'use strict';

var exec = require('child_process').exec;
var Fs = require('fs');
var Path = require('path');
var Promise = require('promise');

var DocumentDownloader = require('./document-downloader');
var JsonHttpService = require('./json-http-service');
var Publisher = require('./publisher');
var SpecberusWrapper = require('../functions.js').SpecberusWrapper;
var ThirdPartyChecker = require('../functions.js').ThirdPartyChecker;
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

Orchestrator.prototype.runDocumentDownloader = function (url, tempLocation) {
  return function (state) {
    return DocumentDownloader.fetchAndInstall(url, tempLocation)
      .then(function () {
        state.jobs['retrieve-resources'].status = 'ok';
        state.history = state.history.add('The file has been retrieved.');

        return state;
      }).catch(function (error) {
        state.jobs['retrieve-resources'].status = 'error';
        state.jobs['retrieve-resources'].errors.push(error.toString());
        state.history = state.history.add(
          'The document could not be retrieved.'
        );

        return state;
      });
  };
};

Orchestrator.prototype.runSpecberus = function (httpLocation) {
  return function (state) {
    return SpecberusWrapper.validate(httpLocation)
      .then(function (report) {
        if (report.errors.isEmpty()) {
          state.jobs['specberus'].status = 'ok';
          state.history = state.history.add('The document passed specberus.');
          state.metadata = report.metadata;
        }
        else {
          state.jobs['specberus'].status = 'failure';
          state.jobs['specberus'].errors = report.errors;
          state.history = state.history.add('The document failed Specberus.');
        }

        return state;
      }).catch(function (error) {
        state.jobs['specberus'].status = 'error';
        state.jobs['specberus'].errors.push(error.toString());
        state.history = state.history.add(
          'An error occurred while running Specberus.'
        );

        return state;
      });
  };
};

Orchestrator.prototype.runTokenChecker = function (latestVersion, url, token) {
  return function (state) {
    return TokenChecker.check(latestVersion, token)
      .then(function (authReport) {
        var simpleSource1 = authReport.source.replace(/^https:/i, 'http:');
        var simpleSource2 = authReport.source.replace(/^http:/i, 'https:');
        var matchSource = (
          url.indexOf(simpleSource1) === 0 ||
          url.indexOf(simpleSource2) === 0
        );

        if (authReport.authorized && matchSource) {
          state.jobs['token-checker'].status = 'ok';
          state.history = state.history.add('You are authorized to publish');

          return state;
        }
        else {
          state.jobs['token-checker'].status = 'failure';
          state.jobs['token-checker'].errors.push('Not authorized');
          state.history = state.history.add(
            'You are not authorized to publish'
          );

          return state;
        }
      }).catch(function (error) {
        state.jobs['token-checker'].status = 'error';
        state.jobs['token-checker'].errors.push(error.toString());
        state.history = state.history.add(
          'An error occurred while running the Token Checker.'
        );

        return state;
      });
  };
};

Orchestrator.prototype.runThirdPartyChecker = function (httpLocation) {
  return function (state) {
    return ThirdPartyChecker.check(httpLocation)
      .then(function (extResources) {
        if (extResources.length === 0) {
          state.jobs['third-party-checker'].status = 'ok';
          state.history = state.history.add(
            'The document passed the third party checker.'
          );

          return state;
        }
        else {
          state.history = state.history.add(
            'The document contains non-authorized resources'
          );
          state.jobs['third-party-checker'].status = 'failure';
          state.jobs['third-party-checker'].errors = extResources;

          return state;
        }
      }).catch(function (error) {
        state.jobs['third-party-checker'].status = 'error';
        state.jobs['third-party-checker'].errors.push(error.toString());
        state.history = state.history.add(
          'An error occurred while running the Third Party Resources Checker.'
        );

        return state;
      });
  };
};

Orchestrator.prototype.runPublisher = function (metadata) {
  return function (state) {
    var pubsystemService = new JsonHttpService(
      global.W3C_PUBSYSTEM_URL,
      global.USERNAME,
      global.PASSWORD
    );

    return new Publisher(pubsystemService).publish(metadata)
      .then(function (errors) {
        if (errors.isEmpty()) {
          state.jobs['publish'].status = 'ok';

          return state;
        }
        else {
          state.jobs['publish'].status = 'failure';
          state.jobs['publish'].errors = errors;
          state.history = state.history.add(
            'The document could not be published: ' +
            errors.map(function (error) {
              return error.message;
            })
          );

          return state;
        }
      }).catch(function (error) {
        state.jobs['publish'].status = 'error';
        state.jobs['publish'].errors.push(error.toString());
        state.history = state.history.add(
          'The document could not be published: ' + error.message
        );

        return state;
      });
  };
};

Orchestrator.prototype.runTrInstaller = function (thisVersion, tempLocation) {
  return function (state) {
    var finalTRpath = thisVersion.replace('http://www.w3.org', '');
    return trInstaller(tempLocation, finalTRpath)
      .then(function () {
        state.jobs['tr-install'].status = 'ok';

        return state;
      }).catch(function (error) {
        state.jobs['tr-install'].status = 'error';
        state.jobs['tr-install'].errors.push(error.toString());
        state.history = state.history.add(
          'An error occurred while installing the document in TR'
        );

        return state;
      });
  };
};

Orchestrator.prototype.runShortlink = function (thisVersion) {
  return function (state) {
    return updateTrShortlink(thisVersion)
      .then(function () {
        state.jobs['update-tr-shortlink'].status = 'ok';

        return state;
      }).catch(function (error) {
        state.jobs['update-tr-shortlink'].status = 'error';
        state.jobs['update-tr-shortlink'].errors.push(error.toString());
        state.history = state.history.add(
          'An error occurred while updating the shortlink.'
        );

        return state;
      });
  };
};

Orchestrator.prototype.finishTasks = function (thisVersion, resultLocation) {
  return function (state) {
    var cmd =
      global.SENDMAIL + ' SUCCESS ' + global.MAILING_LIST + ' ' + thisVersion;

    exec(cmd, function (err, stdout, stderr) {
      if (err) console.error(stderr);
    });

    state.history = state.history.add(
      'The document has been published at ' +
      '<a href="' + thisVersion + '">' + thisVersion + '</a>.'
    );
    state.status = STATUS_SUCCESS;

    dumpJobResult(resultLocation, state);

    return state;
  };
};

Orchestrator.prototype.markStarted = function (jobName) {
  return function (state) {
    state.jobs[jobName].status = 'pending';
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
    .then(self.runDocumentDownloader(spec.url, tempLocation))
    .then(self.markStarted('specberus'))
    .then(self.runSpecberus(httpLocation))
    .then(function (state) {
      var metadata = state.metadata;

      return Promise.resolve(self.markStarted('token-checker')(state))
        .then(self.runTokenChecker(
          metadata.get('latestVersion'),
          spec.url, token
        ))
        .then(self.markStarted('third-party-checker'))
        .then(self.runThirdPartyChecker(httpLocation))
        .then(self.markStarted('publish'))
        .then(self.runPublisher(metadata))
        .then(self.markStarted('tr-install'))
        .then(self.runTrInstaller(metadata.get('thisVersion'), tempLocation))
        .then(self.markStarted('update-tr-shortlink'))
        .then(self.runShortlink(metadata.get('thisVersion')))
        .then(self.finishTasks(metadata.get('thisVersion'), resultLocation));
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
