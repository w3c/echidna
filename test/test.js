// switch the environment into testing mode
process.env.NODE_ENV = 'dev';

var expect = require("chai").use(require("chai-as-promised")).expect;
var Promise = require("promise");
var Fs = require("fs");
var Immutable = require('immutable');
var List = Immutable.List;
var Map = Immutable.Map;
require('../config.js');

var server = require("./lib/testserver");

// used by the TokenChecker
global.TOKEN_ENDPOINT = server.location() + '/authorize';
global.USERNAME = "toto";
global.PASSWORD = "secret";

var DocumentDownloader = require('../lib/document-downloader');
var SpecberusWrapper = require("../functions.js").SpecberusWrapper;
var TokenChecker = require("../functions.js").TokenChecker;

describe('DocumentDownloader', function () {

  describe('fetch(url)', function () {
    it('should be a function', function () {
      expect(DocumentDownloader.fetch).to.be.a('function');
    });

    var content = DocumentDownloader.fetch(server.location());

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a string', function () {
      return expect(content).to.eventually.be.a('string');
    });

    it('should download a file', function () {
      return expect(content).to.eventually.contain("Echidna testbed");
    });

    it('should reject if the resource does not exist', function () {
      var notFound = DocumentDownloader.fetch(server.location() + '/et/si/tu/n/existais/pas');
      return expect(notFound).to.eventually.be.rejectedWith(/code 404/);
    });

    it('should reject if the server is not reachable', function () {
      var notReachable = DocumentDownloader.fetch('http://youdbetternotexist/');
      return expect(notReachable).to.eventually.be.rejectedWith(/network error/);
    });
  });

  describe('fetchAll(urls)', function () {
    var content = DocumentDownloader.fetchAll(List.of(
      server.location() + "/robots",
      server.location() + "/elvis"
    ));

    it('should be a function', function () {
      expect(DocumentDownloader.fetchAll).to.be.a('function');
    });

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a List of size 2', function () {
      return expect(content).to.eventually.be.an.instanceOf(List).of.property('size', 2);
    });

    it('should fetch multiple URLs', function () {
      return content.then(function (content) {
        expect(content.get(0)).to.contain("looking for");
        expect(content.get(1)).to.contain("alive");
      });
    });
  });

  describe('install(dest, content)', function () {
    var promise;

    before(function() {
      promise = DocumentDownloader.install('/tmp/foo', 'bar');
    });

    after(function(){
      Fs.unlinkSync('/tmp/foo');
    });

    it('should be a function', function () {
      expect(DocumentDownloader.install).to.be.a('function');
    });

    it('should return a promise', function () {
      return expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should create the file with proper content', function () {
      return promise.then(function() {
        expect(Fs.readFileSync('/tmp/foo', { 'encoding': 'utf8' })).to.equal('bar');
      });
    });
  });

  describe('installAll(dests, contents)', function () {
    var promise;

    before(function() {
      promise = DocumentDownloader.installAll(List.of(
        ['/tmp/multiple_foo1', 'multiple_bar1'],
        ['/tmp/multiple_foo2', 'multiple_bar2']
      ));
    });

    after(function(){
      Fs.unlinkSync('/tmp/multiple_foo1');
      Fs.unlinkSync('/tmp/multiple_foo2');
    });

    it('should be a function', function () {
      expect(DocumentDownloader.installAll).to.be.a('function');
    });


    it('should return a promise', function () {
      return expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should create multiple files with proper contents', function () {
      return promise.then(function() {
        expect(Fs.readFileSync('/tmp/multiple_foo1', { 'encoding': 'utf8' })).to.equal('multiple_bar1');
        expect(Fs.readFileSync('/tmp/multiple_foo2', { 'encoding': 'utf8' })).to.equal('multiple_bar2');
      });
    });
  });

  describe('fetchAndInstall(url, dest, isManifest)', function () {
    var promise;

    before(function() {
      promise = DocumentDownloader.fetchAndInstall(server.location(), '/tmp/testechidna', false);
    });

    after(function(){
      Fs.unlinkSync('/tmp/testechidna/Overview.html');
      Fs.rmdirSync('/tmp/testechidna');
    });

    it('should be a function', function () {
      expect(DocumentDownloader.fetchAndInstall).to.be.a('function');
    });

    it('should return a promise', function () {
      expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should create the folder if it does not exist', function () {
      return promise.then(function() {
        expect(Fs.existsSync('/tmp/testechidna')).to.be.true;
      });
    });

    it('should create the file with proper content', function () {
      return promise.then(function() {
        expect(Fs.readFileSync('/tmp/testechidna/Overview.html', { 'encoding': 'utf8' })).to.contain("Echidna testbed");
      });
    });

    it('should reject if the resource does not exist', function () {
      var notFound = DocumentDownloader.fetchAndInstall(
        server.location() + '/et/si/tu/n/existais/pas',
        '/tmp/whatever',
        false
      );
      return expect(notFound).to.eventually.be.rejectedWith(/code 404/);
    });

    it('should reject if the server is not reachable', function () {
      var notReachable = DocumentDownloader.fetchAndInstall(
        'https://non-rien.de/rien',
        '/tmp/whatever',
        false
      );
      return expect(notReachable).to.eventually.be.rejectedWith(/network error/);
    });

    it('should read a manifest and install its content', function () {
      return DocumentDownloader.fetchAndInstall(
        server.getMetadata('navigation-timing-2').location + 'W3CTRMANIFEST',
        '/tmp/testechidnaManifest',
        true
      ).then(function() {
        expect(Fs.readFileSync('/tmp/testechidnaManifest/Overview.html', { 'encoding': 'utf8' })).to.contain("Navigation Timing 2");
        expect(Fs.existsSync('/tmp/testechidnaManifest/spec.css')).to.be.true;
        expect(Fs.existsSync('/tmp/testechidnaManifest/timing-overview.png')).to.be.true;

        Fs.unlinkSync('/tmp/testechidnaManifest/Overview.html');
        Fs.unlinkSync('/tmp/testechidnaManifest/spec.css');
        Fs.unlinkSync('/tmp/testechidnaManifest/timing-overview.png');
        Fs.rmdirSync('/tmp/testechidnaManifest');
      });
    });

    it('should read a manifest and install its content after spec generation',
       function () {
      return DocumentDownloader.fetchAndInstall(
        server.getMetadata('navigation-timing-2-generated').location +
          'W3CTRMANIFEST',
        '/tmp/testechidnaSpecGeneration',
        true
      ).then(function() {
        expect(Fs.readFileSync('/tmp/testechidnaSpecGeneration/Overview.html', { 'encoding': 'utf8' })).to.contain("Spec-generated Navigation Timing 2");
        expect(Fs.existsSync('/tmp/testechidnaSpecGeneration/spec.css')).to.be.true;
        expect(Fs.existsSync('/tmp/testechidnaSpecGeneration/timing-overview.png')).to.be.true;

        Fs.unlinkSync('/tmp/testechidnaSpecGeneration/Overview.html');
        Fs.unlinkSync('/tmp/testechidnaSpecGeneration/spec.css');
        Fs.unlinkSync('/tmp/testechidnaSpecGeneration/timing-overview.png');
        Fs.rmdirSync('/tmp/testechidnaSpecGeneration');
      });
    });

  });

  describe('getFilenames(manifestContent)', function () {
    it('should be a function', function () {
      expect(DocumentDownloader.getFilenames).to.be.a('function');
    });

    it('should return an immutable list', function () {
      expect(DocumentDownloader.getFilenames('')).to.be.an.instanceOf(List);
    });

    it('should return a list of string', function () {
      expect(DocumentDownloader.getFilenames('test').first()).to.be.a('string');
    });

    it('should read a well-formed manifest', function () {
      var manifest = [
        'index.html # This file will be used as `Overview.html`',
        '',
        '# Stylesheets',
        'css/screen.css',
        'css/print.css',
        '',
        '# Images',
        'img/image1.jpg',
        'img/image2.jpg'
      ].join('\n');

      var filenames = [
        'index.html',
        'css/screen.css',
        'css/print.css',
        'img/image1.jpg',
        'img/image2.jpg'
      ];

      expect(DocumentDownloader.getFilenames(manifest).toArray()).to.eql(filenames);
    });
  });

  describe('sanitize(list)', function () {
    it('should be a function', function () {
      expect(DocumentDownloader.sanitize).to.be.a('function');
    });

    it('should return an immutable list', function () {
      expect(DocumentDownloader.sanitize(List())).to.be.an.instanceOf(List);
    });

    it('should return a list of string', function () {
      expect(DocumentDownloader.sanitize(List('test')).first()).to.be.a('string');
    });

    it('should filter out .htaccess files', function () {
      expect(Immutable.is(DocumentDownloader.sanitize(List.of('allowed_file', '.htaccess')), List.of('allowed_file'))).to.be.true;
    });

    it('should filter out PHP files', function () {
      expect(Immutable.is(DocumentDownloader.sanitize(List.of('allowed_file', 'not_allowed.php')), List.of('allowed_file'))).to.be.true;
    });
  });
});

