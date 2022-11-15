/**
 * @module
 */

'use strict';

// Switch the environment into testing mode
process.env.NODE_ENV = 'dev';

const chai = require('chai');
const chaiImmutable = require('chai-immutable');

const { expect } = chai;
const chaiAsPromised = require('chai-as-promised');

chai.use(chaiImmutable);
chai.use(chaiAsPromised);

const Promise = require('promise');
const Fs = require('fs');
const Immutable = require('immutable');

const { List } = Immutable;
const { Map } = Immutable;
let pendingTests = 6;

require('../config-dev.js');

const server = require('./lib/testserver');
const FakeHttpServices = require('./lib/fake-http-services');

const { CreatedService } = FakeHttpServices;
const { BadRequestService } = FakeHttpServices;
const { NotImplementedService } = FakeHttpServices;
const { ServerErrorService } = FakeHttpServices;

// Used by the TokenChecker
global.TOKEN_ENDPOINT = `${server.location()}/authorize`;
global.USERNAME = 'toto';
global.PASSWORD = 'secret';

const DocumentDownloader = require('../lib/document-downloader');
const Publisher = require('../lib/publisher');
const SpecberusWrapper = require('../lib/specberus-wrapper');
const TokenChecker = require('../lib/token-checker');
const UserChecker = require('../lib/user-checker');
const IPChecker = require('../lib/ip-checker.js');

function readFileSyncUtf8(file) {
  return Fs.readFileSync(file, { encoding: 'utf8' });
}

const trackProgress = () => {
  if (--pendingTests === 0) server.close();
};

