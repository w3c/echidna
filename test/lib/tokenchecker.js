// Simulates the CSS Validator

var express = require('express');
var getMetadata = require('./utils').getMetadata;
var tokenChecker = express();

function getShortName(latestVersion) {
  var str = latestVersion.substring(0, latestVersion.lastIndexOf('/'));
  return str.substring(str.lastIndexOf('/')+1);
}

tokenChecker.get('/authorize', function (req, res) {
  var uri = req.param("spec");
  var token = req.param("token");
  var json = {
    "token" : token,
    "spec"  : uri,
    "source" : getMetadata(getShortName(uri)).editorsDraft,
    "authorized"  : true
  };

  return res.json(json);
});

module.exports = tokenChecker;
