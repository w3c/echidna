var Http = require('http')
,   Promise = require('promise')
,   Fs = require('fs')
,   List = require('immutable').List
,   Url = require('url')
,   Specberus = require("../specberus/lib/validator").Specberus
,   C = require('./const.js')
;

// Zip a list with another list
// Example: (a, b) zip (c, d) == ((a, c), (b, d))
// This is temporary until progress on
// https://github.com/facebook/immutable-js/issues/51
List.prototype.zip = function(list) {
  return this.map(function (item, index) {
    return List.of(item, list.get(index));
  });
};

var DocumentDownloader = function() {};

DocumentDownloader.fetch = function (url) {
  return new Promise(function (resolve) {
    Http.get(url, function(res) {
      var content = '';

      res.on('data', function(data) { content = content + data; });
      res.on('end', function() { resolve(content); });
    });
  });
};

DocumentDownloader.fetchAll = function (urls) {
  return Promise.all(urls.toArray().map(this.fetch)).then(List);
};

DocumentDownloader.install = function (dest, content) {
  return Promise.denodeify(Fs.writeFile)(dest, content);
};

DocumentDownloader.installAll = function(destsContents) {
  return Promise.all(destsContents.toArray().map(function (e) { // e == [dest, content]
    return DocumentDownloader.install(e.get(0), e.get(1));
  }));
};

DocumentDownloader.fetchAndInstall = function (url, dest, isManifest) {
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
    return DocumentDownloader.fetch(url).then(function (content) {
      if (isManifest) {
        var filenames = DocumentDownloader.getFilenames(content);
        var dests = filenames.set(0, 'Overview.html').map(function (filename) {
          return dest + '/' + filename;
        });
        var urls = filenames.map(function (filename) {
          return Url.resolve(url, filename);
        });
        return DocumentDownloader.fetchAll(urls).then(function (contents) {
          return DocumentDownloader.installAll(dests.zip(contents));
        });
      }
      else {
        return DocumentDownloader.install(dest + '/Overview.html', content);
      }
    });
  });
};

DocumentDownloader.getFilenames = function getFilenames(manifest) {
  return manifest.split('\n').reduce(function (acc, line) {
    var filename = line.split('#')[0].trim();

    if (filename !== '') {
      return acc.push(filename);
    }
    else {
      return acc;
    }
  }, List());
};

exports.DocumentDownloader = DocumentDownloader;

var SpecberusWrapper = function () {};

SpecberusWrapper.validate = function (url) {
  return new Promise(function (resolve, reject) {
    function Sink () {}
    require("util").inherits(Sink, require("events").EventEmitter);

    var sink = new Sink();
    var errors = List();
    var specberus = new Specberus();

    sink.on("start-all", function (profilename) {
      console.log("start-all", profilename);
    });

    sink.on("end-all", function (profilename) {
      resolve({
        errors: errors,
        metadata: specberus.data
      });
    });

    sink.on("err", function (type, data) {
      data.type = type;
      errors = errors.push(data);
    });

    sink.on("exception", function (exception) {
      reject(new Error(exception.message));
    });

    specberus.validate({
      url: url,
      profile: require("../specberus/lib/profiles/WD"),
      events: sink,
      // validation: "recursive",
      // validation: "simple-validation",
      validation: "no-validation",
      noRecTrack: false,
      informativeOnly: false,
      // patentPolicy: patentPolicy,
      processDocument: "2005"
    });
  });
}

exports.SpecberusWrapper = SpecberusWrapper;

var ThirdPartyChecker = function () {};

ThirdPartyChecker.check = function (url) {
  var args  = ['../third-party-resources-checker/detect-phantom.js', url, global.RESOURCE_WHITELIST],
      spawn = require('child_process').spawn;
  return new Promise(function (resolve, reject) {
    var phantom = spawn(global.PHANTOM, args)
    ,   buffer = "";
    phantom.stdout.on('data', function(data) {
      buffer += data;
    });
    phantom.on('close', function() {
      var consoleout = buffer.replace(global.DEFAULT_SPECBERUS_LOCATION, '', 'g').split("\n");
      consoleout.pop();
      if (consoleout.length > 0) {
        reject(consoleout);
      } else {
        resolve();
      }
    });
  });
}

exports.ThirdPartyChecker = ThirdPartyChecker;
