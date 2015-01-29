
/**
 * Behaviour of the Echidna testbed.
 * @author Antonio <antonio@w3.org>
 */

'use strict';

function log(message) {

    $('pre#console').append(new Date().toISOString() + '\t' + message + '\n');

}

$(document).ready(function() {

    log('Loading specs&hellip;');
    $.getJSON('data/specs.json', function(data) {
        var li;
        $.each(data.specs, function(foo, spec) {
            li = $('<li><a href="drafts/' + spec.id + '">' + spec.metadata.title + '</a> <a href="">Test!</a></li>');
            $('ol#specList').append(li);
        });
        $('p#spinner').hide();
        $('ol#specList').show();
        log('Specs loaded.');
    });

});

// EOF

