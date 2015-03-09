'use strict';

var Fs = require('fs');
var Request = require('request');
var List = require('immutable').List;
var Promise = require('promise');
var Url = require('url');

var DocumentDownloader = function () {};

DocumentDownloader.fetch = function (url) {
  return new Promise(function (resolve, reject) {
    Request.get(url, { timeout: 30000 }, function (error, response, body) {
      if (error) {
        reject(new Error(
          'Fetching ' + url + ' triggered a network error: ' + error.message
        ));
      }
      else if (response.statusCode !== 200) {
        reject(new Error(
          'Fetching ' + url +
          ' triggered and HTTP error: code ' + response.statusCode
        ));
      }
      else resolve(body);
    });
  });
};

DocumentDownloader.fetchAll = function (urls) {
  return Promise.all(urls.toArray().map(this.fetch)).then(List);
};

DocumentDownloader.install = function (dest, content) {
  return Promise.denodeify(Fs.writeFile)(dest, content);
};

DocumentDownloader.installAll = function (destsContents) {
  // `e` is a tuple of [dest, content]
  return Promise.all(destsContents.toArray().map(function (e) {
    return DocumentDownloader.install(e[0], e[1]);
  }));
};

DocumentDownloader.sanitize = function (list) {
  return list.filter(function (filename) {
    if (filename.toLowerCase().indexOf('.htaccess') !== -1) return false;
    else if (filename.toLowerCase().indexOf('.php') !== -1) return false;
    else return true;
  });
};

DocumentDownloader.fetchAndInstall = function (url, dest) {
  var mkdir = Promise.denodeify(Fs.mkdir);

  return new Promise(function (resolve) {
    Fs.exists(dest, function (exists) { resolve(exists); });
  }).then(function (pathExists) {
    if (!pathExists) return mkdir(dest);
  }).then(function () {
    return DocumentDownloader.fetch(url).then(function (content) {
      if (content.trim().charAt(0) !== '<') {
        var filenames = DocumentDownloader.getFilenames(content);
        var dests = DocumentDownloader.sanitize(filenames)
          .set(0, 'Overview.html')
          .map(function (filename) {
            return dest + '/' + filename;
          });
        var urls = filenames.map(function (filename) {
          // If an entry in the manifest had a space in it,
          // we assume it needs to be built from the spec-generator.
          // See https://github.com/w3c/spec-generator
          var specGeneratorComp = filename.split(' ');
          var absUrl = Url.resolve(url, specGeneratorComp[0]);
          if (specGeneratorComp.length === 2) {
            return global.SPEC_GENERATOR + '?type=' +
                     encodeURIComponent(specGeneratorComp[1]) +
                     '&url=' + encodeURIComponent(absUrl);
          }
          return absUrl;
        });
        return DocumentDownloader.fetchAll(urls).then(function (contents) {
          return DocumentDownloader.installAll(dests.zip(contents));
        });
      }
      else return DocumentDownloader.install(dest + '/Overview.html', content);
    });
  });
};

DocumentDownloader.getFilenames = function getFilenames(manifest) {
  return manifest.split('\n').reduce(function (acc, line) {
    var filename = line.split('#')[0].trim();

    if (filename !== '') return acc.push(filename);
    else return acc;
  }, new List());
};

module.exports = DocumentDownloader;
