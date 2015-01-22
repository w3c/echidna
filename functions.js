var Http = require('http');
var Fs = require('fs');
var Url = require('url');
var Request = require('request');
var Promise = require('promise');
var List = require('immutable').List;
var Map = require('immutable').Map;
var Specberus = require("specberus/lib/validator").Specberus;
require('./config.js');

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
    return DocumentDownloader.install(e[0], e[1]);
  }));
};

DocumentDownloader.sanitize = function(list) {
  return list.filter(function (filename) {
    if (filename.toLowerCase().indexOf('.htaccess') !== -1) return false;
    else if (filename.toLowerCase().indexOf('.php') !== -1) return false;
    else return true;
  });
}

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
        var dests = DocumentDownloader.sanitize(filenames)
          .set(0, 'Overview.html')
          .map(function (filename) {
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

    if (filename !== '') return acc.push(filename);
    else return acc;
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
    var metadata = Map();

    sink.on("end-all", function (profilename) {
      resolve({
        errors: errors,
        metadata: metadata
      });
    });

    sink.on("metadata", function (key, value) {
      metadata = metadata.set(key, value);
    });

    sink.on("err", function (type, data) {
      data.type = type;
      errors = errors.push(data);
    });

    sink.on("exception", function (exception) {
      console.log("specberus exception is " + exception.message);
      reject(new Error(exception.message));
    });

    var options = {
      url: url,
      profile: require("specberus/lib/profiles/WD"),
      events: sink,
      // validation: "recursive",
      validation: "simple-validation",
      noRecTrack: false,
      informativeOnly: false,
      processDocument: "2014"
    };

    if (process.env.NODE_ENV == "dev") {
      var port = (process.env.PORT || 3000) + 1;
      options.cssValidator = "http://localhost:" + port + "/css-validator/validator";
      options.htmlValidator = "http://localhost:" + port + "/check";
    }

    new Specberus().validate(options);
  });
};

exports.SpecberusWrapper = SpecberusWrapper;

var ThirdPartyChecker = function () {};

ThirdPartyChecker.check = function (url) {
  var args  = ['../third-party-resources-checker/detect-phantom.js', url, global.RESOURCES_WHITELIST];
  var spawn = require('child_process').spawn;

  return new Promise(function (resolve) {
    var phantom = spawn(global.PHANTOM, args);
    var buffer = "";

    phantom.stdout.on('data', function(data) {
      buffer += data;
    });

    phantom.on('close', function() {
      var consoleout = buffer.replace(global.DEFAULT_HTTP_LOCATION, '', 'g').split("\n");
      consoleout.pop();
      resolve(consoleout);
    });
  });
}

exports.ThirdPartyChecker = ThirdPartyChecker;

var TokenChecker = function () {};

TokenChecker.check = function (url, token) {
  return new Promise(function (resolve, reject) {
    Request.get({
      uri: global.TOKEN_ENDPOINT,
      auth: {
        user: global.USERNAME,
        pass: global.PASSWORD
      },
      qs: {
        spec: url,
        token: token
      }
    }, function (err, res, body) {
      if (err) reject(new Error("There was an error while checking the token: ", err));
      else resolve(JSON.parse(body));
    });
  });
}

exports.TokenChecker = TokenChecker;
