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

TransitionChecker.check = function (profile, latestVersion, previousVersion) {
  return new Promise(function (resolve, reject) {
    var editorial = false;
    var errors = new List();
    if (profile === 'WD' || profile === 'WG-NOTE') {
      resolve(errors);
    }
    else if (profile === 'CR') {
      if (previousVersion.includes("/WD-") || !editorial) {
        var shortname = latestVersion.match(new RegExp(/.*\/([^/]+)\/$/))[1];
        var octo = new Octokat({
          token: global.GH_TOKEN;
        });

        var shortname = 'css-text-decor-3';
        var repo = octo.repos('w3c', 'transitions');
        var approvalText = "Please update the Re";

        repo.issues.fetch(
          {
            labels: 'Awaiting publication',
            state: 'open',
            per_page: 100
          })
        .then((content) =>  {
          for (var issue of content.items) {
            if (issue.title.endsWith(' ' + shortname)) {
              repo.issues(issue.number).comments.fetch()
              .then((comments) => {
                for (var comment of comments.items) {
                  if (comment.body.startsWith(approvalText)) {
                    // TODO: comment.user.login has approved the transition
                  }
                }
              });
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
