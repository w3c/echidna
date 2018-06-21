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
      resolve(errors);
    }
    else if (profile === 'CR') {
      if (previousVersion.includes("/WD-") || !isEditorial) {
        var octo = new Octokat({
          token: global.GH_TOKEN
        });
        var repo = octo.repos('w3c', 'transitions');

        var shortname = latestVersion.match(new RegExp(/.*\/([^/]+)\/$/))[1];
        var directorApproval = "Transition approved.";
        var commApproval = "Draft transition approved."
        var directorApprovalFound = false;
        var commApprovalFound = false;

        repo.issues.fetch(
          {
            labels: 'Awaiting publication',
            state: 'open',
            per_page: 100  // TODO: get all the issues, not just the first 100
          })
        .then((content) =>  {
          for (var issue of content.items) {
            if (issue.title.endsWith(' ' + shortname)) {
              repo.issues(issue.number).comments.fetch()
              .then((comments) => {
                for (var comment of comments.items) {
                  if (comment.body.startsWith(directorApproval)) {
                    // director's approval
                    octo.teams(global.GH_DIRECTOR_TEAM_ID).members(comment.user.login).fetch((err, res) => {
                      if (!err) directorApprovalFound = true;
                    });
                  } else if (comment.body.startsWith(commApproval)) {
                    // comm's approval
                    octo.teams(global.GH_COMM_TEAM_ID).members(comment.user.login).fetch((err, res) => {
                      if (!err) commApprovalFound = true;
                    });
                  }
                }
                if (!directorApprovalFound) errors.push("Director's approval not found".);
                if (!commApprovalFound) errors.push("Communication team's approval not found.");
                resolve(errors);
              });
            } else {
              // issue not found
              reject(new Error("Issue not found on the github repository w3c/transitions."));
            }
          }
        });
      }
    }
    else {
      return reject(new Error('Only WD, CR and Notes are allowed!'));
    }
    resolve(errors);
  });
};

module.exports = TransitionChecker;
