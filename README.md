# Echidna

Echidna is the central piece of software taking care of the new publication workflow at [W3C](http://www.w3.org/). The plan is for Echidna and related sub-projects (see below) to automatise the publication of new specs under [`http://www.w3.org/TR/`](http://www.w3.org/TR/).

## Dependencies

### OS-level dependencies

* [Node.js](http://nodejs.org/)
* [npm](https://www.npmjs.org/)

### npm dependencies

These will be resolved automatically by simply running `npm install` on the directory of the project.

* [Immutable.js](https://github.com/facebook/immutable-js/)
* [express](https://github.com/strongloop/express)
* [ejs](https://github.com/tj/ejs)
* `grunt`
* `grunt-contrib-copy`
* `grunt-contrib-concat`
* `grunt-contrib-uglify`
* `grunt-contrib-jshint`
* `grunt-contrib-sass`
* `grunt-contrib-cssmin`
* `grunt-contrib-connect`
* `grunt-contrib-clean`
* `grunt-contrib-htmlmin`
* `grunt-contrib-imagemin`
* `grunt-contrib-watch`
* `grunt-open`
* `grunt-express-server`
* `grunt-rev`
* `grunt-usemin`
* `grunt-svgmin`
* `grunt-concurrent`
* `load-grunt-tasks`
* `time-grunt`

## How to get it up and running

```bash
$ git clone git@github.com:w3c/echidna.git
$ cd echidna
$ npm install
$ nodejs app.js
```

Then simply open [`http://localhost:3000`](http://localhost:3000) on your web browser and start throwing publication requests at it.

## Syntax and command-line parameters

```
$ nodejs app.js [STAGING_PATH [SPECBERUS_BASE_URI [PORT]]]
```

Meaning of positional parameters:

1. `STAGING_PATH`: path in the local filesystem where documents will be downloaded; *staged*.
(Default `/var/www/html/trstaging/`.)
2. `HTTP_LOCATION`: HTTP endpoint for [Specberus](https://github.com/w3c/specberus) and the [Third-party checker](https://github.com/dontcallmedom/third-party-resources-checker).
(Default `http://localhost/trstaging/`.)
3. `PORT`: where Echidna will be listening for publication requests.
(Default `3000`.)

Examples:

```bash
$ nodejs app.js /home/nick/public_html/staging/ http://localhost/~nick/staging/ 80
```

```bash
$ nodejs app.js ../tmp/echidna-files/
```

## Automated tests and builds

Coming soon.

## Sub-projects, and related tools

* [Specberus](https://github.com/w3c/specberus)
* [LinkChecker](https://github.com/halindrome/linkchecker)
* [`third-party-resources-checker`](https://github.com/dontcallmedom/third-party-resources-checker)
* [`w3c-validate`](https://github.com/busbud/w3c-validate)
* [`w3cjs`](https://github.com/thomasdavis/w3cjs)
* [Tenon](http://www.tenon.io/documentation/)
* Generators (see [`spec-generator`](https://github.com/w3c/spec-generator)):
 * Respec
 * [CSS Spec Preprocessor](https://api.csswg.org/bikeshed/) for Bikeshed

## Feedback and contributions

* **File** bugs and suggestions [here on GitHub](https://github.com/w3c/echidna/issues).
* **Talk to us** on IRC: server `irc.w3.org`; channels `#pub` or `#pubrules` (here are [detailed instructions to connect](http://www.w3.org/wiki/IRC)).
* **Discuss** the publication workflow and related tools [on the mailing list](http://lists.w3.org/Archives/Public/spec-prod/).
