/**
 * @module
 */

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
var SpecberusWrapper = require('../lib/specberus-wrapper');
var TokenChecker = require('../lib/token-checker');
var UserChecker = require('../lib/user-checker');

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

    it('should read a tarball and install its content', function () {
      return DocumentDownloader.fetchAndInstall(
        server.location() + '/drafts/frame-timing.tar',
        '/tmp/testechidnaTarball'
      ).then(function () {
        expect(readFileSyncUtf8('/tmp/testechidnaTarball/Overview.html'))
          .to.contain('Frame Timing');

        Fs.unlinkSync('/tmp/testechidnaTarball/Overview.html');
        Fs.rmdirSync('/tmp/testechidnaTarball');
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

    it('should filter out paths trying to go to parents', function () {
      expect(DocumentDownloader.isAllowed('../../../etc/passwd')).to.be.false;
    });
  });
});

describe('SpecberusWrapper', function () {
  describe('validate(url)', function () {
    it('should be a function', function () {
      expect(SpecberusWrapper.validate).to.be.a('function');
    });

    var myDraft = server.getMetadata('navigation-timing-2');
    var content = SpecberusWrapper.validate(myDraft.location,
                                            myDraft.status,
                                            myDraft.rectrack);

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

    /* @todo: rethink this test to avoid manual changes every time the spec is updated
       https://github.com/w3c/echidna/commits/master/test/drafts/navigation-timing-2/meta.json

    it('should return an error property that is an empty list', function () {
      return expect(content).that.eventually.has.property('errors')
        .that.is.empty;
    });
    */

    it('should promise an object with a metadata property', function () {
      return expect(content).to.eventually.have.property('metadata');
    });

    it('should return a metadata property that is a Map', function () {
      return expect(content).to.eventually.have.property('metadata')
          .that.is.an.instanceOf(Map);
    });
  });

  describe('validate(url-with-css-errors)', function () {
    var content = SpecberusWrapper.validate(
      server.getMetadata('nav-csserror').location,
      server.getMetadata('nav-csserror').status,
      server.getMetadata('nav-csserror').rectrack
    );

    it('should return an error property that has 3 errors', function () {
      return expect(content).that.eventually.has.property('errors')
        .that.has.size(3);
    });
  });

  describe('validate(url-with-css-warnings)', function () {
    var content = SpecberusWrapper.validate(
      server.getMetadata('nav-csswarning').location,
      server.getMetadata('nav-csswarning').status,
      server.getMetadata('nav-csswarning').rectrack
    );

    it('should return an error property that has 1 error', function () {
      return expect(content).that.eventually.has.property('errors')
        .that.has.size(1);
    });
  });

  describe('extractMetadata(url)', function () {
    it('should be a function', function () {
      expect(SpecberusWrapper.extractMetadata).to.be.a('function');
    });

    var myDraft = server.getMetadata('navigation-timing-2');
    var content = SpecberusWrapper.extractMetadata(myDraft.location,
                                                   myDraft.status);

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise an object', function () {
      return expect(content).to.eventually.be.an.instanceOf(Object);
    });

    it('should promise an object with a profile property', function () {
      return expect(content).to.eventually.have.property('profile');
    });

    it('should return an object with a delivererIDs property that is an array',
      function () {
        return expect(content).that.eventually.has.property('delivererIDs')
          .that.is.an.instanceOf(Array);
      });

    it('should promise an object with a rectrack property', function () {
      return expect(content).to.eventually.have.property('rectrack');
    });

    it('should promise the proper profile property', function () {
      return content.then(function (result) {
        expect(result.profile).to.equal(myDraft.status);
      });
    });

    it('should promise the proper delivererIDs', function () {
      return content.then(function (result) {
        expect(result.delivererIDs.length).to.equal(1);
        expect(result.delivererIDs[0]).to.equal(myDraft.groupID);
      });
    });

    it('should promise the proper rectrack property', function () {
      return content.then(function (result) {
        expect(result.rectrack).to.equal(myDraft.rectrack);
      });
    });

    it('should promise the proper metadata.title', function () {
      return content.then(function (result) {
        expect(result.title).to.equal(myDraft.title);
      });
    });

    it('should promise the proper metadata.thisVersion', function () {
      return content.then(function (result) {
        expect(result.thisVersion).to.equal(myDraft.thisVersion);
      });
    });

    it('should promise the proper metadata.latestVersion', function () {
      return content.then(function (result) {
        expect(result.latestVersion).to.equal(myDraft.latestVersion);
      });
    });

    it('should promise the proper metadata.docDate', function () {
      return content.then(function (result) {
        const expected = myDraft.docDate.getFullYear() + '-' +
            (myDraft.docDate.getMonth() + 1) + '-' +
            myDraft.docDate.getDate();

        expect(result.docDate).to.be.a('string');
        expect(result.docDate).to.equal(expected);
      });
    });

    it('should promise the proper metadata.process', function () {
      return content.then(function (result) {
        expect(result.process).to.equal(myDraft.processURI);
      });
    });

    it('should promise the proper metadata.editorsDraft', function () {
      return content.then(function (result) {
        expect(result.editorsDraft).to.equal(myDraft.editorsDraft);
      });
    });

    it('should promise the proper metadata.editorIDs', function () {
      return content.then(function (result) {
        expect(result.editorIDs).to.deep.equal(myDraft.editorIDs);
      });
    });
  });

  describe('extractMetadata(url) for non-rectrack doc', function () {
    var myDraft = server.getMetadata('charmod-norm');
    var content = SpecberusWrapper.extractMetadata(myDraft.location,
                                                   myDraft.status);

    it('should promise the proper rectrack property', function () {
      return content.then(function (result) {
        expect(result.rectrack).to.equal(myDraft.rectrack);
      });
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
    var source = 'TEST';
    var check = TokenChecker.check(myDraft.latestVersion, token, source);

    it('should return a promise', function () {
      expect(check).to.be.an.instanceOf(Promise);
    });

    it('should promise a list', function () {
      return expect(check).to.eventually.be.an.instanceOf(List);
    });
  });
});

describe('UserChecker', function () {
  describe('check(user, delivererIDs)', function () {
    it('should be a function', function () {
      expect(UserChecker.check).to.be.a('function');
    });

    var myDraft = server.getMetadata('navigation-timing-2');
    var user = {
      memberOf: [
        'cn=123,ou=groups,dc=w3,dc=org',
        'cn=456,ou=groups,dc=w3,dc=org',
        'cn=' + myDraft.groupID + ',ou=groups,dc=w3,dc=org'
      ]
    };
    var delivererIDs = [myDraft.groupID];
    var content = UserChecker.check(user, delivererIDs);

    it('should return a promise', function () {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a list', function () {
      return expect(content).to.eventually.be.an.instanceOf(List);
    });

    it('should promise an empty list', function () {
      return content.then(function (result) {
        expect(result.isEmpty()).to.be.true;
      });
    });
  });

  describe('check(user, delivererIDs) deny', function () {
    var myDraft = server.getMetadata('navigation-timing-2');
    var user = {
      memberOf: [
        'cn=123,ou=groups,dc=w3,dc=org',
        'cn=456,ou=groups,dc=w3,dc=org'
      ]
    };
    var delivererIDs = [myDraft.groupID];
    var content = UserChecker.check(user, delivererIDs);

    it('should promise an non-empty list', function () {
      return content.then(function (result) {
        expect(result.isEmpty()).to.be.false;
      });
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
