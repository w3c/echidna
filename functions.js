var List = require('immutable').List;

var Http = require('http')
,   Promise = require('promise')
,   Fs = require('fs')
;

var DocumentDownloader = function() {};

DocumentDownloader.prototype.fetch = function (file_url) {
  return new Promise(function (resolve) {
    Http.get(file_url, function(res) {
      var content = '';

      res.on('data', function(data) { content = content + data; });
      res.on('end', function() { resolve(content); });
    });
  });
};

DocumentDownloader.prototype.install = function (dest, content) {
  return Promise.denodeify(Fs.writeFile)(dest, content);
}

DocumentDownloader.prototype.fetchAndInstall = function (url, dest) {
  var self = this;
  var mkdir = Promise.denodeify(Fs.mkdir);

  return new Promise(function (resolve) {
    Fs.exists(dest, function (exists) {
      resolve(exists);
    });
  }).then(function (pathExists) {
    if (!pathExists) {
      return mkdir(dest);
    }
  }).then(function () {
    return self.fetch(url).then(function (content) {
      return self.install(dest + '/Overview.html', content);
    });
  });
};

DocumentDownloader.prototype.getFilenames = function getFilenames(manifest) {
  return manifest.split('\n').reduce(function (acc, line) {
    var filename = line.split('#')[0].trim();

    if (filename !== '') {
      return acc.push(filename);
    }
    else {
      return acc;
    }
  }, List());
}

exports.DocumentDownloader = DocumentDownloader;
