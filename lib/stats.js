
'use strict';

var Fs = require('fs');
var Path = require('path');

// Pseudo-constants:
var FORMAT_HTML = 'html';
var FORMAT_DIV = 'div';
var DEFAULT_FORMAT = FORMAT_HTML;
var BOGUS_DOCUMENT_URL = /^<documenturl>$/i;
var UNKNOWN_VALUE = '[n/a]';
var ECHIDNA_RESULT_REGEX = /^.+\.json$/i;
var URL_REGEX = /^https?:\/\/(www\.)?/i;
var WG_ID_REGEX = /^\d+$/i;
var MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr',
  'May', 'Jun', 'Jul', 'Aug',
  'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * @exports lib/stats
 */

var Stats = function (format) {
  this.format = format ? format : DEFAULT_FORMAT;
};

Stats.resultDir = null;

Stats.prototype.run = function (callback) {
  var self = this;

  Fs.readdir(Stats.resultDir, function (dirErr, files) {
    if (dirErr) {
      throw dirErr;
    }
    var pendingFiles = 0;

    self.data = [];
    for (var name in files) {
      if (ECHIDNA_RESULT_REGEX.test(files[name])) {
        pendingFiles++;
        Fs.readFile(
          Stats.resultDir + Path.sep + files[name],
          { encoding: 'utf8', flag: 'r' },
          function (fileErr, data) {
            if (fileErr) {
              throw fileErr;
            }
            self.data.push(JSON.parse(data));
            pendingFiles--;
            if (0 === pendingFiles) {
              self.crunchData();
              self.formatData();
              callback(self.result);
            }
          }
        );
      }
    }
  });
};

Stats.prototype.crunchData = function () {
  var result;
  var date;
  var month;
  var deliverers;

  this.firstDate = null;
  this.lastDate = null;
  this.total = 0;
  this.totalSuccess = 0;
  this.totalError = 0;
  this.specsPerMonth = {};
  this.specsPerWG = {};
  this.versionsPerSpec = {};

  for (var i in this.data) {
    if (this.data.hasOwnProperty(i)) {
      result = this.data[i];
      date = Stats.findOutYearMonth(result);
      month = date ?
        (date.getFullYear() + '-' + date.getMonth()) : UNKNOWN_VALUE;
      deliverers = Stats.findOutDeliverers(result);
      if (!this.firstDate || date < this.firstDate) {
        this.firstDate = date;
      }
      if (!this.lastDate || date > this.lastDate) {
        this.lastDate = date;
      }
      if (!this.specsPerMonth.hasOwnProperty(month)) {
        this.specsPerMonth[month] = { success: 0, error: 0, total: 0 };
      }
      if (result && result.status && 'success' === result.status) {
        this.specsPerMonth[month].success++;
        this.totalSuccess++;
      }
      else {
        this.specsPerMonth[month].error++;
        this.totalError++;
      }
      this.specsPerMonth[month].total++;
      this.total++;
      for (var j in deliverers) {
        if (deliverers.hasOwnProperty(j)) {
          if (!this.specsPerWG.hasOwnProperty(deliverers[j])) {
            this.specsPerWG[deliverers[j]] = { success: 0, error: 0, total: 0 };
          }
          if (result && result.status && 'success' === result.status) {
            this.specsPerWG[deliverers[j]].success++;
          }
          else {
            this.specsPerWG[deliverers[j]].error++;
          }
          this.specsPerWG[deliverers[j]].total++;
        }
      }
    }
  }
};

