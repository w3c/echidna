'use strict';

// Switch the environment into testing mode
process.env.NODE_ENV = 'dev';

var chai = require('chai');
var chaiImmutable = require('chai-immutable');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiImmutable);
chai.use(chaiAsPromised);

var Promise = require('promise');
var Fs = require('fs');
var Immutable = require('immutable');
var List = Immutable.List;
var Map = Immutable.Map;

require('../config.js');

var server = require('./lib/testserver');
var FakeHttpServices = require('./lib/fake-http-services');
var CreatedService = FakeHttpServices.CreatedService;
var BadRequestService = FakeHttpServices.BadRequestService;
var NotImplementedService = FakeHttpServices.NotImplementedService;
var ServerErrorService = FakeHttpServices.ServerErrorService;

// Used by the TokenChecker
global.TOKEN_ENDPOINT = server.location() + '/authorize';
global.USERNAME = 'toto';
global.PASSWORD = 'secret';

var DocumentDownloader = require('../lib/document-downloader');
var Publisher = require('../lib/publisher');
var SpecberusWrapper = require('../functions.js').SpecberusWrapper;
var TokenChecker = require('../functions.js').TokenChecker;

function readFileSyncUtf8(file) {
  return Fs.readFileSync(file, { encoding: 'utf8' });
}

