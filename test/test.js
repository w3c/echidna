var expect = require("chai").use(require("chai-as-promised")).expect
,   Promise = require("promise")
,   Fs = require("fs")
;

var DocumentDownloader = require("../functions.js").DocumentDownloader
,   downloader = new DocumentDownloader()
;

describe('DocumentDownloader.fetch', function () {
  it('should be a function', function () {
    expect(downloader.fetch).to.be.a('function');
  });

  var content = downloader.fetch('http://www.example.com/');

  it('should return a promise', function () {
    return expect(content).to.be.an.instanceOf(Promise);
  });

  it('should promise a string', function () {
    return expect(content).to.eventually.be.a('string');
  });

  it('should download a file', function () {
    return expect(content).to.eventually.contain("Example Domain");
  });
});

describe('DocumentDownloader.install', function () {
  var promise;

  before(function() {
    promise = downloader.install('/tmp/foo', 'bar');
  });

  after(function(){
    Fs.unlinkSync('/tmp/foo');
  });

  it('should be a function', function () {
    expect(downloader.install).to.be.a('function');
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

describe('DocumentDownloader.fetchAndInstall', function () {
  var promise;

  before(function() {
    promise = downloader.fetchAndInstall('http://www.example.com/', '/tmp/testechidna');
  });

  after(function(){
    Fs.unlinkSync('/tmp/testechidna/Overview.html');
    Fs.rmdirSync('/tmp/testechidna');
  });

  it('should be a function', function () {
    expect(downloader.fetchAndInstall).to.be.a('function');
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
});
