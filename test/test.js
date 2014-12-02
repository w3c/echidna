var expect = require("chai").use(require("chai-as-promised")).expect
,   Promise = require("promise")
,   Fs = require("fs")
;

var downloadFile = require("../functions.js").downloadFile;

describe('downloadFile', function () {
  it('should be a function', function () {
    expect(downloadFile).to.be.a('function');
  });

  var content = downloadFile('http://www.example.com/');

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

var temporaryInstall = require("../functions.js").temporaryInstall;

describe('temporaryInstall', function () {
  var promise;

  before(function() {
    promise = temporaryInstall('foo', 'bar');
  });

  after(function(){
    Fs.unlinkSync('/tmp/foo');
  });

  it('should be a function', function () {
    expect(temporaryInstall).to.be.a('function');
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