describe('DocumentDownloader', function () {
  describe('fetch(url)', function () {
    it('should be a function', function () {
      expect(DocumentDownloader.fetch).to.be.a('function');
    });

    var content = DocumentDownloader.fetch(server.location());

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a Buffer', function () {
      return expect(content).to.eventually.be.an.instanceOf(Buffer);
    });

    it('should download a file', function () {
      return expect(content.then(function (s) { return s.toString('utf8'); }))
        .to.eventually.contain('Echidna testbed');
    });

    it('should reject if the resource does not exist', function () {
      var notFound = DocumentDownloader.fetch(
        server.location() + '/et/si/tu/n/existais/pas'
      );

      return expect(notFound).to.eventually.be.rejectedWith(/code 404/);
    });

    it('should reject if the server is not reachable', function () {
      var notReachable = DocumentDownloader.fetch('http://youdbetternotexist/');

      return expect(notReachable)
        .to.eventually.be.rejectedWith(/network error/);
    });
  });

  describe('fetchAll(urls)', function () {
    var content = DocumentDownloader.fetchAll(List.of(
      server.location() + '/robots',
      server.location() + '/elvis'
    ));

    it('should be a function', function () {
      expect(DocumentDownloader.fetchAll).to.be.a('function');
    });

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a List of size 2', function () {
      return expect(content).to.eventually.be.an.instanceOf(List).of.size(2);
    });

    it('should fetch multiple URLs', function () {
      return content.then(function (content) {
        expect(content.get(0).toString('utf8')).to.contain('looking for');
        expect(content.get(1).toString('utf8')).to.contain('alive');
      });
    });
  });

  describe('install(dest, content)', function () {
    var promise;

    before(function () {
      promise = DocumentDownloader.install('/tmp/foo', 'bar');
    });

    after(function () {
      Fs.unlinkSync('/tmp/foo');
    });

    it('should be a function', function () {
      expect(DocumentDownloader.install).to.be.a('function');
    });

    it('should return a promise', function () {
      return expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should create the file with proper content', function () {
      return promise.then(function () {
        expect(readFileSyncUtf8('/tmp/foo')).to.equal('bar');
      });
    });
  });

  describe('installAll(dests, contents)', function () {
    var promise;

    before(function () {
      promise = DocumentDownloader.installAll(List.of(
        ['/tmp/multiple_foo1', 'multiple_bar1'],
        ['/tmp/multiple_foo2', 'multiple_bar2']
      ));
    });

    after(function () {
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
      return promise.then(function () {
        expect(readFileSyncUtf8('/tmp/multiple_foo1'))
          .to.equal('multiple_bar1');
        expect(readFileSyncUtf8('/tmp/multiple_foo2'))
          .to.equal('multiple_bar2');
      });
    });
  });

  describe('fetch(url) then install(dest, content)', function () {
    it('should install binaries as-is', function () {
      var srcPath = '/drafts/navigation-timing-2/timing-overview.png';
      var destPath = '/tmp/testimage.png';

      return DocumentDownloader.fetch(server.location() + srcPath)
        .then(function (content) {
          return DocumentDownloader.install(destPath, content);
        })
        .then(function () {
          var file1 = Fs.readFileSync('test' + srcPath);
          var file2 = Fs.readFileSync(destPath);

          return expect(file1).to.deep.equal(file2);
        })
        .catch(function (e) {
          e.showDiff = false;
          throw e;
        });
    });
  });

  describe('fetchAndInstall(url, dest)', function () {
    var promise;

    before(function () {
      promise = DocumentDownloader.fetchAndInstall(
        server.location(),
        '/tmp/testechidna'
      );
    });

    after(function () {
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
      return promise.then(function () {
        expect(Fs.existsSync('/tmp/testechidna')).to.be.true;
      });
    });

    it('should create the file with proper content', function () {
      return promise.then(function () {
        expect(readFileSyncUtf8('/tmp/testechidna/Overview.html'))
          .to.contain('Echidna testbed');
      });
    });

    it('should reject if the resource does not exist', function () {
      var notFound = DocumentDownloader.fetchAndInstall(
        server.location() + '/et/si/tu/n/existais/pas',
        '/tmp/whatever'
      );

      return expect(notFound).to.eventually.be.rejectedWith(/code 404/);
    });

    it('should reject if the server is not reachable', function () {
      var notReachable = DocumentDownloader.fetchAndInstall(
        'https://non-rien.de/rien',
        '/tmp/whatever'
      );

      return expect(notReachable)
        .to.eventually.be.rejectedWith(/network error/);
    });

    it('should read a manifest and install its content', function () {
      return DocumentDownloader.fetchAndInstall(
        server.getMetadata('navigation-timing-2').location + 'W3CTRMANIFEST',
        '/tmp/testechidnaManifest'
      ).then(function () {
        expect(readFileSyncUtf8('/tmp/testechidnaManifest/Overview.html'))
          .to.contain('Navigation Timing 2');
        expect(Fs.existsSync('/tmp/testechidnaManifest/spec.css')).to.be.true;
        expect(Fs.existsSync('/tmp/testechidnaManifest/timing-overview.png'))
          .to.be.true;

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
        '/tmp/testechidnaSpecGeneration'
      ).then(function () {
        expect(readFileSyncUtf8('/tmp/testechidnaSpecGeneration/Overview.html'))
          .to.contain('Spec-generated Navigation Timing 2');
        expect(Fs.existsSync('/tmp/testechidnaSpecGeneration/spec.css'))
          .to.be.true;
        expect(Fs.existsSync(
          '/tmp/testechidnaSpecGeneration/timing-overview.png'
        )).to.be.true;

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

      var filenames = List.of(
        'index.html',
        'css/screen.css',
        'css/print.css',
        'img/image1.jpg',
        'img/image2.jpg'
      );

      expect(DocumentDownloader.getFilenames(manifest)).to.equal(filenames);
    });
  });

  describe('isAllowed(filename)', function () {
    it('should be a function', function () {
      expect(DocumentDownloader.isAllowed).to.be.a('function');
    });

    it('should return a boolean', function () {
      expect(DocumentDownloader.isAllowed('')).to.be.a('boolean');
    });

    it('should filter not filter out HTML files', function () {
      expect(DocumentDownloader.isAllowed('index.html')).to.be.true;
    });

    it('should filter out .htaccess files', function () {
      expect(DocumentDownloader.isAllowed('.htaccess')).to.be.false;
    });

    it('should filter out PHP files', function () {
      expect(DocumentDownloader.isAllowed('not_allowed.php')).to.be.false;
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
      return expect(content).to.eventually.have.property('errors');
    });

    it('should return an error property that is a list', function () {
      return expect(content).that.eventually.has.property('errors')
        .that.is.an.instanceOf(List);
    });

    it('should return an error property that is an empty list', function () {
      return expect(content).that.eventually.has.property('errors')
        .that.has.size(1);
    });

    it('should promise an object with a metadata property', function () {
      return expect(content).to.eventually.have.property('metadata');
    });

    it('should return a metadata property that is a Map', function () {
      return expect(content).to.eventually.have.property('metadata')
          .that.is.an.instanceOf(Map);
    });

    it('should promise the proper metadata.title', function () {
      return content.then(function (result) {
        expect(result.metadata.get('title')).to.equal(myDraft.title);
      });
    });

    it('should promise the proper metadata.thisVersion', function () {
      return content.then(function (result) {
        expect(result.metadata.get('thisVersion'))
          .to.equal(myDraft.thisVersion);
      });
    });

    it('should promise the proper metadata.latestVersion', function () {
      return content.then(function (result) {
        expect(result.metadata.get('latestVersion'))
          .to.equal(myDraft.latestVersion);
      });
    });

    it('should promise the proper metadata.docDate', function () {
      return content.then(function (result) {
        expect(result.metadata.get('docDate')).to.be.an.instanceOf(Date);
        expect(result.metadata.get('docDate').toISOString())
          .to.equal(myDraft.docDate.toISOString());
      });
    });

    it('should promise the proper metadata.process', function () {
      return content.then(function (result) {
        expect(result.metadata.get('process')).to.equal(myDraft.processURI);
      });
    });

    it('should promise the proper metadata.editorsDraft', function () {
      return content.then(function (result) {
        expect(result.metadata.get('editorsDraft'))
          .to.equal(myDraft.editorsDraft);
      });
    });

    it('should promise the proper metadata.editorIDs', function () {
      return content.then(function (result) {
        expect(result.metadata.get('editorIDs'))
          .to.deep.equal(myDraft.editorIDs);
      });
    });

    it('should promise the proper metadata.deliverers', function () {
      return content.then(function (result) {
        expect(result.metadata.get('deliverers'))
          .to.deep.equal(myDraft.deliverers);
      });
    });
  });

  describe('validate(url-with-css-errors)', function () {
    var content = SpecberusWrapper.validate(
      server.getMetadata('nav-csserror').location
    );

    it('should return an error property that has 2 errors', function () {
      return expect(content).that.eventually.has.property('errors')
        .that.has.size(3);
    });
  });

  describe('validate(url-with-css-warnings)', function () {
    var content = SpecberusWrapper.validate(
      server.getMetadata('nav-csswarning').location
    );

    it('should return an error property that has no errors', function () {
      return expect(content).that.eventually.has.property('errors')
        .that.has.size(1);
    });
  });
});

describe('TokenChecker', function () {
  describe('check(url, token)', function () {
    it('should be a function', function () {
      expect(TokenChecker.check).to.be.a('function');
    });

    var myDraft = server.getMetadata('navigation-timing-2');
    var token = '98345098A98F345F';
    var check = TokenChecker.check(myDraft.latestVersion, token);

    it('should return a promise', function () {
      expect(check).to.be.an.instanceOf(Promise);
    });

    it('should promise an object', function () {
      return expect(check).to.eventually.be.an.instanceOf(Object);
    });

    it('should promise an object with a token property', function () {
      return expect(check).to.eventually.have.property('token')
        .that.equals(token);
    });

    it('should promise an object with a source property', function () {
      return expect(check).to.eventually.have.property('source');
    });

    it('should promise an object with an authorized property', function () {
      return expect(check).to.eventually.have.property('authorized')
        .that.is.true;
    });
  });
});

describe('Publisher', function () {
  var metadata = new Map({});

  describe('publish(metadata)', function () {
    var promise = new Publisher(new CreatedService()).publish(metadata);

    it('should return a promise', function () {
      expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should promise an array', function () {
      return expect(promise).to.eventually.be.an.instanceOf(List);
    });

    it('should return no errors if publication is successful', function () {
      return expect(promise).to.eventually.be.empty;
    });

    it('should return errors when the publication has failed', function () {
      var errPromise = new Publisher(new BadRequestService()).publish(metadata);

      return expect(errPromise).to.eventually.have.size(1);
    });

    it('should reject if not yet implemented', function () {
      var rejectPromise = new Publisher(
        new NotImplementedService()
      ).publish(metadata);

      return expect(rejectPromise)
        .to.eventually.be.rejectedWith(/Not Implemented/);
    });

    it('should reject if the remote server is having an issue', function () {
      var rejectPromise = new Publisher(
        new ServerErrorService()
      ).publish(metadata);

      return expect(rejectPromise)
        .to.eventually.be.rejectedWith(/code 500/);
    });
  });
});
