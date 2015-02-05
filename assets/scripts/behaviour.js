
/**
 * Behaviour of the Echidna UI.
 *
 * @author Antonio <antonio@w3.org>
 */

'use strict';

$(document).ready(function() {

    var jobs = [];

    function getStatus() {
        var result = [];
        for (var i in jobs) {
            $.get('api/status',
                {id: jobs[i]},
                function(data, foo, xhr) {
                    if (200 === xhr.status) {
                        // Status retrieved OK:
                        result.push(data);
                        $('#queueText').text(JSON.stringify(result, null, 2));
                        $('#lastUpdate > span').text(new Date().toLocaleTimeString());
                    } else if (400 === xhr.status || 404 === xhr.status) {
                        // No job found with that ID, or the parameter is missing:
                        console.log(data);
                    } else {
                        // Some other kind of error:
                        window.alert(data);
                    }
                }
            );
        }
        if ($('#auto').prop('checked')) {
          window.setTimeout(getStatus, 2000);
        }
    }

    $('#infoButton').click(function() {

        $.get('api/version', function(data) {
            $('#infoButton').hide();
            $('#infoText').text(data).show();
        });

    });

    $('#submitButton').click(function(event) {

        event.preventDefault();
        $.post(
            $('#submitForm').prop('action'),
            {url: $('#url').prop('value'),
             decision: $('#decision').prop('value'),
             isManifest: $('#isManifest').prop('checked'),
             token: $('#token').prop('value')},
            function(data, foo, xhr) {
                if (200 === xhr.status) {
                    // Already submitted, and in progress:
                    window.alert(data);
                } else if (202 === xhr.status) {
                    // OK:
                    window.alert('Job submitted OK.\nThe ID is “' + data + '”.');
                    jobs.push(data);
                } else if (500 === xhr.status) {
                    // Missing parameters:
                    window.alert(data);
                } else {
                    // Some other kind of error:
                    window.alert(data);
                }
            }
        );

    });

    $('#auto').click(function() {

        $('#queueButton').prop('disabled', $(this).prop('checked'));

        if ($(this).prop('checked')) {
            getStatus();
        }

    });

    $('#queueButton').click(getStatus);
    getStatus();

});

