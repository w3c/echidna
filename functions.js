var Http = require('http')
,   Promise = require('promise')
;

exports.downloadFile = function downloadFile(file_url) {
  return new Promise(function (resolve) {
    Http.get(file_url, function(res) {
      var content = '';

      res.on('data', function(data) { content = content + data; });
      res.on('end', function() { resolve(content); });
    });
  });
};
