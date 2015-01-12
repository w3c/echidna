#!/bin/bash

DEST=$1
URI=$2

mail -s "[W3C Publication] $URI had been published on http://www.w3.org/TR/" $DEST <<< "On `date -u`, $URI has been published by the W3C automated publication system.

If you believe there's an error, please contact webreq@w3.org."
