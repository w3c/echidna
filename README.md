[![Build Status](https://github.com/w3c/echidna/workflows/Echidna%20tests/badge.svg)](https://github.com/w3c/echidna/actions)
[![Coverage Status](https://coveralls.io/repos/w3c/echidna/badge.svg)](https://coveralls.io/r/w3c/echidna)
[![Dependency Status](https://david-dm.org/w3c/echidna.svg)](https://david-dm.org/w3c/echidna)
[![devDependency Status](https://david-dm.org/w3c/echidna/dev-status.svg)](https://david-dm.org/w3c/echidna#info=devDependencies)
[![Inline docs](http://inch-ci.org/github/w3c/echidna.svg?branch=master)](http://inch-ci.org/github/w3c/echidna)

# Echidna

Echidna is the central piece of software taking care of the new publication workflow at [W3C](http://www.w3.org/). The plan is for Echidna and related sub-projects (see below) to automate the publication of new specs under <http://www.w3.org/TR/>.

## Using Echidna as an editor

**If you are a spec editor, you do not need to install Echidna, nor to run it locally.**

Please [see the wiki](https://github.com/w3c/echidna/wiki) for how to use Echidna as a spec editor.

## Hacking Echidna as a developer

### Installation

To run Echidna, you need to install [Node.js](https://nodejs.org/en/) first.
This will install [npm](https://www.npmjs.com/) at the same time, which is required as well.

Then run the following commands with your favorite terminal:

```bash
git clone https://github.com/w3c/echidna.git
cd echidna
cp config.js.example config.js
npm install
```

### Running it locally

*Note: local setup of the full system is not supported currently due to dependency on W3C's DB and IPP system, but having mock services that emulate these pieces is our short-term goal.*

In your terminal, run the following:

```bash
npm start [-- STAGING_PATH [HTTP_LOCATION [PORT [RESULT_PATH]]]]
```

You may use the optional defined below:

1. `STAGING_PATH`: path in the local filesystem where documents will be downloaded; *staged*.
(Default `/var/www/html/trstaging/`.)
2. `HTTP_LOCATION`: HTTP endpoint for [Specberus](https://github.com/w3c/specberus).
(Default `http://localhost/trstaging/`.)
3. `PORT`: where Echidna will be listening for publication requests.
(Default `3000`.)
4. `RESULT_PATH`: local path where Echidna will dump the results of publication requests in JSON format.

Alternatively, you can use the configuration file `config.js`.

Once the server is started, you can throw publication requests at it through a `curl`/`POST` request to its endpoint, <http://localhost:3000/api>, or using the web-based testbed (described below).

You can also use a simple web client to send and monitor those requests, at <http://localhost:3000/ui>.

For more information, please refer to [DEVELOPMENT.md](./DEVELOPMENT.md).

### Testing Echidna

This section describes how to run Echidna's test suite to make sure that the project itself is working properly over time. Note that the test suite is not intended to test actual documents.

#### Running the unit test suite

You can run the test suite with the following command line:

```bash
npm test
```

#### Using test documents

For testing purposes, we are using a local web server.
The test server simulates some of the W3C services, such as the CSS and HTML validators, or the token authorization checker.
It also serves a set of sample drafts.

You can launch this test server separately by using:

```bash
npm run testserver
```

When the test server is running, the testbed with all drafts will be available in <http://localhost:3001>.

## Feedback and contributions

Please refer to our [contribution reference](https://github.com/w3c/echidna/blob/master/CONTRIBUTING.md) to learn how to contact us, give feedback, or actively contribute to this project.
