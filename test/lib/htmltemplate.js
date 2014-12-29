var fs = require('fs');
var url = require('url');

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

function htmlTemplate(serverPath, fileSystemPath) {
  var today = new Date();
  var tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

  var templates = [ [ "DATE", fullDate(today) ],
    [ "DATE+1", fullDate(tomorrow) ],
    [ "YYYY", today.getFullYear() ],
    [ "YYYY+1", today.getFullYear()+1 ],
    [ "mm", today.getMonth() + 1 ],
    [ "MM", months[today.getMonth()] ],
    [ "DD+1", tomorrow.getDate() ],
    [ "DD", today.getDate() ] ];

  // will apply all the templates in the parameter content
  // return the string after replacement
  function applyTemplate(s) {
    var str = s.toString();

    function replace(oldstart) {
      if (oldstart > str.length) {
        return "";
      }
      var start = str.indexOf('{{', oldstart);
      var end = str.indexOf('}}', oldstart);
      if (start === -1 || end === -1 || (end <= (start+1))) {
        return str.substring(oldstart);
      }
      var name = str.substring(start+2, end).trim();
      var replacement = "";
      for (var i = templates.length - 1; i >= 0; i--) {
        var template = templates[i];
        if (name === template[0]) {
          replacement += template[1];
        }
      }
      return str.substring(oldstart, start)
       + replacement
       + replace(end+2);
    }

    return replace(0);
  }

  return function (req, res, next) {
    var path = url.parse(req.url).path;
    if (path.indexOf(serverPath) !== 0) {
      return next();
    }
    if (endsWith(path, "/")) {
      path += "index.html";
    }
    if (!(endsWith(path, ".html"))) {
      return next();
    }
    var filepath = fileSystemPath + path.substring(serverPath.length);
    var content = null;
    try {
      content = fs.readFileSync(filepath, {options: "utf-8"});
    } catch (e) {
      return next();
    }
    res.send(applyTemplate(content));
  };
}

module.exports = htmlTemplate;
