var fs = require('fs');
var express = require('express');
var app = express();
var server;
var cssvalidator = require("./cssvalidator");
var htmlvalidator = require("./htmlvalidator");
var htmlTemplate = require("./htmltemplate");
var morgan = require('morgan');

var port = (process.env.PORT || 3000) + 1;

var TestServer   = function () {};

var drafts = __dirname + "/../drafts";

app.use(morgan('dev',
    {stream: fs.createWriteStream("/tmp/echidna-testserver.log", {flags: 'w'})}));

app.use(cssvalidator);
app.use(htmlvalidator);

// setup the templating before using express static
app.use(htmlTemplate('/drafts', drafts));
app.use('/drafts', express.static(drafts));

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

TestServer.start = function (trace) {
  if (app === undefined) {
    init();
  }
  server = app.listen(port);
  if (trace) {
    console.log("Test server started at %s/.", this.location());
  }
};

TestServer.location = function () {
  return "http://localhost:" + server.address().port;
};

module.exports = TestServer;