Stats.prototype.formatData = function () {
  this.result = null;

  if (FORMAT_DIV === this.format || FORMAT_HTML === this.format) {
    this.result = '<div id="echidna-stats">\n<p><strong>Total:</strong></p>\n' +
      '<ul>\n<li><strong>' + this.total +
      '</strong> attempts (<span class="ok">' +
      this.totalSuccess + '</span> OK, <span class="failed">' +
      this.totalError + '</span> failed)</li>\n</ul>\n' +
      '<p><strong>Publications per month:</strong></p>\n<ul>\n';
    var y = this.firstDate.getFullYear();
    var m = this.firstDate.getMonth();
    var perGroup = [];
    var month;
    var link;
    var label;

    while (y < this.lastDate.getFullYear() ||
      (y === this.lastDate.getFullYear() && m <= this.lastDate.getMonth())) {
      month = y + '-' + m;
      if (this.specsPerMonth.hasOwnProperty(month)) {
        this.result += '<li>' + y + ' ' + MONTH_NAMES[m] + ': <strong>' +
          this.specsPerMonth[month].total + '</strong> (<span class="ok">' +
          this.specsPerMonth[month].success +
          '</span> OK, <span class="failed">' +
          this.specsPerMonth[month].error + '</span> failed)</li>\n';
      }
      else {
        this.result += '<li>' + y + ' ' + MONTH_NAMES[m] + ': 0</li>\n';
      }
      if (this.specsPerMonth.hasOwnProperty(UNKNOWN_VALUE)) {
        this.result += '<li><span class="unknown">' + UNKNOWN_VALUE +
          '</span>: <strong>' +
          this.specsPerMonth[UNKNOWN_VALUE].total +
          '</strong> (<span class="ok">' +
          this.specsPerMonth[UNKNOWN_VALUE].success +
          '</span> OK, <span class="failed">' +
          this.specsPerMonth[UNKNOWN_VALUE].error + '</span> failed)</li>\n';
      }
      if (m < 11) {
        m++;
      }
      else {
        y++;
        m = 0;
      }
    }
    this.result += '</ul>\n<p><strong>Publications per WG</strong> ' +
      '(heuristic; using source URL or decision URL ' +
      'if nothing better available):</p>\n<ul>\n';
    for (var wg in this.specsPerWG) {
      if (UNKNOWN_VALUE !== wg) {
        if (URL_REGEX.test(wg)) {
          label = wg.replace(URL_REGEX, '');
          link = '<a class="url" href="' + wg + '">' + label + '</a>';
        }
        else if (WG_ID_REGEX.test(wg)) {
          label = wg;
          link = '<a href="https://www.w3.org/groups/w3cgroups/' + label +
            '">Group ID ' + wg + '</a>';
        }
        else {
          link = label = wg;
        }
        perGroup.push({ label: label, text: '<li>' + link + ': <strong>' +
          this.specsPerWG[wg].total + '</strong> (<span class="ok">' +
          this.specsPerWG[wg].success + '</span> OK, <span class="failed">' +
          this.specsPerWG[wg].error + '</span> failed)</li>\n' });
      }
    }
    perGroup = perGroup.sort(function (a, b) {
      if (a.label < b.label) return -1;
      if (a.label > b.label) return 1;
      return 0;
    });
    for (var i in perGroup) {
      if (perGroup.hasOwnProperty(i)) {
        this.result += perGroup[i].text;
      }
    }
    if (this.specsPerWG.hasOwnProperty(UNKNOWN_VALUE)) {
      this.result += '<li><span class="unknown">' + UNKNOWN_VALUE +
        '</span>: <strong>' +
        this.specsPerWG[UNKNOWN_VALUE].total +
        '</strong> (<span class="ok">' +
        this.specsPerWG[UNKNOWN_VALUE].success +
        '</span> OK, <span class="failed">' +
        this.specsPerWG[UNKNOWN_VALUE].error + '</span> failed)</li>\n';
    }
    this.result += '</ul>\n</div>\n';
    if (FORMAT_HTML === this.format) {
      this.result = '<html>\n' +
        '<head>\n' +
        '<title>Echidna stats</title>\n' +
        '<link rel="stylesheet" media="handheld, all" ' +
        'href="//www.w3.org/2008/site/css/minimum">\n' +
        '<link rel="stylesheet" media="print" ' +
        'href="//www.w3.org/2008/site/css/print">\n' +
        '<style>\n' +
        'body { margin: 1em 2em; }\n' +
        '#echidna-stats { padding: 0.5em 1em; background-color: #f8f8f8; }\n' +
        '#echidna-stats ul { margin-left: 2em; }\n' +
        '#echidna-stats span.ok { padding: 0 0.2em; ' +
        'background-color: #e0ffe0; }\n' +
        '#echidna-stats span.failed { padding: 0 0.2em; ' +
        'background-color: #ffe0e0; }\n' +
        '#echidna-stats span.unknown { color: #808080; }\n' +
        '#echidna-stats .url { font-family: monospace; }\n' +
        '</style>\n' +
        '</head>\n' +
        '<body>\n' +
        '<h1>Echidna stats</h1>\n' +
        this.result +
        '<footer>\n' +
        '<p>See <a href="https://labs.w3.org/echidna/">Echidna live</a></p>\n' +
        '<p>Copyright © 2014–2015 <a href="http://www.w3.org/">' +
        '<abbr title="World Wide Web Consortium">W3C</abbr></a></p>\n' +
        '</footer>\n' +
        '</body>\n' +
        '</html>\n';
    }
  }
};

Stats.findOutYearMonth = function (item) {
  var result = null;

  if (item) {
    if (item.history && item.history.length > 0 && item.history[0].time) {
      result = new Date(item.history[0].time);
    }
    else if (item.results &&
      item.results.history &&
      item.results.history.length > 0 &&
      item.results.history[0].time) {
      result = new Date(item.results.history[0].time);
    }
    else { throw new Error('Can\'t find out date of ' + item); }
  }
  return result;
};

Stats.findOutDeliverers = function (item) {
  var result = [];

  if (item) {
    if (item.results &&
      item.results.metadata &&
      item.results.metadata.deliverers &&
      item.results.metadata.deliverers.length > 0) {
      for (var i in item.results.metadata.deliverers) {
        if (item.results.metadata.deliverers.hasOwnProperty(i)) {
          result.push(item.results.metadata.deliverers[i].homepage);
        }
      }
    }
    else if (item.results &&
      item.results.metadata &&
      item.results.metadata.delivererIDs) {
      result = item.results.metadata.delivererIDs;
    }
    else if (item.metadata && item.metadata.delivererIDs) {
      result = item.metadata.delivererIDs;
    }
    else if (item.url) {
      if (BOGUS_DOCUMENT_URL.test(item.url)) {
        result = [UNKNOWN_VALUE];
      }
      else {
        result = [item.url];
      }
    }
    else if (item.decision) {
      result = [item.decision];
    }
  }
  return (result && result.length > 0) ? result : [UNKNOWN_VALUE];
};

module.exports = Stats;

