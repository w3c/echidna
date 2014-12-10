var Http = require('http')
,   Promise = require('promise')
,   Fs = require('fs')
,   List = require('immutable').List
;

// Zip the list with a given array
// This is temporary until progress on
// https://github.com/facebook/immutable-js/issues/51
List.prototype.zip = function(array) {
  return this.map(function (item, index) {
    return List.of(item, array[index]);
  });
};

var DocumentDownloader = function() {};

DocumentDownloader.prototype.fetch = function (url) {
  return new Promise(function (resolve) {
    Http.get(url, function(res) {
      var content = '';

      res.on('data', function(data) { content = content + data; });
      res.on('end', function() { resolve(content); });
    });
  });
};

DocumentDownloader.prototype.fetchAll = function (urls) {
  return Promise.all(urls.toArray().map(this.fetch));
};

DocumentDownloader.prototype.install = function (dest, content) {
  return Promise.denodeify(Fs.writeFile)(dest, content);
}

DocumentDownloader.prototype.installAll = function(destsContents) {
  var self = this;
  return Promise.all(destsContents.toArray().map(function (e) { // e == [dest, content]
    return self.install(e.get(0), e.get(1));
  }));
};

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
