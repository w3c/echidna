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
  var index = "<!doctype html><h1>Sample Drafts</h1><ul>"
  var item = "<li><a href='"+TestServer.location()+"/drafts/";
  var listing = fs.readdirSync(draftsSystemPath);
  for (var i = listing.length - 1; i >= 0; i--) {
    index += item + listing[i] + "/'>" + listing[i] + "</a></li>"
  };
  index += "</ul>";
  res.send(index);
});
app.get('/robots', function(req, res) {
  res.send("<!doctype html><p>Those are not the robots you're looking for.");
});
app.get('/elvis', function(req, res) {
  res.send('<!doctype html><p>Elvis is alive.');
});

var server;

TestServer.start = function () {
  var limit_port = port + 30;
  if (app === undefined) {
    init();
  }
  do {
    server = app.listen(port);
    port += 1;
  } while ((server.address() === null) && (port < limit_port));
  if (server.address() === null) {
    throw new Error("Can't find a free port for the test server " + port);
  }
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
