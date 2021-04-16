
<style type="text/css">

  h1, h2, h3 {
    margin-top:       0;
  }

  ul, li {
    line-height:      125%;
  }

  li {
    padding-top:      0.5em;
  }

  .remark-slide-container:first-child .remark-slide-number {
    visibility:       hidden;
  }

  .remark-slide-number,
  .remark-slide-content .footer {
    position:         absolute;
    bottom:           0.5rem;
    font-size:        67%;
    line-height:      24px;
    opacity:          1;
  }

  .remark-slide-number {
    right:            1rem;
  }

  .remark-slide-content .footer {
    left:             1rem;
  }

  .remark-slide-content .footer img {
    vertical-align:   middle;
    max-height:       24px;
    margin-right:     0.5rem;
  }

  .hidden-comment {
    display:          none;
  }

  .half img {
    width:            50%;
  }

  .appendix {
    background-color: #ffffc0;
  }

  .smaller img {
    width:            90%;
  }

  .green {
    color:            #00c000;
  }

  .remark-code {
    font-size:        20px;
  }

  .nb-call {
    color:            #0000c0;
  }

  .nb {
    font-size:        67%;
    text-align        right;
    vertical-align:   bottom;
    color:            #0000c0;
  }

  code, .remark-code {
    color:            #ff0000;
  }

  pre code.remark-code {
    color:            inherit;
  }

  a code {
    color:            inherit;
  }

</style>

name: appendix
layout: true
class: appendix

---

layout: false
class: center, middle

<!--······························································································································
····  If you aren't seeing this as an interactive presentation, in slides, open it with Remarkise:                            ····
····  https://tripu.github.io/remark/remarkise?url=https%3A%2F%2Frawgit.com%2Fw3c%2Fechidna%2Fmaster%2Fdoc%2Fpresentation.md  ····
·······························································································································-->

.hidden-comment[<br><br><br><br>**If you are reading this**, you are looking at the *source*! <br> [Use
Remarkise instead](https://tripu.github.io/remark/remarkise?url=https%3A%2F%2Frawgit.com%2Fw3c%2Fechidna%2Fmaster%2Fdoc%2Fpresentation.md)
to **see the presentation in interactive slides**.<br><br><br><br>]


# The new publication workflow

## *How is that going to make my life easier?*

<br><br><br><br>

.center.half[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo.png)]

<br><br>

.center[4 June 2015]

---

# How publishing happens today .nb-call[\*]

1. **Editor** pings team contact
2. **Team contact** downloads files; maybe uploads to intermediate location
3. Team contact pings webmaster
4. **Webmaster** finds issues in spec (probably); reports to team contact
5. Team contact fixes problems, or passes the ball back to the editor
6. *Iterate between steps 1 and 5 until things look OK*
7. Webmaster publishes in a semi-automatic way; informs other parties

.center[Editor&nbsp;&nbsp;&nbsp;&nbsp;&harr;&nbsp;&nbsp;&nbsp;&nbsp;Team contact&nbsp;&nbsp;&nbsp;&nbsp;&harr;&nbsp;&nbsp;&nbsp;&nbsp;Webmaster]

.nb[\* Your mileage may vary]

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

### (Digression: about those intermediate locations

