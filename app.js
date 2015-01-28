'use strict';

console.log('Launching…');

var meta = require('./package.json');
var express = require('express');
var compression = require('compression');
var bodyParser = require('body-parser');
var ejs = require('ejs');
var exec = require('child_process').exec;
var path = require('path');
var Moment = require('moment');
var Request = require('request');
var Promise = require('promise');

var DocumentDownloader = require("./lib/document-downloader");
var SpecberusWrapper = require("./functions.js").SpecberusWrapper;
var ThirdPartyChecker = require("./functions.js").ThirdPartyChecker;
var TokenChecker = require("./functions.js").TokenChecker;
var History = require("./history.js").History;

// Configuration file
require('./config.js');

var app = express();
var requests = {};
var argTempLocation = process.argv[2] || global.DEFAULT_TEMP_LOCATION;
var argHttpLocation  = process.argv[3] || global.DEFAULT_HTTP_LOCATION;
var port = process.argv[4] || global.DEFAULT_PORT;

app.use(compression());
app.use(bodyParser.urlencoded({ extended: false }));

app.set('view engine', 'ejs');
app.engine('.html', ejs.renderFile);

if (process.env.NODE_ENV === 'production') {
    app.set('views', __dirname + '/dist/views');
    app.use(express.static(__dirname + '/dist/assets'));
} else {
    app.set('views', __dirname + '/views');
    app.use(express.static(__dirname + '/assets'));
}

// Index Page
app.get('/', function(request, response, next) {
    response.render('index.html');
});

// API methods

app.get('/api/version', function(req, res) {
    res.send(
        meta.name +
        ' version ' + meta.version +
        ' running on ' + process.platform +
        ' and listening on port ' + port +
        '. The server time is ' + new Date().toLocaleTimeString() + '.'
    );
});

app.get('/api/status', function(req, res) {
    var result;
    var url = req.query ? req.query.url : null;
    var entry;

    if (url) {
        if (requests[url]) res.json({ 'request': requests[url] });
        else {
            res.status(500).send({ error: 'Request of URL ' + url + ' does not exist.' });
        }
    }
    else res.json({ 'requests': requests });
});

app.post('/api/request', function(req, res) {
    var url = req.body ? req.body.url : null;
    var decision = req.body ? req.body.decision : null;
    var isManifest = req.body ? req.body.isManifest === 'true' : false;
    var token = req.body ? req.body.token : null;

    if (!url || !decision || !token) {
        res.status(500).send({error: 'Missing parameters {url, decision, token}.'});
    }
    else {
        if (requests[url]) {
            res.send('Spec at ' + url + ' is yet pending validation OR has been already submitted. Check “/api/status”.');
        }
        else {
            requests[url] = {
                'url': url,
                'decision': decision,
                'isManifest': isManifest,
                'token': token,
                'jobs': {},
                'history': new History()
            };
            orchestrate(requests[url], isManifest, token).then(function () {
                console.log('Spec at ' + url + ' (decision: ' + decision + ') has FINISHED.');
            }, function (err) {
                console.log('Spec at ' + url + ' (decision: ' + decision + ') has FAILED.');
            });
            res.send('Spec at ' + url + ' (decision: ' + decision + ') added to the queue.');
        }
    }
});

function trInstaller(source, dest) {
    return new Promise(function (resolve, reject) {
        var cmd = global.TR_INSTALL_CMD + ' ' + source + ' ' + dest;
        exec(cmd, function (err, stdout, stderr) {
            if (err) reject(err);
            else resolve();
        });
    });
}

function updateTrShortlink(uri) {
    return new Promise(function (resolve, reject) {
        var cmd = global.UPDATE_TR_SHORTLINK_CMD + ' ' + uri;
        exec(cmd, function (err, stdout, stderr) {
            if (err) reject(err);
            else resolve();
        });
    });
}

function publish(metadata) {
    return new Promise(function (resolve, reject) {
        Request.post({
            url: global.W3C_PUBSYSTEM_URL,
            json: true,
            form: {
                specversion: {
                    uri: metadata.get('thisVersion'),
                    latestVersionUri: metadata.get('latestVersion'),
                    previousVersionUri: metadata.get('previousVersion'),
                    date: Moment(metadata.get('docDate')).format('YYYY-MM-DD'),
                    title: metadata.get('title'),
                    deliverers: metadata.get('delivererIDs'),
                    editors: metadata.get('editorIds'),
                    informative: false, // FIXME Not always true
                    editorDraft: metadata.get('editorsDraft'),
                    processRules: metadata.get('process')
                }
            }
        }, function(error, response, body) {
            if (error) reject(error);
            else if (response.statusCode === 501) reject(new Error(body.message));
            else if (response.statusCode === 400) resolve(body.errors);
            else if (response.statusCode === 201) resolve([]);
            else reject(new Error("There was an error when publishing: code " + response.statusCode));
        });
    });
}

function Job() {
    if (typeof this !== 'object') throw new TypeError('Jobs must be constructed via new');

    this.status = '';
    this.errors = [];
}

