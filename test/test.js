var expect = require("chai").use(require("chai-as-promised")).expect
,   Promise = require("promise")
,   Fs = require("fs")
,   List = require("immutable").List
;

var DocumentDownloader = require("../functions.js").DocumentDownloader;

describe('DocumentDownloader', function () {

  describe('fetch(url)', function () {
    it('should be a function', function () {
      expect(DocumentDownloader.fetch).to.be.a('function');
    });

    var content = DocumentDownloader.fetch('http://www.example.com/');

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a string', function () {
      return expect(content).to.eventually.be.a('string');
    });

    it('should download a file', function () {
      return expect(content).to.eventually.contain("Example Domain");
    });
  });

  describe('fetchAll(urls)', function () {
    var content = DocumentDownloader.fetchAll(List.of(
      'http://www.example.com/',
      'http://www.w3.org/'
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
        expect(content.get(0)).to.contain("Example Domain");
        expect(content.get(1)).to.contain("World Wide Web Consortium");
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
      promise = DocumentDownloader.fetchAndInstall('http://www.example.com/', '/tmp/testechidna', false);
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
        expect(Fs.readFileSync('/tmp/testechidna/Overview.html', { 'encoding': 'utf8' })).to.contain("Example Domain");
      });
    });

    it('should read a manifest and install its content', function () {
      return DocumentDownloader.fetchAndInstall('http://jay.w3.org/~plehegar/navigation-timing/W3CTRMANIFEST', '/tmp/testechidnaManifest', true)
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
