var fs = require('fs');
var express = require('express');
var app = express();
var morgan = require('morgan');
var cssvalidator = require("./cssvalidator");
var htmlvalidator = require("./htmlvalidator");
var tokenChecker = require("./tokenchecker");
var htmlTemplate = require("./htmltemplate");
var getMetadata = require('./utils').getMetadata;
var draftsSystemPath = require('./utils').draftsSystemPath;

var port = (process.env.PORT || 3000) + 1;

var TestServer   = function () {};

app.use(morgan('dev',
    {stream: fs.createWriteStream("/tmp/echidna-testserver.log", {flags: 'w'})}));

app.use(cssvalidator);
app.use(htmlvalidator);
app.use(tokenChecker);

// setup the templating before using express static
app.use(htmlTemplate('/drafts', draftsSystemPath));
app.use('/drafts', express.static(draftsSystemPath));

// three resources to test if the test is alive and kicking
app.get('/', function(req, res) {
  res.send("<!doctype html><p>Baby don't worry you know that you got me");
});
app.get('/robots', function(req, res) {
  res.send("<!doctype html><p>Those are not the robots you're looking for.");
});
app.get('/elvis', function(req, res) {
  res.send('<!doctype html><p>Elvis is alive.');
});

var server;

TestServer.start = function () {
  if (app === undefined) {
    init();
  }
  server = app.listen(port);
};

TestServer.location = function () {
  return "http://localhost:" + server.address().port;
};

// this will return metadata associate with a draft
TestServer.getMetadata = function (name) {
  var data = getMetadata(name);
  if (data.location === undefined) {
    data.location = this.location() + "/drafts/" + name + "/";
  }
  return data;
};

TestServer.start();

module.exports = TestServer;
