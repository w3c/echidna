// Simulates the HTML validator

var express = require('express');
var validator = module.exports = express();

validator.get('/check', function (req, res) {
  var url = req.param("uri") || "";
  var result = {
    "url": url,
    "messages": [],
    "source": {
      "encoding": "utf-8",
      "type": "text/html"
    }
  };
  return res.jsonp(result);
});
