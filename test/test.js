// switch the environment into testing mode
process.env.NODE_ENV = 'dev';

var expect = require("chai").use(require("chai-as-promised")).expect
,   Promise = require("promise")
,   Fs = require("fs")
,   List = require("immutable").List
,   server = require("./lib/testserver")
;

server.start();

var DocumentDownloader = require("../functions.js").DocumentDownloader;

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
      return expect(content).to.eventually.contain("you got me");
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
      return expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should create the folder if it does not exist', function () {
      return promise.then(function() {
        expect(Fs.existsSync('/tmp/testechidna')).to.be.true;
      }, function (err) {
        console.log('error: ' + err);
      });
    });

    it('should create the file with proper content', function () {
      return promise.then(function() {
        expect(Fs.readFileSync('/tmp/testechidna/Overview.html', { 'encoding': 'utf8' })).to.contain("you got me");
      });
    });

    it('should read a manifest and install its content', function () {
      return DocumentDownloader.fetchAndInstall(
        server.location() + '/drafts/navigation-timing/W3CTRMANIFEST',
        '/tmp/testechidnaManifest',
        true)
        .then(function() {
          expect(Fs.readFileSync('/tmp/testechidnaManifest/Overview.html', { 'encoding': 'utf8' })).to.contain("Navigation Timing 2");
          expect(Fs.existsSync('/tmp/testechidnaManifest/spec.css')).to.be.true;
          expect(Fs.existsSync('/tmp/testechidnaManifest/timing-overview.png')).to.be.true;

          Fs.unlinkSync('/tmp/testechidnaManifest/Overview.html');
          Fs.unlinkSync('/tmp/testechidnaManifest/spec.css');
          Fs.unlinkSync('/tmp/testechidnaManifest/timing-overview.png');
          Fs.rmdirSync('/tmp/testechidnaManifest');
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
});

var SpecberusWrapper = require("../functions.js").SpecberusWrapper;

describe('SpecberusWrapper', function () {

  describe('validate(url)', function () {

    it('should be a function', function () {
      expect(SpecberusWrapper.validate).to.be.a('function');
    });

    var content = SpecberusWrapper.validate(server.location() + '/drafts/navigation-timing/');

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
          .that.has.property("size").that.equals(0);
    });

  });

  describe('validate(url-with-css-errors)', function () {

    var content = SpecberusWrapper.validate(server.location() +
            '/drafts/nav-csserror/');

    it('should return an error property that has 2 errors', function () {
      return expect(content).that.eventually.has.property("errors")
          .that.has.property("size").that.equals(2);
    });

  });

  describe('validate(url-with-css-warnings)', function () {

    var content = SpecberusWrapper.validate(server.location() +
            '/drafts/nav-csswarning/');

    it('should return an error property that has no errors', function () {
      return expect(content).that.eventually.has.property("errors")
          .that.has.property("size").that.equals(0);
    });

  });
});
