
/**
 * Behaviour of the Echidna UI.
 *
 * @author Antonio <antonio@w3.org>
 */

'use strict';

$(document).ready(function() {

    function getStatus() {

        $.get('api/status', function(data) {
            $('#queueText').text(JSON.stringify(data.requests, null, 2));
            $('#lastUpdate > span').text(new Date().toLocaleTimeString());

            if ($('#auto').prop('checked')) {
                window.setTimeout(getStatus, 2000);
            }

        });

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
            function(data) {
                window.alert(data);
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

