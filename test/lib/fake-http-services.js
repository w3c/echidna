'use strict';

var Promise = require('promise');

/**
 * A fake HTTP POSTable service that always returns a 201 Created
 * @class
 */
var CreatedService = function () {}

CreatedService.prototype.post = function (body) {
  return new Promise.resolve({ response: { statusCode: 201 }, body: {} });
};

/**
 * A fake HTTP POSTable service that always returns a 501 Not Implemented
 * @class
 */
var NotImplementedService = function () {}

NotImplementedService.prototype.post = function (body) {
  return new Promise.resolve({
    response: { statusCode: 501 },
    body: { message: 'Not Implemented' }
  });
};

/**
 * A fake HTTP POSTable service that always returns a 400 Bad Request
 * @class
 */
var BadRequestService = function () {}

BadRequestService.prototype.post = function (body) {
  return new Promise.resolve({
    response: { statusCode: 400 },
    body: { errors: ['Bad Request'] }
  });
};

/**
 * A fake HTTP POSTable service that always returns a 500 Internal Server Error
 * @class
 */
var ServerErrorService = function () {}

ServerErrorService.prototype.post = function (body) {
  return new Promise.resolve({
    response: { statusCode: 500 },
    body: { errors: ['Internal Server Error'] }
  });
};

exports.CreatedService = CreatedService;
exports.NotImplementedService = NotImplementedService;
exports.BadRequestService = BadRequestService;
exports.ServerErrorService = ServerErrorService;
