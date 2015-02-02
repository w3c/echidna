
/**
 * Behaviour of the Echidna testbed.
 *
 * @author Antonio <antonio@w3.org>
 */

'use strict';

var JOBS = ['retrieve-resources', 'specberus', 'token-checker', 'third-party-checker', 'publish', 'tr-install', 'update-tr-shortlink'];

var log;
var inspector;
var allSpecs = [];
var allJobs = {};
var allMessages = {};

function logMessage(message) {

    log = log || $('pre#console');
    log.append(new Date().toLocaleTimeString() + '  ' + message + '\n');

}

function dumpObject(obj) {

    inspector = inspector || $('pre#inspector');

    if (!obj) {
        inspector.text('');
    }
    else {
        inspector.text(JSON.stringify(obj, null, 2));
    }

    inspector[0].scrollTop = 0;

}

function endpoint() {

    return $('input#host')[0].value + ':' + $('input#port')[0].value + $('input#suffix')[0].value;

}

function activateActions() {

    $('a.publishOne').click(function() {
        publishOneSpec($(this).attr('data-spec-id'));
    });
    $('a.publishAllAtOnce').click(function() {
        publishAllSpecs();
    });
    $('a.publishAllWithDelay').click(function() {
        publishAllSpecs(true);
    });
    $('td.metadata').click(function() {
        var spec = findSpec($(this).attr('data-spec-id'));
        dumpObject(spec);
    });
    $('td.status').click(function() {
        var job = allJobs[$(this).attr('data-spec-id')];
        var message = allMessages[$(this).attr('data-spec-id')];
        dumpObject(job);
        logMessage(message);
    });
    refresh();

}

function refresh() {

    $.get(endpoint() + '/status/', function(data) {
        updateJobs(data);
        window.setTimeout(refresh, $('input#rate')[0].value * 1000);

        if ($('input#scroll')[0].checked) {
            log[0].scrollTop = log[0].scrollHeight;
        }

  });

}

function updateJobs(data) {

    var spec, id, step, completed;

    for (var i in allSpecs) {
        id = allSpecs[i].id;
        spec = data.requests[location.href + 'drafts/' + id];
        if (spec) {
            allJobs[id] = allJobs[id] || spec.jobs;
            completed = 0;
            allMessages[id] = null;
            for (var j in JOBS) {
                step = allJobs[id][JOBS[j]];
                if (step && step.status && 'ok' === step.status.toLowerCase()) {
                    completed ++;
                }
                else {
                    allMessages[id] = '“' + id + '”: ' + parseInt(100 * completed / JOBS.length) + '% (stuck in ' + JOBS[j] + ').';
                    break;
                }
            }
            if (!allMessages[id]) {
                allMessages[id] = '“' + id + '”: done! ' + completed + ' steps completed.';
            }
            $('td[data-spec-id="' + id + '"] > span').css('width', (128 * completed / JOBS.length) + 'px');
        }

    }

}

function publishOneSpec(id) {

    var spec = findSpec(id);
    var params = {};

    logMessage('Sumitting spec &ldquo;' + id + '&rdquo; for publication&hellip;');
    params.url = location.href + 'drafts/' + spec.id;
    params.decision = 'foo';
    params.token = '34';
    $.post(endpoint() + '/request', params, handlePublicationResult);

}

function handlePublicationResult(data) {

    logMessage('Response from server:<br />          ' + data + '');

}

function publishAllSpecs(delay) {

    if (delay) {
        window.alert('Publishing all with random delays not implemented yet.');
    }
    else {
        logMessage('Sumitting all ' + allSpecs.length + ' specs for publication&hellip;');
            for (var i in allSpecs) {
            publishOneSpec(allSpecs[i].id);
        }
    }

}

function findSpec(id) {

    var result;
    var i = 0;

    while (!result && i < allSpecs.length) {

        if (id === allSpecs[i].id) {
            result = allSpecs[i];
        }

        i++;
    }

    return result;

}

$(document).ready(function() {

    logMessage('Loading specs&hellip;');
    $.getJSON('data/specs.json', function(data) {
        var tableBody = $('table#specList > tbody');
        var row, cell;
        $.each(data.specs, function(foo, spec) {
            allSpecs.push(spec);
            row = $('<tr></tr>');
            row.append($('<td class="action metadata" data-spec-id="' + spec.id + '"><em>' + spec.metadata.title + '</em></td>'));
            row.append($('<td class="deliverers"><a href="' + spec.metadata.groupHomepage + '">' + spec.metadata.groupName + '</a></td>'));
            row.append($('<td><a href="drafts/' + spec.id + '"><code>' + spec.id + '</code></a></td>'));
            row.append($('<td><a class="action publishOne" data-spec-id="' + spec.id + '">Publish</a></td>'));
            row.append($('<td class="progressBar action status" data-spec-id="' + spec.id + '"><span>&nbsp;</span></td>'));
            $('table#specList').append(row);
            tableBody.append(row);
        });
        $('p#spinner').hide();
        $('div#content').show();
        logMessage(allSpecs.length + ' specs loaded.');
        activateActions();
    });

});

// EOF