describe('SpecberusWrapper', function () {

  describe('validate(url)', function () {
    it('should be a function', function () {
      expect(SpecberusWrapper.validate).to.be.a('function');
    });

    var myDraft = server.getMetadata('navigation-timing-2');
    var content = SpecberusWrapper.validate(myDraft.location);

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise an object', function () {
      return expect(content).to.eventually.be.an.instanceOf(Object);
    });

    it('should promise an object with an error property', function () {
      return expect(content).to.eventually.have.property("errors");
    });

    it('should return an error property that is a list', function () {
      return expect(content).that.eventually.has.property("errors")
        .that.is.an.instanceOf(List);
    });

    it('should return an error property that is an empty list', function () {
      return expect(content).that.eventually.has.property("errors")
        .that.has.property('size', 0);
    });

    it('should promise an object with a metadata property', function () {
      return expect(content).to.eventually.have.property("metadata");
    });

    it('should return a metadata property that is a Map', function () {
      return expect(content).to.eventually.have.property("metadata")
          .that.is.an.instanceOf(Map);
    });

    it('should promise an object with the proper metadata.title', function () {
      return content.then(function (result) {
        expect(result.metadata.get("title")).to.equal(myDraft.title);
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should promise an object with the proper metadata.thisVersion', function () {
      return content.then(function (result) {
        expect(result.metadata.get("thisVersion")).to.equal(myDraft.thisVersion);
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should promise an object with the proper metadata.latestVersion', function () {
      return content.then(function (result) {
        expect(result.metadata.get("latestVersion")).to.equal(myDraft.latestVersion);
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should promise an object with the proper metadata.docDate', function () {
      return content.then(function (result) {
        expect(result.metadata.get("docDate")).to.be.a('Date');
        expect(result.metadata.get("docDate").toISOString()).to.equal(myDraft.docDate.toISOString());
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should promise an object with the proper metadata.process', function () {
      return content.then(function (result) {
        expect(result.metadata.get("process")).to.equal(myDraft.processURI);
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should promise an object with the proper metadata.editorsDraft', function () {
      return content.then(function (result) {
        expect(result.metadata.get("editorsDraft")).to.equal(myDraft.editorsDraft);
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should promise an object with the proper metadata.editorIDs', function () {
      return content.then(function (result) {
        expect(result.metadata.get("editorIDs")).to.deep.equal(myDraft.editorIDs);
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should promise an object with the proper metadata.deliverers', function () {
      return content.then(function (result) {
        expect(result.metadata.get("deliverers")).to.deep.equal(myDraft.deliverers);
      }, function (err) {
        console.log('error: ' + err);
      });
    });

  });

  describe('validate(url-with-css-errors)', function () {
    var content = SpecberusWrapper.validate(server.getMetadata('nav-csserror').location);

    it('should return an error property that has 2 errors', function () {
      return expect(content).that.eventually.has.property("errors")
        .that.has.property('size', 2);
    });
  });

  describe('validate(url-with-css-warnings)', function () {
    var content = SpecberusWrapper.validate(server.getMetadata('nav-csswarning').location);

    it('should return an error property that has no errors', function () {
      return expect(content).that.eventually.has.property("errors")
        .that.has.property('size', 0);
    });
  });
});

describe('TokenChecker', function () {

  describe('check(url, token)', function () {
    it('should be a function', function () {
      expect(TokenChecker.check).to.be.a('function');
    });

    var myDraft = server.getMetadata('navigation-timing-2');
    var token = "98345098A98F345F";
    var check = TokenChecker.check(myDraft.latestVersion, token);

    it('should return a promise', function () {
      expect(check).to.be.an.instanceOf(Promise);
    });

    it('should promise an object', function () {
      return expect(check).to.eventually.be.an.instanceOf(Object);
    });

    it('should promise an object with a token property', function () {
      return expect(check).to.eventually.have.property("token")
        .that.is.equals(token);
    });

    it('should promise an object with a source property', function () {
      return expect(check).to.eventually.have.property("source");
    });

    it('should promise an object with an authorized property', function () {
      return expect(check).to.eventually.have.property("authorized")
        .that.is.equals(true);
    });

  });
});
