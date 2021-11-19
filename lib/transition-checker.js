/**
 * @file Check if the state of document can be transferred, relayed on issue and comments in [w3c/transitions](https://github.com/w3c/transitions)
 */

'use strict';

const { List } = require('immutable');
const Octokat = require('octokat');

/**
 * @exports lib/transition-checker
 */

const TransitionChecker = {};

/**
 * @returns {Promise.<List.<String>>}
 */

/**
 * @description Check if the document can be transferred. Accounting:
 * - Getting Issues in [w3c/transitions](https://github.com/w3c/transitions) and check the comments.
 * - directorApproval: [request-a-transition-request](https://github.com/w3c/echidna/wiki/CR-publication-workflow#request-a-transition-request)
 * - commApproval: [draft-announcement-to-the-members](https://github.com/w3c/echidna/wiki/CR-publication-workflow#draft-announcement-to-the-members)
 * @param {*} profile
 * @param {*} latestVersion
 * @param {*} previousVersion
 * @param {*} isUpdate
 */
TransitionChecker.check = (profile, latestVersion, previousVersion, isUpdate) =>
  new Promise((resolve, reject) => {
    let errors = new List();

    if (
      profile === 'WD' ||
      profile === 'NOTE' ||
      profile === 'DNOTE' ||
      profile === 'CRD' ||
      isUpdate
    ) {
      resolve({ errors, requiresCfE: false });
    } else if (profile === 'CR') {
      if (
        previousVersion.includes('/WD-') ||
        previousVersion.includes('/CR-') ||
        previousVersion.includes('/CRD-')
      ) {
        const octo = new Octokat({
          token: global.GH_TOKEN,
        });
        const repo = octo.repos('w3c', 'transitions');

        const shortname = latestVersion.match(/.*\/([^/]+)\/$/)[1];
        const directorApproval = 'transition approved.';
        const commApproval = 'draft transition received.';
        let directorApprovalFound = false;
        let commApprovalFound = false;
        let issueNumber;

        repo.issues
          .fetch({
            labels: 'Awaiting Publication',
            state: 'open',
            sort: 'updated',
            per_page: 100, // TODO: get all the issues, not just the first 100
          })
          .then(content => {
            const issueFound = content.items.some(issue => {
              if (issue.title.endsWith(` ${shortname}`)) {
                issueNumber = issue.number;
                repo
                  .issues(issue.number)
                  .comments.fetch()
                  .then(comments => {
                    const promises = [];

                    comments.items.every(comment => {
                      const commentText = comment.body.toLowerCase();
                      if (commentText.indexOf(directorApproval) > -1) {
                        // Director's approval
                        const p1 = octo
                          .teams(global.GH_DIRECTOR_TEAM_ID)
                          .members(comment.user.login)
                          .fetch(err => {
                            if (!err) directorApprovalFound = true;
                          });

                        promises.push(p1);
                      } else if (commentText.indexOf(commApproval) > -1) {
                        // Comm's approval
                        const p2 = octo
                          .teams(global.GH_COMM_TEAM_ID)
                          .members(comment.user.login)
                          .fetch(err => {
                            if (!err) commApprovalFound = true;
                          });

                        promises.push(p2);
                      }
                      return true;
                    });
                    Promise.all(promises).then(() => {
                      if (!directorApprovalFound)
                        errors = errors.push(
                          'Approval from Director not found.',
                        );
                      if (!commApprovalFound)
                        errors = errors.push(
                          'Approval from Communication Team not found.',
                        );
                      if (directorApprovalFound && commApprovalFound) {
                        // Close issue
                        repo.issues(issueNumber).update({ state: 'closed' });
                      }
                      return resolve({ errors, requiresCfE: true });
                    });
                  });
                return true;
              }
              return false;
            });
            if (!issueFound) {
              // Issue not found
              return reject(
                new Error(
                  'Issue not found on the github repository w3c/transitions. Make sure all the requirements are met: https://github.com/w3c/echidna/wiki/CR-publication-workflow#request-a-transition-request',
                ),
              );
            }
          })
          .catch(error =>
            reject(
              new Error(
                `An error occurred while looking for the transition issue: ${error}`,
              ),
            ),
          );
      } else reject(new Error('Only CR coming from CR or WD are allowed!'));
    } else reject(new Error('Only WD, CR and Notes are allowed!'));
  });

module.exports = TransitionChecker;
