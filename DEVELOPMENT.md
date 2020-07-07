This document explains how to start a development environment for Echidna.

```
git clone git@github.com:w3c/echidna.git && cd echidna
npm install
````


# start dependencies server
`npm run testserver`  (don't run it with nodemon as echidna creates temp files and it'll trigger a restart)

# start echidna with dev config
`CONFIG=config-dev.js W3C_API_KEY=@@W3C_API_KEY@@ node app.js`



# submit a document to echidna
`curl http://localhost:3000/api/request --data "url=https://www.w3.org/TR/2020/WD-clreq-20200701/&decision=foo&token=123"`

If everything worked well, you should get a json file in `test/staging/`. The json should contain the error `wrong-date` as the document submitted was already published.

[describe a use case that works]
