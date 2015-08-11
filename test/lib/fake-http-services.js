'use strict';

var Promise = require('promise');

/**
 * A fake HTTP POSTable service that always returns a 201 Created
 * @exports test/lib/CreatedService
 */
var CreatedService = function () {};

CreatedService.prototype.post = function () {
  return new Promise.resolve({ response: { statusCode: 201 }, body: {} });
};

/**
 * A fake HTTP POSTable service that always returns a 501 Not Implemented
 * @exports test/lib/NotImplementedService
 */

var NotImplementedService = function () {};

NotImplementedService.prototype.post = function () {
  return new Promise.resolve({
    response: { statusCode: 501 },
    body: { message: 'Not Implemented' }
  });
};

/**
 * A fake HTTP POSTable service that always returns a 400 Bad Request
 * @exports test/lib/BadRequestService
 */

var BadRequestService = function () {};

BadRequestService.prototype.post = function () {
  return new Promise.resolve({
    response: { statusCode: 400 },
    body: { errors: ['Bad Request'] }
  });
};

/**
 * A fake HTTP POSTable service that always returns a 500 Internal Server Error
 * @exports test/lib/ServerErrorService
 */

var ServerErrorService = function () {};

ServerErrorService.prototype.post = function () {
  return new Promise.resolve({
    response: { statusCode: 500 },
    body: { errors: ['Internal Server Error'] }
  });
};

exports.CreatedService = CreatedService;
exports.NotImplementedService = NotImplementedService;
exports.BadRequestService = BadRequestService;
exports.ServerErrorService = ServerErrorService;
