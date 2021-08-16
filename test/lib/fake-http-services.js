'use strict';

const Promise = require('promise');

/**
 * A fake HTTP POSTable service that always returns a 201 Created
 * @exports test/lib/CreatedService
 */
const CreatedService = function () {};

CreatedService.prototype.post = function () {
  return Promise.resolve({ response: { statusCode: 201 }, body: {} });
};

/**
 * A fake HTTP POSTable service that always returns a 501 Not Implemented
 * @exports test/lib/NotImplementedService
 */

const NotImplementedService = function () {};

NotImplementedService.prototype.post = function () {
  return Promise.resolve({
    response: { statusCode: 501 },
    body: { message: 'Not Implemented' },
  });
};

/**
 * A fake HTTP POSTable service that always returns a 400 Bad Request
 * @exports test/lib/BadRequestService
 */

const BadRequestService = function () {};

BadRequestService.prototype.post = () =>
  Promise.resolve({
    response: { statusCode: 400 },
    body: { errors: ['Bad Request'] },
  });

/**
 * A fake HTTP POSTable service that always returns a 500 Internal Server Error
 * @exports test/lib/ServerErrorService
 */

const ServerErrorService = function () {};

ServerErrorService.prototype.post = function () {
  return Promise.resolve({
    response: { statusCode: 401 },
    body: { errors: ['Unauthorized'] },
  });
};

exports.CreatedService = CreatedService;
exports.NotImplementedService = NotImplementedService;
exports.BadRequestService = BadRequestService;
exports.ServerErrorService = ServerErrorService;
