/* eslint-disable no-alert */
/**
 * Behaviour of the Echidna UI.
 *
 * @author Antonio <antonio@w3.org>
 */

/* eslint-env jquery */

'use strict';

$(document).ready(() => {
  const jobs = [];

  function getStatus() {
    const result = [];

    for (let i = 0; i < jobs.length; i += 1) {
      $.get('api/status', { id: jobs[i] }, (data, foo, xhr) => {
        if (xhr.status === 200) {
          // Status retrieved OK:
          result.push(data);
          $('#queueText').text(JSON.stringify(result, null, 2));
          $('#lastUpdate > span').text(new Date().toLocaleTimeString());
        } else {
          // Some other kind of error:
          window.alert(data);
        }
      });
    }
    if ($('#auto').prop('checked')) {
      window.setTimeout(getStatus, 2000);
    }
  }

  $('#infoButton').click(() => {
    $.get('api/version', data => {
      $('#infoButton').hide();
      $('#infoText').text(data).show();
    });
  });

  $('#submitForm').submit(event => {
    event.preventDefault();
    const submitForm = $('#submitForm');

    if (submitForm && submitForm.get(0) && submitForm.get(0).checkValidity()) {
      $.post(
        submitForm.prop('action'),
        {
          url: $('#url').prop('value'),
          decision: $('#decision').prop('value'),
          token: $('#token').prop('value'),
        },
        (data, foo, xhr) => {
          if (xhr.status === 200) {
            // Already submitted, and in progress:
            window.alert(data);
          } else if (xhr.status === 202) {
            // OK:
            window.alert(`Job submitted OK.\nThe ID is “${data}”.`);
            jobs.push(data);
          } else if (xhr.status === 401 || xhr.status === 400) {
            // Missing parameters:
            window.alert(data);
          } else {
            // Some other kind of error:
            window.alert(data);
          }
        },
      );
    } else {
      window.alert(
        'Wrong data; please fill in all fields before submitting a job.',
      );
    }
  });

  $('#auto').click(() => {
    $('#queueButton').prop('disabled', $(this).prop('checked'));

    if ($(this).prop('checked')) {
      getStatus();
    }
  });

  $('#queueButton').click(getStatus);
  getStatus();
});
