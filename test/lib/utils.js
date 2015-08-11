'use strict';

var fs = require('fs');

/**
 * @exports test/lib/utils/draftsSystemPath
 */

var draftsSystemPath = __dirname + '/../drafts';

/**
 * V8 doesn't support String.endsWith
 * @exports test/lib/utils/draftsSystemPath
 */

function endsWith(subjectString, searchString) {
  var s = subjectString.toString();
  var position = s.length - searchString.length;
  var lastIndex = s.indexOf(searchString, position);

  return lastIndex !== -1 && lastIndex === position;
}

// Returns date as 'YYYYMMDD'
function fullDate(dateObj) {
  function pn(n) {
    return (n < 10 ? '0' : '') + String(n);
  }

  return String(dateObj.getFullYear()) +
    pn(dateObj.getMonth() + 1) + pn(dateObj.getDate());
}

var months = [
  'January', 'February', 'March', 'April', 'May', 'June', 'July',
  'August', 'September', 'October', 'November', 'December'
];

var today = (function () {
  // We strip off the time
  var t = new Date();

  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
})();

var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

/**
 * The global substitutions
 * @exports test/lib/utils/substitutions
 */

var substitutions = {
  'DATE': fullDate(today),
  'DATE+1': fullDate(tomorrow),
  'YYYY': today.getFullYear(),
  'YYYY+1': today.getFullYear() + 1,
  'mm': today.getMonth() + 1,
  'MM': months[today.getMonth()],
  'DD+1': tomorrow.getDate(),
  'DD': today.getDate()
};

// Storage for metadata associated with the drafts
var metadata = {};

// Decorate the loaded metadata even more
// Return void
function augmentMetadata(name) {
  var data = metadata[name];

  if (data.docData === undefined) data.docDate = today;

  if (data.thisVersion === undefined) {
    data.thisVersion = 'http://www.w3.org/TR/' + substitutions.YYYY + '/' +
    data.status + '-' + data.shortname + '-' + substitutions.DATE + '/';
  }

  if (data.latestVersion === undefined) {
    data.latestVersion = 'http://www.w3.org/TR/' + data.shortname + '/';
  }

  if (data.deliverers === undefined) {
    data.deliverers = [{ name: data.groupName, homepage: data.groupHomepage }];
  }
}

/**
 * Look for /meta.json based on filepath
 * and store if any using name found in filepath (subdirectory name)
 * Return the loaded metadata
 * @exports test/lib/utils/getMetadata
 */

function getMetadata(name) {
  if (metadata[name] === undefined) {
    try {
      metadata[name] = JSON.parse(fs.readFileSync(
        draftsSystemPath + '/' + name + '/meta.json', { options: 'utf-8' }
      ));
      augmentMetadata(name);
    }
    catch (e) {
      metadata[name] = {};
    }
  }
  return metadata[name];
}

module.exports.draftsSystemPath = draftsSystemPath;
module.exports.endsWith = endsWith;
module.exports.substitutions = substitutions;
module.exports.getMetadata = getMetadata;
