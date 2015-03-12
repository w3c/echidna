#!/bin/bash

STATUS=$1
DEST=$2
URI=$3
RESULT=$4

if [ $# -lt 3 ]; then
    echo "`basename $0` [SUCCESS|ERROR] DESTINATION URI [RESULT]"
    echo "`basename $0` SUCCESS foobar@w3.org http://www.w3.org/TR/YYYY/WD-shortname-YYYYMMDD"
    exit 1
fi

if [ "SUCCESS" == "$STATUS" ]; then
    SUBJECT="[W3C Publication] $URI has been published on http://www.w3.org/TR/"
    BODY="On `date -u`, $URI has been published by the W3C automated publication system.

If you believe there's an error, please contact webreq@w3.org."
elif [ "ERROR" == "$STATUS" ]; then
    SUBJECT="[W3C Publication] Publication of $URI failed"
    BODY="On `date -u`, the request to publish $URI failed. See details below.

$RESULT"
fi

if [ "$NODE_ENV" == "production" -a ! -z "$SUBJECT" -a ! -z "$BODY" ]; then
    mail -aFrom:webreq@w3.org -s "$SUBJECT" $DEST <<< "$BODY"
fi

