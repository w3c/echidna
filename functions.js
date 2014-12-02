var Http = require('http')
,   Promise = require('promise')
,   Fs = require('fs')
;

var DOWNLOAD_DIR = '/tmp/';

exports.downloadFile = function downloadFile(file_url) {
  return new Promise(function (resolve) {
    Http.get(file_url, function(res) {
      var content = '';

      res.on('data', function(data) { content = content + data; });
      res.on('end', function() { resolve(content); });
    });
  });
};

exports.temporaryInstall = function temporaryInstall(filename, content) {
  return Promise.denodeify(Fs.writeFile)(DOWNLOAD_DIR + filename, content);
}
