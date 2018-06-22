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

TransitionChecker.check = function (profile, latestVersion, previousVersion, isEditorial, isUpdate) {
  return new Promise(function (resolve, reject) {
    var errors = new List();

    if (profile === 'WD' || profile === 'WG-NOTE' || isUpdate) {
      resolve({ errors: errors, requiresCfE: false });
    }
    else if (profile === 'CR') {
      if (previousVersion.includes('/WD-') || (previousVersion.includes('/CR-') && !isEditorial)) {
        var octo = new Octokat({
          token: global.GH_TOKEN
        });
        var repo = octo.repos('w3c', 'transitions');

        var shortname = latestVersion.match(new RegExp(/.*\/([^/]+)\/$/))[1];
        var directorApproval = 'Transition approved.';
        var commApproval = 'Draft transition approved.';
        var directorApprovalFound = false;
        var commApprovalFound = false;

        repo.issues.fetch(
          {
            labels: 'Awaiting publication',
            state: 'open',
            per_page: 100 // TODO: get all the issues, not just the first 100
          })
        .then((content) => {
          for (var issue of content.items) {
            if (issue.title.endsWith(' ' + shortname)) {
              repo.issues(issue.number).comments.fetch()
              .then((comments) => {
                for (var comment of comments.items) {
                  if (comment.body.startsWith(directorApproval)) {
                    // Director's approval
                    octo.teams(global.GH_DIRECTOR_TEAM_ID).members(comment.user.login).fetch((err) => {
                      if (!err) directorApprovalFound = true;
                    });
                  }
                  else if (comment.body.startsWith(commApproval)) {
                    // Comm's approval
                    octo.teams(global.GH_COMM_TEAM_ID).members(comment.user.login).fetch((err) => {
                      if (!err) commApprovalFound = true;
                    });
                  }
                }
                if (!directorApprovalFound) errors.push('Director\'s approval not found.');
                if (!commApprovalFound) errors.push('Communication team\'s approval not found.');
                return resolve({ errors: errors, requiresCfE: true });
              });
            }
            else {
              // Issue not found
              return reject(new Error('Issue not found on the github repository w3c/transitions.'));
            }
          }
        })
        .catch(function (error) {
          return reject(new Error('An error occured while looking for the transition issue'));
        });
      }
      else if (previousVersion.includes('/CR-') && isEditorial) {
        return resolve({ errors: errors, requiresCfE: false });
      }
    }
    else
      reject(new Error('Only WD, CR and Notes are allowed!'));
  });
};

module.exports = TransitionChecker;
