var fs = require('fs');

var utils = function () {};

// v8 doesn't support String.endsWith
function endsWith(subjectString, searchString) {
  var s = subjectString.toString();
  position = s.length - searchString.length;
  var lastIndex = s.indexOf(searchString, position);
  return lastIndex !== -1 && lastIndex === position;
}

// returns date as "YYYYMMDD"
function fullDate(dateObj) {
  function pn(n) {
    return (n<10)?"0"+n:""+n;
  }
  return dateObj.getFullYear() + "" +
    pn(dateObj.getMonth()+1) + "" + pn(dateObj.getDate());
}

var months = ['January','February','March','April','May','June','July',
      'August','September','October','November','December'];

var today = (function () {
  // we strip off the time
  var t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
})();
var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

// the global substitutions
var subtitutions = { "DATE": fullDate(today),
    "DATE+1": fullDate(tomorrow),
    "YYYY": today.getFullYear(),
    "YYYY+1": today.getFullYear()+1,
    "mm": today.getMonth() + 1,
    "MM": months[today.getMonth()],
    "DD+1": tomorrow.getDate(),
    "DD": today.getDate() };

// storage for metadata associated with the drafts
var metadata = {};

// decorate the loaded metadata even more
// return void
function augmentMetadata(name) {
  var data = metadata[name];

  if (data.docData === undefined)
    data.docDate = today;

  if (data.thisVersion === undefined) {
    data.thisVersion = "http://www.w3.org/TR/" + subtitutions.YYYY + "/" +
    data.status + "-" + data.shortname + "-" + subtitutions.DATE + "/";
  }

  if (data.latestVersion === undefined) {
    data.latestVersion = "http://www.w3.org/TR/" + data.shortname + "/";
  }

  if (data.deliverers === undefined) {
    data.deliverers =
     [{ name: data.groupName, homepage: data.groupHomepage }];
  }
}

// look for /meta.json based on filepath
// and store if any using name found in filepath (subdirectory name)
// return the loaded metadata
function getMetadata(dirpath, name) {
  if (metadata[name] === undefined) {
    try {
      metadata[name] = JSON.parse(fs.readFileSync(dirpath + "/" + name + "/meta.json",
                                             {options: "utf-8"}));
      augmentMetadata(name);
    } catch (e) {
      metadata[name] = {};
    }
  }
  return metadata[name];
}

module.exports.endsWith = endsWith;
module.exports.subtitutions = subtitutions;
module.exports.getMetadata = getMetadata;
