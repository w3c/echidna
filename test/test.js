var expect = require("chai").use(require("chai-as-promised")).expect
,   Promise = require("promise")
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
