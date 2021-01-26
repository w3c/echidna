'use strict';

global.DEFAULT_TEMP_LOCATION = './test/staging/';
// DEFAULT_HTTP_LOCATION without trailing slash
global.DEFAULT_HTTP_LOCATION = 'http://localhost:3001';
global.DEFAULT_LOG_LOCATION = '.';
global.DEFAULT_RESULT_LOCATION = './test/staging/';
global.DEFAULT_PORT = 3000;
global.RESOURCES_ALLOWLIST = './allowlist.json';
global.TOKEN_ENDPOINT = 'http://localhost:3001/authorize';
global.SPEC_GENERATOR = 'http://localhost:3001/generate';
global.USERNAME = '';
global.PASSWORD = '';
global.W3C_PUBSYSTEM_URL = 'http://localhost:3001/publish';
global.TR_INSTALL_CMD = 'mkdir -p ./test/staging/$dest && cp -R $source ./test/staging/$dest';
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
  /https?:\/\/w3c\.github\.io/i
];
global.LDAP_URL = "ldap://localhost:1389";
global.LDAP_SEARCH_BASE = 'ou=user,dc=example,dc=org';
// LDAP_BIND_DN must contain the placeholder {{username}}
global.LDAP_BIND_DN = 'uid={{username}},ou=user,dc=example,dc=org';
global.GH_TOKEN = '123foobar';
global.GH_DIRECTOR_TEAM_ID = '2797096';
global.GH_COMM_TEAM_ID = '2794457';

global.LDAP_USER = "foo";
global.LDAP_PASSWORD = "bar";
global.LDAP_GROUPS = ["cn=123,ou=groups,dc=w3,dc=org", "cn=456,ou=groups,dc=w3,dc=org", "cn=32113,ou=groups,dc=w3,dc=org"];
global.SKIP_VALIDATION = true

global.TRAVIS_IP = ["35.224.112.202", "34.122.208.80", "34.74.253.255", "35.192.136.167", "104.154.113.151", "35.202.145.110", "35.192.85.2", "35.222.7.205", "207.254.16.36", "34.66.50.208", "35.192.187.174", "207.254.16.38", "34.73.65.1", "34.66.25.221", "35.192.10.37", "104.196.53.161", "35.202.245.105", "34.74.79.111", "35.192.91.101", "34.73.66.97", "35.237.56.208", "104.198.131.58", "35.227.97.188", "35.229.115.143", "104.196.57.92", "104.154.120.187", "34.122.173.211", "104.197.122.201", "35.231.58.0", "35.188.73.34", "34.74.91.53", "34.68.144.114", "35.193.184.18", "35.227.58.83", "35.237.8.208", "34.66.200.49", "35.196.82.30", "34.74.16.120", "34.73.34.132", "35.196.72.151", "35.193.7.13", "35.184.226.236", "35.185.97.135", "35.196.158.85", "207.254.16.35", "104.196.213.122", "35.188.15.155", "207.254.16.39", "104.154.182.187", "34.66.178.120", "207.254.16.37", "35.196.99.99", "35.237.212.185", "35.193.14.140", "35.188.1.99"]