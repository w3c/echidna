var expect = require("chai").use(require("chai-as-promised")).expect
,   Promise = require("promise")
,   Fs = require("fs")
,   List = require("immutable").List
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
    expect(content).to.be.an.instanceOf(Promise);
  });

  it('should promise a string', function () {
    return expect(content).to.eventually.be.a('string');
  });

  it('should download a file', function () {
    return expect(content).to.eventually.contain("Example Domain");
  });
});

describe('DocumentDownloader.fetchAll', function () {
  var content = downloader.fetchAll([
    'http://www.example.com/',
    'http://www.w3.org/'
  ]);

  it('should be a function', function () {
    expect(downloader.fetchAll).to.be.a('function');
  });

  it('should return a promise', function () {
    expect(content).to.be.an.instanceOf(Promise);
  });

  it('should promise an array', function () {
    return expect(content).to.eventually.be.a('array').of.length(2);
  });

  it('should fetch multiple URLs', function () {
    return content.then(function (content) {
      expect(content[0]).to.contain("Example Domain");
      expect(content[1]).to.contain("World Wide Web Consortium");
    });
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

describe('DocumentDownloader.installAll', function () {
  var promise;

  before(function() {
    promise = downloader.installAll([
      ['/tmp/multiple_foo1', 'multiple_bar1'],
      ['/tmp/multiple_foo2', 'multiple_bar2']
    ]);
  });

  it('should be a function', function () {
    expect(downloader.installAll).to.be.a('function');
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

describe('DocumentDownloader.getFilenames', function () {
  it('should be a function', function () {
    expect(downloader.getFilenames).to.be.a('function');
  });

  it('should return an immutable list', function () {
    expect(downloader.getFilenames('')).to.be.an.instanceOf(List);
  });

  it('should return a list of string', function () {
    expect(downloader.getFilenames("test").first()).to.be.a('string');
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

    expect(downloader.getFilenames(manifest).toArray()).to.eql(filenames);
  });
});
