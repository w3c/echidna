#!/bin/bash

STATUS=$1
DEST=$2
URI=${3/&/\\\&}
RESULT=${4/&/\\\&}

if [ $# -lt 3 ]; then
    echo "`basename $0` [SUCCESS|ERROR] DESTINATION URI RESULT"
    echo "`basename $0` SUCCESS foobar@w3.org http://www.w3.org/TR/YYYY/WD-shortname-YYYYMMDD 'Echidna 1.2.0; Specberus 1.1.0'"
    echo "`basename $0` ERROR foobar@w3.org http://www.w3.org/TR/YYYY/WD-shortname-YYYYMMDD 'Error: foo is wrong, bar is invalid…'"
    exit 1
fi

if [ "SUCCESS" == "$STATUS" ]; then
    SUBJECT="[W3C Publication] Success: $URI"
    BODY="On `date -u`, $URI has been published by the W3C automated publication system.

$RESULT

If you believe there's an error, please contact webreq@w3.org."
elif [ "ERROR" == "$STATUS" -o "FAILURE" == "$STATUS" ]; then
    SUBJECT="[W3C Publication] Failed: $URI"
    BODY="On `date -u`, the request to publish $URI failed. See details below.

$RESULT"
fi

if [ "$NODE_ENV" == "production" -a ! -z "$SUBJECT" -a ! -z "$BODY" ]; then
    mail -aFrom:webreq@w3.org -a "Content-Type: text/plain; charset=UTF-8" -s "$SUBJECT" $DEST <<< "$BODY"
fi
