# How to start a development environment for Echidna.

```
git clone git@github.com:w3c/echidna.git && cd echidna
npm install
````


## start dependencies server
`npm run testserver`  (don't run it with nodemon as echidna creates temp files and it'll trigger a restart)

## start echidna with dev config
`CONFIG=config-dev.js W3C_API_KEY=@@W3C_API_KEY@@ node app.js`



## submit a document to echidna
`curl http://localhost:3000/api/request --data "url=https://www.w3.org/TR/2020/WD-clreq-20200701/&decision=foo&token=123"`

If everything worked well, you should get a json file in `test/staging/`. The json should contain the error `wrong-date` as the document submitted was already published.

[describe a use case that works]

# Special dependencies

## ldap
LDAP (Lightweight Directory Access Protocol) is used to identify a user(username and password), and making sure this user participate in the group submitting this document.

# Job List

### Job List when using W3C credentials
['retrieve-resources', 'metadata', 'user-checker', 'specberus', 'transition-checker', 'publish', 'tr-install', 'update-tr-shortlink']

### Job List when using curl with a token (CI only)
['ip-checker', 'retrieve-resources', 'metadata', 'token-checker', 'specberus', 'transition-checker', 'publish', 'tr-install', 'update-tr-shortlink']

## document-downloader.js
Service to download and install resources in the staging server. TAR file or link(pointing to Overview.html or manifest) are supported.

## ip-checker.js
Check if ip making `curl` request is from GitHub Actions or Travis.

## metadata
Specberus.extractMetadata is called by Orchestrator, the task organizer to get metadata of the document.

## user-checker
Checks if the user and password is correct, and the user is participating in the group delivering the document.

## token-checker
Checks if the token is authorized to publish the document.
## specberus(validate)
Specberus.validate is called by Orchestrator, the task organizer to validate document using metadata (profile, rectrack, patentPolicy) extracted before.

## transition-checker
Making sure the type of the document is WD, CR or Notes. For CRs, check issue on GitHub that the director and Mar-Comm have approved the transition.

## publisher.js
Send a request to W3C_PUBSYSTEM_URL, as well as data of the document, to publish the document.

## tr-install
Exec an script, to install the downloaded document to the W3C server, making sure the dated link is accessible.

## update-tr-shortlink
Update shortlink for the document, making sure the shortlink is accessible.