function orchestrate(spec, isManifest, token) {
    spec.jobs['retrieve-resources'] = new Job();
    spec.jobs['specberus'] = new Job();
    spec.jobs['token-checker'] = new Job();
    spec.jobs['third-party-checker'] = new Job();
    spec.jobs['publish'] = new Job();
    spec.jobs['tr-install'] = new Job();
    spec.jobs['update-tr-shortlink'] = new Job();

    var date = new Date().getTime();
    var tempLocation = (argTempLocation || global.DEFAULT_TEMP_LOCATION) + path.sep + date + path.sep;
    var httpLocation = (argHttpLocation || global.DEFAULT_SPECBERUS_LOCATION) + '/' + date + '/Overview.html';
    var finalLocation = 'bar';

    spec.jobs['retrieve-resources'].status = 'pending';
    return DocumentDownloader.fetchAndInstall(spec.url, tempLocation, isManifest).then(function () {
        spec.jobs['retrieve-resources'].status = 'ok';
        spec.history = spec.history.add('The file has been retrieved.');

        spec.jobs['specberus'].status = 'pending';
        return SpecberusWrapper.validate(httpLocation).then(function (report) {
            if(report.errors.size === 0) {
                spec.jobs['specberus'].status = 'ok';
                spec.history = spec.history.add('The document passed specberus.');
                spec.jobs['token-checker'].status = 'pending';
                var shortlink = report.metadata.get('latestVersion');
                return TokenChecker.check(shortlink, token).then(function(authReport) {
                    var matchSource = spec.url.substring(0, authReport.source.length) === authReport.source;
                    if(authReport.authorized && matchSource) {
                        spec.jobs['token-checker'].status = 'ok';
                        spec.history = spec.history.add('You are authorized to publish');

                        spec.jobs['third-party-checker'].status = 'pending';
                        return ThirdPartyChecker.check(httpLocation).then(function (extResources) {
                            if (extResources.length === 0) {
                                spec.jobs['third-party-checker'].status = 'ok';
                                spec.history = spec.history.add('The document passed the third party checker.');

                                spec.jobs['publish'].status = 'pending';
                                return publish(report.metadata).then(function (errors) {
                                    if(errors.length === 0) {
                                        spec.jobs['publish'].status = 'ok';

                                        spec.jobs['tr-install'].status = 'pending';
                                        return trInstall(tempLocation, finalLocation).then(function () {
                                            spec.jobs['tr-install'].status = 'ok';

                                            spec.jobs['update-tr-shortlink'].status = 'pending';
                                            return updateTrShortlink(report.metadata.get('thisVersion')).then(function () {
                                                spec.jobs['update-tr-shortlink'].status = 'ok';

                                                var cmd = global.SENDMAIL + ' ' + global.MAILING_LIST + ' ' + report.metadata.get('thisVersion');
                                                exec(cmd, function (err, stdout, stderr) {
                                                  if (err) console.error(stderr);
                                                });
                                                spec.history = spec.history.add('The document has been published at <a href="' + report.metadata.get('thisVersion') + '">' + report.metadata.get('thisVersion') + '</a>.');
                                                return Promise.resolve("finished");
                                            }, function (err) {
                                                spec.jobs['update-tr-shortlink'].status = 'error';
                                                spec.jobs['update-tr-shortlink'].errors.push(err.toString());
                                                return Promise.reject(err);
                                            });
                                        }, function (err) {
                                            spec.jobs['tr-install'].status = 'error';
                                            spec.jobs['tr-install'].errors.push(err.toString());
                                            return Promise.reject(err);
                                        });
                                    }
                                    else {
                                        spec.jobs['publish'].status = 'failure';
                                        spec.jobs['publish'].errors.push(errors);
                                        spec.history = spec.history.add('The document could not be published: ' + errors.map(function (error) {
                                            return error.message;
                                        }));
                                        return Promise.reject(new Error("Failed the publication system"));
                                    }
                                }, function (err) {
                                    spec.jobs['publish'].status = 'error';
                                    spec.jobs['publish'].errors.push(err.toString());
                                    spec.history = spec.history.add('The document could not be published: ' + err.message);
                                    return Promise.reject(err);
                                });
                            }
                            else {
                                spec.history = spec.history.add('The document contains non-authorized resources');
                                spec.jobs['third-party-checker'].status = 'failure';
                                spec.jobs['third-party-checker'].errors = extResources;
                                return Promise.reject(new Error("Failed Third-Party checker"));
                            }
                        }, function (err) {
                            spec.jobs['third-party-checker'].status = 'error';
                            spec.jobs['third-party-checker'].errors.push(err.toString());
                            return Promise.reject(err);
                        });
                    }
                    else {
                        spec.jobs['token-checker'].status = 'failure';
                        spec.jobs['token-checker'].errors.push('Not authorized');
                        spec.history = spec.history.add('You are not authorized to publish');
                        return Promise.reject(new Error("Failed Token checker"));
                    }
                }, function (err) {
                    spec.jobs['token-checker'].status = 'error';
                    spec.jobs['token-checker'].errors.push(err.toString());
                    return Promise.reject(err);
                });
            }
            else {
                spec.jobs['specberus'].status = 'failure';
                spec.jobs['specberus'].errors = report.errors;
                spec.history = spec.history.add('The document failed specberus.');
                return Promise.reject(new Error("Failed Specberus"));
            }
        }, function (err) {
            spec.jobs['specberus'].status = 'error';
            spec.jobs['specberus'].errors.push(err.toString());
            return Promise.reject(err);
        });
    }, function (err) {
        spec.history = spec.history.add('The document could not be retrieved.');
        spec.jobs['retrieve-resources'].status = 'error';
        spec.jobs['retrieve-resources'].errors.push(err.toString());
        return Promise.reject(err);
    }).catch(function (err) {
        spec.history = spec.history.add('A system error occurred during the process.');
        return Promise.reject(new Error('Orchestrator has failed.'));
    });
}

app.listen(process.env.PORT || port);

console.log(meta.name +
            ' version ' + meta.version +
            ' running on ' + process.platform +
            ' and listening on port ' + port +
            '. The server time is ' + new Date().toLocaleTimeString() + '.');
