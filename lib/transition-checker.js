/**
 * @file Check if the state of document can be transfered, relayed on issue and comments in [w3c/transitions](https://github.com/w3c/transitions)
 */
'use strict';

var List = require('immutable').List;
var Octokat = require('octokat');

/**
 * @exports lib/transition-checker
 */

var TransitionChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

/**
 * @description Check if the document can be transfered. Accounting:
 * - Getting Issues in [w3c/transitions](https://github.com/w3c/transitions) and check the comments.
 * - directorApproval: [request-a-transition-request](https://github.com/w3c/echidna/wiki/CR-publication-workflow#request-a-transition-request)
 * - commApproval: [draft-announcement-to-the-members](https://github.com/w3c/echidna/wiki/CR-publication-workflow#draft-announcement-to-the-members)
 * @param {*} profile
 * @param {*} latestVersion
 * @param {*} previousVersion
 * @param {*} isUpdate
 */
TransitionChecker.check = function (profile, latestVersion, previousVersion, isUpdate) {
  return new Promise(function (resolve, reject) {
    var errors = new List();

    if (profile === 'WD' || profile === 'WG-NOTE' || profile === 'IG-NOTE' || isUpdate) {
      resolve({ errors: errors, requiresCfE: false });
    }
    else if (profile === 'CR') {
      if (previousVersion.includes('/WD-') || previousVersion.includes('/CR-') || (previousVersion.includes('/CRD-'))) {
        var octo = new Octokat({
          token: global.GH_TOKEN
        });
        var repo = octo.repos('w3c', 'transitions');

        var shortname = latestVersion.match(new RegExp(/.*\/([^/]+)\/$/))[1];
        var directorApproval = 'transition approved.';
        var commApproval = 'draft transition approved.';
        var directorApprovalFound = false;
        var commApprovalFound = false;
        var issueFound = false;
        var issueNumber;

        repo.issues.fetch(
          {
            labels: 'Awaiting Publication',
            state: 'open',
            sort: 'updated',
            per_page: 100 // TODO: get all the issues, not just the first 100
          })
        .then((content) => {
          for (var issue of content.items) {
            if (issue.title.endsWith(' ' + shortname)) {
              issueFound = true;
              issueNumber = issue.number;
              repo.issues(issue.number).comments.fetch()
              .then((comments) => {
                var promises = [];

                for (var comment of comments.items) {
                  if (comment.body.toLowerCase().startsWith(directorApproval)) {
                    // Director's approval
                    var p1 = octo.teams(global.GH_DIRECTOR_TEAM_ID).members(comment.user.login).fetch((err) => {
                      if (!err) directorApprovalFound = true;
                    });

                    promises.push(p1);
                  }
                  else if (comment.body.toLowerCase().startsWith(commApproval)) {
                    // Comm's approval
                    var p2 = octo.teams(global.GH_COMM_TEAM_ID).members(comment.user.login).fetch((err) => {
                      if (!err) commApprovalFound = true;
                    });

                    promises.push(p2);
                  }
                }
                Promise.all(promises).then(function () {
                  if (!directorApprovalFound) errors = errors.push('Approval from Director not found.');
                  if (!commApprovalFound) errors = errors.push('Approval from Communication Team not found.');
                  if (directorApprovalFound && commApprovalFound) {
                    // Close issue
                    repo.issues(issueNumber).update({ state: 'closed' });
                  }
                  return resolve({ errors: errors, requiresCfE: true });
                });
              });
            }
          }
          if (!issueFound) {
            // Issue not found
            return reject(new Error('Issue not found on the github repository w3c/transitions. Make sure all the requirements are met: https://github.com/w3c/echidna/wiki/CR-publication-workflow#request-a-transition-request'));
          }
        })
        .catch(function (error) {
          return reject(new Error('An error occured while looking for the transition issue: ' + error));
        });
      }
    } else if (profile === 'CRD') {
      return resolve({ errors: errors, requiresCfE: false });
    }
    else
      reject(new Error('Only WD, CR and Notes are allowed!'));
  });
};

module.exports = TransitionChecker;
