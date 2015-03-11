[![Build Status](https://travis-ci.org/w3c/echidna.svg?branch=master)](https://travis-ci.org/w3c/echidna)
[![Coverage Status](https://coveralls.io/repos/w3c/echidna/badge.svg)](https://coveralls.io/r/w3c/echidna)
[![Dependency Status](https://david-dm.org/w3c/echidna.svg)](https://david-dm.org/w3c/echidna)
[![devDependency Status](https://david-dm.org/w3c/echidna/dev-status.svg)](https://david-dm.org/w3c/echidna#info=devDependencies)

# Echidna

Echidna is the central piece of software taking care of the new publication workflow at [W3C](http://www.w3.org/). The plan is for Echidna and related sub-projects (see below) to automatise the publication of new specs under [`http://www.w3.org/TR/`](http://www.w3.org/TR/).

## Installation

To run Echidna, you need to install [Node.js](http://nodejs.org/) first.
This will install [npm](https://www.npmjs.org/) at the same time, which is required as well.

Then run the following commands with your favorite terminal:

```bash
git clone https://github.com/w3c/echidna.git
cd echidna
cp config.js.example config.js
npm install
```

## Usage

*Note: local setup of the full system is not supported currently due to dependency on W3C's DB and IPP system, but having mock services that emulate these pieces is our short-term goal.*

In your terminal, run the following:

```bash
npm start [-- STAGING_PATH [HTTP_LOCATION [PORT [RESULT_PATH]]]]
```

You may use the optional defined below:

1. `STAGING_PATH`: path in the local filesystem where documents will be downloaded; *staged*.
(Default `/var/www/html/trstaging/`.)
2. `HTTP_LOCATION`: HTTP endpoint for [Specberus](https://github.com/w3c/specberus) and the [Third Party Resources Checker](https://github.com/dontcallmedom/third-party-resources-checker).
(Default `http://localhost/trstaging/`.)
3. `PORT`: where Echidna will be listening for publication requests.
(Default `3000`.)
4. `RESULT_PATH`: local path where Echidna will dump the results of publication requests in JSON format.

Note that they are only supported by npm 2 and above. Alternatively, you can use the configuration file `config.js`.

Once the server is started, you can throw publication requests at it through a `curl`/`POST` request to its enpoint, [`http://localhost:3000/api/`](http://localhost:3000/api/), or using the web-based test based (described below).

## Running tests

This section describes how to run Echidna's test suite to make sure that the project itself is working properly over time. Note that the test suite is not intended to test actual documents.

### Command line script

You can run the test suite with the following command line:

```bash
npm test
```

### Web-based testbed

For testing purposes, we are using an internal web server by default at `http://localhost:3001`.
The test server simulates some of the W3C services, such as the CSS and HTML validators, or the token authorization checker.
It also serves a set of sample drafts.

You can launch this test server separately by using:

```bash
npm run testserver
```

When the test server is running, the testbed with all drafts will be available in `http://localhost:3001/`.

## Feedback and contributions

Please refer to our [contribution reference](https://github.com/w3c/echidna/blob/master/CONTRIBUTING.md) to learn how to contact us, give feedback, or actively contribute to this project.
