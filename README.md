
# Echidna

*Echidna* is the central piece of software (the *orchestrator*) taking care of the new publication workflow at [W3C](http://www.w3.org/).

The plan is for Echidna (and related sub-projects) to automatise the publication of specs on [`http://www.w3.org/TR/`](http://www.w3.org/TR/).

## Dependencies

### OS-level dependencies:

* [Node.js](http://nodejs.org/).
* [npm](https://www.npmjs.org/).

### These are dependencies too, but will be resolved automatically by running `npm install` on the directory of the project:

* [express](https://github.com/strongloop/express).
* [ejs](https://github.com/tj/ejs).

## Instructions

```bash
$ git clone git@github.com:w3c/echidna.git
$ cd echidna
$ npm install
$ nodejs app.js
```

Then simply open [`http://localhost:3000`](http://localhost:3000) on your web browser and start throwing *publication requests* at it.

## See also

* [`Specberus`](https://github.com/w3c/specberus)
* [`linkchecker`](https://github.com/halindrome/linkchecker)
* [`third-party-resources-checker`](https://github.com/dontcallmedom/third-party-resources-checker)
* [`w3c-validate`](https://github.com/busbud/w3c-validate).
* [`w3cjs`](https://github.com/thomasdavis/w3cjs).

## Feedback and contributions

* **File** bugs and suggestions [on GitHub](https://github.com/w3c/echidna/issues).
* **Talk to us** on IRC: server `irc.w3.org`; channels `#pub` or `#pubrules` ([detailed instructions to connect](http://www.w3.org/wiki/IRC)).
* **Discuss** the publication workflow and related tools [on the mailing list](http://lists.w3.org/Archives/Public/spec-prod/).

