'use strict';

global.DEFAULT_TEMP_LOCATION = './test/staging/';
// DEFAULT_HTTP_LOCATION without trailing slash
global.DEFAULT_HTTP_LOCATION = 'http://localhost:3001';
global.DEFAULT_LOG_LOCATION = '.';
global.DEFAULT_RESULT_LOCATION = './test/staging/';
global.DEFAULT_PORT = 3000;
global.TOKEN_ENDPOINT = 'http://localhost:3001/authorize';
global.SPEC_GENERATOR = 'http://localhost:3001/generate';
global.USERNAME = '';
global.PASSWORD = '';
global.W3C_PUBSYSTEM_URL = 'http://localhost:3001/publish';
global.TR_INSTALL_CMD =
  'mkdir -p ./test/staging/$dest && cp -R $source ./test/staging/$dest';
global.UPDATE_TR_SHORTLINK_CMD = '#';
global.MAIL_SENDER = 'Echidna <echidna@example.org>';
global.MAIL_REPLYTO = 'john.doe@example.org';
global.MAILING_LIST = 'public-mailing-list@example.org';
global.ATTACH_JSON = false;
global.ALLOWED_CLIENTS = [
  // Same host (for tests):
  /https?:\/\/localhost(:\d{1,4})?/i,
  // W3C:
  /https?:\/\/(www\.)?w3c?\.org/i,
  // GitHub:
  /https?:\/\/w3c\.github\.io/i,
];
global.LDAP_URL = 'ldap://localhost:1389';
global.LDAP_SEARCH_BASE = 'ou=user,dc=example,dc=org';
// LDAP_BIND_DN must contain the placeholder {{username}}
global.LDAP_BIND_DN = 'uid={{username}},ou=user,dc=example,dc=org';
global.GH_TOKEN = '';
global.GH_DIRECTOR_TEAM_ID = '2797096';
global.GH_COMM_TEAM_ID = '2794457';

global.LDAP_USER = 'foo';
global.LDAP_PASSWORD = 'bar';
global.LDAP_GROUPS = [
  'cn=123,ou=groups,dc=w3,dc=org',
  'cn=456,ou=groups,dc=w3,dc=org',
  'cn=32113,ou=groups,dc=w3,dc=org',
  'cn=49309,ou=groups,dc=w3,dc=org',
];
global.SKIP_VALIDATION = true;