* Some staff contacts copy specs to be published to W3C space,  
or somewhere else  
eg, [`http://www.w3.org/TR/2015/WD-xquery-update-30-20150219/`](http://www.w3.org/TR/2015/WD-xquery-update-30-20150219/)
* Those locations are non-announced, intermediate copies  
*but not temporary*  
ie, stuff stays there forever
* This is considered a bad practice &hellip;or at least it will be now

### )

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Problems

* Webmaster and others in team are kept busy with repetitive tasks
* Tedious, asynchronous back and forth between roles
* Releasing often is effectively discouraged (it takes effort, and time)
* Validating specs before publication is difficult
* `/TR` contains unnecessary copies of specs
* Publication depends on all actors being available  
ie, webmaster and systeam are busy &rarr; publications have to wait

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# The solution

*Let the robots steal our jobs!*

.center.half[![Robot](https://raw.githubusercontent.com/w3c/echidna/master/doc/robots18.png)]

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# In an ideal world: fully automatic publication

1. .green[Editor pushes changes, eg to **GitHub**]
2. .green[CI (&ldquo;continuous integration&rdquo;) system, eg **Travis CI**, kicks in]
3. .green[CI system sends *shortname* to Echidna, plus an *auth token*]
4. Echidna infers:
  1. Base URL of the spec
  2. Type of spec
  2. Metadata: WG, editors, etc
5. Validation:
  1. Echidna runs pubrules checker in the background
  2. .green[Sends back by e-mail] comprehensive information about validation
  3. &hellip;including info about errors, with pointers to specific pubrules
6. *If there are issues, edit the spec and go back to step 1*
7. *If all is OK*, spec published under `/TR`; .green[e-mail notifications sent]

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# In an ideal world: &ldquo;triggered&rdquo; publication

1. .green[Editor goes to .remark-code[https].remark-code[://w3.org/publish/] (basic auth, W3C credentials)]
2. .green[Echidna finds out what specs are associated to that editor]
3. .green[Editor selects one among those specs (a *shortname*) and hits *publish*]
4. Echidna infers:
  1. Base URL of the spec
  2. Type of spec
  2. Metadata: WG, other editors, etc
5. Validation:
  1. Echidna runs pubrules checker in the background
  2. .green[Presents on the page] comprehensive information about validation
  3. &hellip;including info about errors, with pointers to specific pubrules
6. *If there are issues, edit the spec and go back to step 3*
7. *If all is OK*, .green[editor confirms intention], spec published under `/TR`

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Advantages

* Webmaster and others freed for more productive work
* No more asynchronous back and forth between different parties
* Releasing very often becomes possible (but see *challenges*)
* Enables future integration within larger automatic workflows  
eg, command line, CI tools
* Enables integration with spec-generation tools  
eg, ReSpec, Bikeshed, Anolis
* Easier validation: editors and team contacts will be self-sufficient
* No need for staging areas or intermediate copies
* Publish any day, any time (barring moratoria)

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Where we are

&#10003; Simple REST API: [`https://labs.w3.org/echidna/api/version`](https://labs.w3.org/echidna/api/version)

&#10003; E-mail notifications (success and error): [`public-tr-notifications@w3.org`](https://lists.w3.org/Archives/Public/public-tr-notifications/)

&#10003; &hellip;including diagnostics when it fails

&#10003; Support for specs with multiple files (with manifests)

&#10003; Integration with other systems: CVS, DB, Symfony endpoint (W3C API)

&#10003; Integration with spec-generation tools: ReSpec (experimental)

&#10003; Adoption within the workflow of some WGs already

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Where we are

&#10007; `https://w3.org/publish/`  
&nbsp;&nbsp;&nbsp;&nbsp;but: [`https://labs.w3.org/echidna/`](https://labs.w3.org/echidna/), [`https://labs.w3.org/pubrules/`](https://labs.w3.org/pubrules/)

&#10007; Web UI  
&nbsp;&nbsp;&nbsp;&nbsp;but: [branch `tripu/web-interface`](https://github.com/w3c/echidna/tree/tripu/web-interface) (WIP)

&#10007; Extraction of metadata  
&nbsp;&nbsp;&nbsp;&nbsp;currently, limited support

&#10007; Different types of specs (**only WDs for now**)

&#10007; Integration with spec-generation tools: Bikeshed

&#10007; Integration with spec-generation tools: Anolis

&#10007; Special cases: joint publication, multiple deliverers

&#10007; Good, Detailed, meaningful feedback about errors (WIP)

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Challenges

* If the system achieves the goal of streamlining the process and freeing up people, you folks might publish *very* often, and `TR/` will become *massive*
* Security &amp; authentication
* Traceability
* Special cases
* Temporary rules
* Transitions
* Moratoria
* Exceptions
* Exceptions
* Exceptions

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# *How is that going to make my life easier?*

**As a team contact:**
  * WGs will be able to publish anytime *without your intervention*
  * They will need your help less often
  * If the source of the spec is already at a publicly-accessible URL,  
you won't need to download files and copy them elsewhere

**As an editor:**
  * You won't have to chase your team contact
  * Publish much more often
  * Tie automatic publication to your work cycle

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# How to publish&nbsp;&nbsp;&nbsp;&nbsp;▸▹▹▹

*The first time only*, the team contact has to request a token for the spec

.center[[`https://www.w3.org/Web/publications/register`](https://www.w3.org/Web/publications/register)]

Providing:
* **Spec URL**, eg `http://www.w3.org/TR/flux-capacitor`
* **Source URL**, eg `https://w3c.github.io/FluxCapacitorSpec`

Team contact communicates token for spec to editor, who keeps it safe

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

background-image: url(https://raw.githubusercontent.com/w3c/echidna/master/doc/token-request-form.png)

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# How to publish&nbsp;&nbsp;&nbsp;&nbsp;▸▸▹▹

Check your spec with [Specberus](https://labs.w3.org/pubrules/)

(&hellip;unless you are very confident)

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# How to publish&nbsp;&nbsp;&nbsp;&nbsp;▸▸▸▹

* API method `request`, with required parameters `url`, `token` and `decision`

Either:
* Type URLs on your browser's location bar
* Use with `curl` (command line):

```bash
$ curl 'https://labs.w3.org/echidna/api/request' \
  --data 'url=https://w3c.github.io/FluxCapacitorSpec/\
  &decision=https://lists.w3.org/Archives/Public/flux-discuss/052.html\
  &token=3389491445850581'

b2415b5794de
```

The method `request` returns an ID for the newly created *publication job*

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# How to publish&nbsp;&nbsp;&nbsp;&nbsp;▸▸▸▸

The result will be sent to [`public-tr-notifications@w3.org`](https://lists.w3.org/Archives/Public/public-tr-notifications/) after a few seconds

(Examples of notification messages:
[success](https://lists.w3.org/Archives/Public/public-tr-notifications/2015May/0020.html),
[error](https://lists.w3.org/Archives/Public/public-tr-notifications/2015May/0016.html))

If you're impatient, use method `status` with required parameter `id`,  
passing along the ID of the publication job:

```bash
$ curl 'https://labs.w3.org/echidna/api/status?id=b2415b5794de'

{
  "id": "08aaa215",
  "url": "https://w3c.github.io/gamepad/ECHIDNA",
  "jobs": {
    "retrieve-resources": {
      "status": "ok",
      "errors": []
    },
    "specberus": {
      "status": "failure",
⋮
```

The method `status` returns a JSON object detailing the state of the publication

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Manifest yourself

* Manifest: when specs aren't a single file, but include other resources
* Detection of manifest is automatic
* Only restriction: first line is main HTML (it'll be renamed `Overview.html`)
* Don't forget to include *all* resources

```bash
latest.html
appendix-A.html
appendix-B.html
img/diagram.png
img/chart.jpeg
data/output.log
```

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Keep Echidna in the loop

Example of **Travis** integration:  
[`https://github.com/w3c/manifest/blob/gh-pages/.travis.yml`](https://github.com/w3c/manifest/blob/gh-pages/.travis.yml)

```yml
language: node_js

branches:
  only:
      - gh-pages

env:
  global:
    - URL="http://w3c.github.io/manifest/ECHIDNA"
    - DECISION="https://lists.w3.org/Archives/Public/webapps/051.html"
    - secure: "vuLLjmy5[...]aQlBMaI="

script:
  - echo "ok"

after_success:
  - curl "https://labs.w3.org/echidna/api/request" \
    --data "url=$URL" \
    --data "token=$TOKEN" \
    --data "decision=$DECISION"
```

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# Doing it ReSpec'fully

* Echidna doesn't care which spec-generation tool you use (if any)
* Use any instance of the tool of your choice
* However, there is experimental integration with ReSpec  
via Spec Generator on labs:  
[`https://labs.w3.org/spec-generator/`](https://labs.w3.org/spec-generator/)
* Simply append a space and the keyword to first line of manifest

Example:  
[`https://github.com/w3c/manifest/blob/gh-pages/ECHIDNA`](https://github.com/w3c/manifest/blob/gh-pages/ECHIDNA)

```bash
index.html?specStatus=WD;shortName=appmanifest respec
images/manifest-src-directive.svg
```

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

# What is coming next

* Reference UI, developed in-house, eg `https://w3.org/publish/`  
  Work is ongoing: [branch `tripu/web-interface`](https://github.com/w3c/echidna/tree/tripu/web-interface)
* Future user-contributed clients, cattering to different needs
* Better error messages
* More types of specs
* Support for special cases, eg joint publication

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

class: center, middle

# ‽

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

template: appendix

# Appendix: the different pieces

* [**Echidna**](https://github.com/w3c/echidna) (ɪˈkɪd nə) *n. new publication workflow's main component*
* [**Specberus**](https://github.com/w3c/specberus) (ˈspɛk bər əs) *n. new automatic checker for* pubrules
* [**Insafe**](https://github.com/w3c/insafe)
* [**ReSpec**](https://github.com/w3c/respec)
* [**Spec Generator**](https://github.com/w3c/spec-generator)

Node.js dependencies:

```
Echidna
├── Specberus
    └── insafe
```

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

template: appendix

# Appendix: references

* Main page and API endpoint: [`https://labs.w3.org/echidna/`](https://labs.w3.org/echidna/)
* [Wiki of the project on GitHub](https://github.com/w3c/echidna/wiki)
* Public mailing lists (comments, ideas, bug reporting):
  * [`spec-prod@w3.org`](https://lists.w3.org/Archives/Public/spec-prod/)
  * [`public-pubrules-comments@w3.org`](https://lists.w3.org/Archives/Public/public-pubrules-comments/)
  * [`public-tr-notifications@w3.org`](https://lists.w3.org/Archives/Public/public-tr-notifications/)
* IRC: channel [#pub](irc://irc.w3.org:6667/pub) on [W3C's public server](http://www.w3.org/wiki/IRC)

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

template: appendix

# Appendix: about spec-generation tools

* ReSpec:
  * [`http://www.w3.org/respec/`](http://www.w3.org/respec/)
  * [`https://github.com/w3c/respec-docs`](https://github.com/w3c/respec-docs)
* Anolis:
  * [`https://wiki.whatwg.org/wiki/Anolis`](https://wiki.whatwg.org/wiki/Anolis)
  * [`https://bitbucket.org/ms2ger/anolis`](https://bitbucket.org/ms2ger/anolis)
* Bikeshed:
  * [`https://github.com/tabatkins/bikeshed`](https://github.com/tabatkins/bikeshed)
  * [`https://api.csswg.org/bikeshed/`](https://api.csswg.org/bikeshed/)

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

---

class: center, middle

***New-pub-wf* brought to you by:**  
Robin, Dom, Philippe, Ted,  
Jérémie, Denis, Guillaume, Gerald, Antonio,  
rest of Systeam,  
other W3C staff,  
Marcos  
and a few other contributors

Thanks to Systeam for reviewing this presentation

Robot icon by [Plainicon](http://www.flaticon.com/authors/plainicon) from [flaticon](http://www.flaticon.com/), licensed [CC BY 3.0](http://creativecommons.org/licenses/by/3.0/)

.footer[![Logo](https://raw.githubusercontent.com/w3c/echidna/master/doc/w3c-labs-logo-small.png)New publication workflow]