describe('DocumentDownloader', () => {
  describe('fetch(url)', () => {
    it('should be a function', () => {
      expect(DocumentDownloader.fetch).to.be.a('function');
    });

    const content = DocumentDownloader.fetch(server.location());

    it('should return a promise', () => {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a Buffer', () =>
      expect(content).to.eventually.be.an.instanceOf(Buffer));

    it('should download a file', () =>
      expect(content.then(s => s.toString('utf8'))).to.eventually.contain(
        'Echidna testbed',
      ));

    it('should reject if the resource does not exist', () => {
      const notFound = DocumentDownloader.fetch(
        `${server.location()}/et/si/tu/n/existais/pas`,
      );

      return expect(notFound).to.eventually.be.rejectedWith(/code 404/);
    });

    it('should reject if the server is not reachable', () => {
      const notReachable = DocumentDownloader.fetch(
        'http://youdbetternotexist/',
      );

      return expect(notReachable).to.eventually.be.rejectedWith(
        /network error/,
      );
    });
  });

  describe('fetchAll(urls)', () => {
    const content = DocumentDownloader.fetchAll(
      List.of(`${server.location()}/robots`, `${server.location()}/elvis`),
    );

    it('should be a function', () => {
      expect(DocumentDownloader.fetchAll).to.be.a('function');
    });

    it('should return a promise', () => {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a List of size 2', () =>
      expect(content).to.eventually.be.an.instanceOf(List).of.size(2));

    it('should fetch multiple URLs', () =>
      content.then(content => {
        expect(content.get(0).toString('utf8')).to.contain('looking for');
        expect(content.get(1).toString('utf8')).to.contain('alive');
      }));
  });

  describe('install(dest, content)', () => {
    let promise;

    before(() => {
      promise = DocumentDownloader.install('/tmp/foo', 'bar');
    });

    after(() => {
      Fs.unlinkSync('/tmp/foo');
    });

    it('should be a function', () => {
      expect(DocumentDownloader.install).to.be.a('function');
    });

    it('should return a promise', () =>
      expect(promise).to.be.an.instanceOf(Promise));

    it('should create the file with proper content', () =>
      promise.then(() => {
        expect(readFileSyncUtf8('/tmp/foo')).to.equal('bar');
      }));
  });

  describe('installAll(dests, contents)', () => {
    let promise;

    before(() => {
      promise = DocumentDownloader.installAll(
        List.of(
          ['/tmp/multiple_foo1', 'multiple_bar1'],
          ['/tmp/multiple_foo2', 'multiple_bar2'],
        ),
      );
    });

    after(() => {
      Fs.unlinkSync('/tmp/multiple_foo1');
      Fs.unlinkSync('/tmp/multiple_foo2');
    });

    it('should be a function', () => {
      expect(DocumentDownloader.installAll).to.be.a('function');
    });

    it('should return a promise', () =>
      expect(promise).to.be.an.instanceOf(Promise));

    it('should create multiple files with proper contents', () =>
      promise.then(() => {
        expect(readFileSyncUtf8('/tmp/multiple_foo1')).to.equal(
          'multiple_bar1',
        );
        expect(readFileSyncUtf8('/tmp/multiple_foo2')).to.equal(
          'multiple_bar2',
        );
      }));
  });

  describe('fetch(url) then install(dest, content)', () => {
    it('should install binaries as-is', () => {
      const srcPath = '/drafts/navigation-timing-2/timing-overview.png';
      const destPath = '/tmp/testimage.png';

      return DocumentDownloader.fetch(server.location() + srcPath)
        .then(content => DocumentDownloader.install(destPath, content))
        .then(() => {
          const file1 = Fs.readFileSync(`test${srcPath}`);
          const file2 = Fs.readFileSync(destPath);

          return expect(file1).to.deep.equal(file2);
        })
        .catch(e => {
          e.showDiff = false;
          throw e;
        });
    });
  });

  describe('fetchAndInstall(url, dest)', () => {
    let promise;

    before(() => {
      promise = DocumentDownloader.fetchAndInstall(
        server.location(),
        '/tmp/testechidna',
      );
    });

    after(() => {
      Fs.unlinkSync('/tmp/testechidna/Overview.html');
      Fs.rmdirSync('/tmp/testechidna');
    });

    it('should be a function', () => {
      expect(DocumentDownloader.fetchAndInstall).to.be.a('function');
    });

    it('should return a promise', () => {
      expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should create the folder if it does not exist', () =>
      promise.then(() => {
        expect(Fs.existsSync('/tmp/testechidna')).to.be.true;
      }));

    it('should create the file with proper content', () =>
      promise.then(() => {
        expect(readFileSyncUtf8('/tmp/testechidna/Overview.html')).to.contain(
          'Echidna testbed',
        );
      }));

    it('should reject if the resource does not exist', () => {
      const notFound = DocumentDownloader.fetchAndInstall(
        `${server.location()}/et/si/tu/n/existais/pas`,
        '/tmp/whatever',
      );

      return expect(notFound).to.eventually.be.rejectedWith(/code 404/);
    });

    it('should reject if the server is not reachable', () => {
      const notReachable = DocumentDownloader.fetchAndInstall(
        'https://non-rien.de/rien',
        '/tmp/whatever',
      );

      return expect(notReachable).to.eventually.be.rejectedWith(
        /network error/,
      );
    });

    it('should read a manifest and install its content', () =>
      DocumentDownloader.fetchAndInstall(
        `${server.getMetadata('navigation-timing-2').location}W3CTRMANIFEST`,
        '/tmp/testechidnaManifest',
      ).then(() => {
        expect(
          readFileSyncUtf8('/tmp/testechidnaManifest/Overview.html'),
        ).to.contain('Navigation Timing 2');
        expect(Fs.existsSync('/tmp/testechidnaManifest/spec.css')).to.be.true;
        expect(Fs.existsSync('/tmp/testechidnaManifest/timing-overview.png')).to
          .be.true;

        Fs.unlinkSync('/tmp/testechidnaManifest/Overview.html');
        Fs.unlinkSync('/tmp/testechidnaManifest/spec.css');
        Fs.unlinkSync('/tmp/testechidnaManifest/timing-overview.png');
        Fs.rmdirSync('/tmp/testechidnaManifest');
      }));

    it('should read a manifest and install its content after spec generation', () =>
      DocumentDownloader.fetchAndInstall(
        `${
          server.getMetadata('navigation-timing-2-generated').location
        }W3CTRMANIFEST`,
        '/tmp/testechidnaSpecGeneration',
      ).then(() => {
        expect(
          readFileSyncUtf8('/tmp/testechidnaSpecGeneration/Overview.html'),
        ).to.contain('Spec-generated Navigation Timing 2');
        expect(Fs.existsSync('/tmp/testechidnaSpecGeneration/spec.css')).to.be
          .true;
        expect(
          Fs.existsSync('/tmp/testechidnaSpecGeneration/timing-overview.png'),
        ).to.be.true;

        Fs.unlinkSync('/tmp/testechidnaSpecGeneration/Overview.html');
        Fs.unlinkSync('/tmp/testechidnaSpecGeneration/spec.css');
        Fs.unlinkSync('/tmp/testechidnaSpecGeneration/timing-overview.png');
        Fs.rmdirSync('/tmp/testechidnaSpecGeneration');
      }));

    it('should read a tarball and install its content', () =>
      DocumentDownloader.fetchAndInstall(
        `${server.location()}/drafts/frame-timing.tar`,
        '/tmp/testechidnaTarball',
      ).then(() => {
        expect(
          readFileSyncUtf8('/tmp/testechidnaTarball/Overview.html'),
        ).to.contain('Frame Timing');

        Fs.unlinkSync('/tmp/testechidnaTarball/Overview.html');
        Fs.rmdirSync('/tmp/testechidnaTarball');
      }));
  });

  describe('getFilenames(manifestContent)', () => {
    it('should be a function', () => {
      expect(DocumentDownloader.getFilenames).to.be.a('function');
    });

    it('should return an immutable list', () => {
      expect(DocumentDownloader.getFilenames('')).to.be.an.instanceOf(List);
    });

    it('should return a list of string', () => {
      expect(DocumentDownloader.getFilenames('test').first()).to.be.a('string');
    });

    it('should read a well-formed manifest', () => {
      const manifest = [
        'index.html # This file will be used as `Overview.html`',
        '',
        '# Stylesheets',
        'css/screen.css',
        'css/print.css',
        '',
        '# Images',
        'img/image1.jpg',
        'img/image2.jpg',
      ].join('\n');

      const filenames = List.of(
        'index.html',
        'css/screen.css',
        'css/print.css',
        'img/image1.jpg',
        'img/image2.jpg',
      );

      expect(DocumentDownloader.getFilenames(manifest)).to.equal(filenames);
    });
  });

  describe('isAllowed(filename)', () => {
    it('should be a function', () => {
      expect(DocumentDownloader.isAllowed).to.be.a('function');
    });

    it('should return a boolean', () => {
      expect(DocumentDownloader.isAllowed('')).to.be.a('boolean');
    });

    it('should filter not filter out HTML files', () => {
      expect(DocumentDownloader.isAllowed('index.html')).to.be.true;
    });

    it('should filter out .htaccess files', () => {
      expect(DocumentDownloader.isAllowed('.htaccess')).to.be.false;
    });

    it('should filter out PHP files', () => {
      expect(DocumentDownloader.isAllowed('not_allowed.php')).to.be.false;
    });

    it('should filter out paths trying to go to parents', () => {
      expect(DocumentDownloader.isAllowed('../../../etc/passwd')).to.be.false;
    });
  });

  after(trackProgress);
});

describe('SpecberusWrapper', () => {
  describe('get Specberus version()', async () => {
    const version = await SpecberusWrapper.version();
    it('should be a format of semantic versioning', () => {
      expect(version).to.eventually.match(/\d+.\d+.\d+/);
    });
  });

  describe('validate(url)', () => {
    it('should be a function', () => {
      expect(SpecberusWrapper.validate).to.be.a('function');
    });

    const myDraft = server.getMetadata('navigation-timing-2');

    const metadata = new Map({
      profile: myDraft.status,
      patentPolicy: myDraft.patentPolicy,
    });
    const content = SpecberusWrapper.validate(myDraft.location, metadata);

    it('should return a promise', () => {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise an object', () =>
      expect(content).to.eventually.be.an.instanceOf(Object));

    it('should promise an object with an error property', () =>
      expect(content).to.eventually.have.property('errors'));

    it('should return an error property that is a list', () =>
      expect(content)
        .that.eventually.has.property('errors')
        .that.is.an.instanceOf(List));

    it('should promise an object with a metadata property', () =>
      expect(content).to.eventually.have.property('metadata'));

    it('should return a metadata property that is a Map', () =>
      expect(content)
        .to.eventually.have.property('metadata')
        .that.is.an.instanceOf(Map));
  });

  describe('validate(url-with-css-errors)', () => {
    const metadata = new Map({
      profile: server.getMetadata('nav-csserror').status,
      patentPolicy: server.getMetadata('nav-csserror').patentPolicy,
    });
    const content = SpecberusWrapper.validate(
      server.getMetadata('nav-csserror').location,
      metadata,
    );

    it('should return an error property that has 3 errors', () =>
      expect(content).that.eventually.has.property('errors').that.has.size(3));
  });

  describe('validate(url-with-css-warnings)', () => {
    const metadata = new Map({
      profile: server.getMetadata('nav-csswarning').status,
      patentPolicy: server.getMetadata('nav-csswarning').patentPolicy,
    });
    const content = SpecberusWrapper.validate(
      server.getMetadata('nav-csswarning').location,
      metadata,
    );

    it('should return an error property that has 3 error', () =>
      expect(content).that.eventually.has.property('errors').that.has.size(3));
  });

  describe('extractMetadata(url)', () => {
    it('should be a function', () => {
      expect(SpecberusWrapper.extractMetadata).to.be.a('function');
    });

    const myDraft = server.getMetadata('navigation-timing-2');
    const content = SpecberusWrapper.extractMetadata(
      myDraft.location,
      myDraft.status,
    );

    it('should return a promise', () => {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise an object', () =>
      expect(content).to.eventually.be.an.instanceOf(Object));

    it('should promise an object with a profile property', () =>
      expect(content).to.eventually.have.property('profile'));

    it('should return an object with a delivererIDs property that is an array', () =>
      expect(content)
        .that.eventually.has.property('delivererIDs')
        .that.is.an.instanceOf(Array));

    it('should promise an object with a rectrack property', () =>
      expect(content).to.eventually.have.property('rectrack'));

    it('should promise the proper profile property', () =>
      content.then(result => {
        expect(result.profile).to.equal(myDraft.status);
      }));

    it('should promise the proper delivererIDs', () =>
      content.then(result => {
        expect(result.delivererIDs.length).to.equal(1);
        expect(result.delivererIDs[0]).to.equal(myDraft.groupID);
      }));

    it('should promise the proper rectrack property', () =>
      content.then(result => {
        expect(result.rectrack).to.equal(myDraft.rectrack);
      }));

    it('should promise the proper metadata.title', () =>
      content.then(result => {
        expect(result.title).to.equal(myDraft.title);
      }));

    it('should promise the proper metadata.thisVersion', () =>
      content.then(result => {
        expect(result.thisVersion).to.equal(myDraft.thisVersion);
      }));

    it('should promise the proper metadata.latestVersion', () =>
      content.then(result => {
        expect(result.latestVersion).to.equal(myDraft.latestVersion);
      }));

    it('should promise the proper metadata.docDate', () =>
      content.then(result => {
        const expected = `${myDraft.docDate.getFullYear()}-${
          myDraft.docDate.getMonth() + 1
        }-${myDraft.docDate.getDate()}`;

        expect(result.docDate).to.be.a('string');
        expect(result.docDate).to.equal(expected);
      }));

    it('should promise the proper metadata.process', () =>
      content.then(result => {
        expect(result.process).to.equal(myDraft.processURI);
      }));

    it('should promise the proper metadata.editorsDraft', () =>
      content.then(result => {
        expect(result.editorsDraft).to.equal(myDraft.editorsDraft);
      }));

    it('should promise the proper metadata.editorIDs', () =>
      content.then(result => {
        expect(result.editorIDs).to.deep.equal(myDraft.editorIDs);
      }));
  });

  describe('extractMetadata(url) for non-rectrack doc', () => {
    const myDraft = server.getMetadata('charmod-norm');
    const content = SpecberusWrapper.extractMetadata(
      myDraft.location,
      myDraft.status,
    );

    it('should promise the proper rectrack property', () =>
      content.then(result => {
        expect(result.rectrack).to.equal(myDraft.rectrack);
      }));
  });

  after(trackProgress);
});

describe('TokenChecker', () => {
  describe('check(url, token)', () => {
    it('should be a function', () => {
      expect(TokenChecker.check).to.be.a('function');
    });

    const myDraft = server.getMetadata('navigation-timing-2');
    const token = '98345098A98F345F';
    const source = 'TEST';
    const check = TokenChecker.check(myDraft.latestVersion, token, source);

    it('should return a promise', () => {
      expect(check).to.be.an.instanceOf(Promise);
    });

    it('should promise a list', () =>
      expect(check).to.eventually.be.an.instanceOf(List));
  });

  after(trackProgress);
});

describe('UserChecker', () => {
  describe('check(user, delivererIDs)', () => {
    it('should be a function', () => {
      expect(UserChecker.check).to.be.a('function');
    });

    const myDraft = server.getMetadata('navigation-timing-2');
    const user = {
      memberOf: [
        'cn=123,ou=groups,dc=w3,dc=org',
        'cn=456,ou=groups,dc=w3,dc=org',
        `cn=${myDraft.groupID},ou=groups,dc=w3,dc=org`,
      ],
    };
    const delivererIDs = [myDraft.groupID];
    const content = UserChecker.check(user, delivererIDs);

    it('should return a promise', () => {
      expect(content).to.be.an.instanceOf(Promise);
    });

    it('should promise a list', () =>
      expect(content).to.eventually.be.an.instanceOf(List));

    it('should promise an empty list', () =>
      content.then(result => {
        expect(result.isEmpty()).to.be.true;
      }));
  });

  describe('check(user, delivererIDs) deny', () => {
    const myDraft = server.getMetadata('navigation-timing-2');
    const user = {
      memberOf: [
        'cn=123,ou=groups,dc=w3,dc=org',
        'cn=456,ou=groups,dc=w3,dc=org',
      ],
    };
    const delivererIDs = [myDraft.groupID];
    const content = UserChecker.check(user, delivererIDs);

    it('should promise a non-empty list', () =>
      content.then(result => {
        expect(result.isEmpty()).to.be.false;
      }));
  });

  after(trackProgress);
});

describe('IPChecker', () => {
  describe('check(url, token)', () => {
    it('should be a function', () => {
      expect(IPChecker.check).to.be.a('function');
    });

    const badIp = '1.2.3.4';
    const check = IPChecker.check(badIp);

    it('should return a promise', () => {
      expect(check).to.be.an.instanceOf(Promise);
    });

    it('should promise a non-empty list', () =>
      check.then(result => {
        expect(result.isEmpty()).to.be.false;
      }));

    const goodIp = '20.230.26.68';
    const check2 = IPChecker.check(goodIp);

    it('should promise an empty list', () =>
    check2.then(result => {
      expect(result.isEmpty()).to.be.true;
    }));
  });

  after(trackProgress);
});

describe('Publisher', () => {
  const metadata = new Map({});

  describe('publish(metadata)', () => {
    const promise = new Publisher(new CreatedService()).publish(metadata);

    it('should return a promise', () => {
      expect(promise).to.be.an.instanceOf(Promise);
    });

    it('should promise an array', () =>
      expect(promise).to.eventually.be.an.instanceOf(List));

    it('should return no errors if publication is successful', () =>
      expect(promise).to.eventually.be.empty);

    it('should return errors when the publication has failed', () => {
      const errPromise = new Publisher(new BadRequestService()).publish(
        metadata,
      );

      return expect(errPromise).to.eventually.have.size(1);
    });

    it('should reject if not yet implemented', () => {
      const rejectPromise = new Publisher(new NotImplementedService()).publish(
        metadata,
      );

      return expect(rejectPromise).to.eventually.be.rejectedWith(
        /Not Implemented/,
      );
    });

    it('should reject if the remote server is having an issue', () => {
      const rejectPromise = new Publisher(new ServerErrorService()).publish(
        metadata,
      );

      return expect(rejectPromise).to.eventually.be.rejectedWith(/code 401/);
    });
  });

  after(trackProgress);
});
