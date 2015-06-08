/**
 * @module
 */

'use strict';

var chai = require('chai');
var expect = chai.expect;

var JsonHttpService = require('../lib/json-http-service');

describe('JsonHttpService', function () {
  describe('object', function () {
    it('should be immutable (aka frozen)', function () {
      expect(new JsonHttpService('', '', '')).to.be.frozen;
    });

    it('should always be called with new', function () {
      expect(function () { JsonHttpService(); }).to.throw(TypeError);
    });

    it('should be given strings as arguments', function () {
      [
        function () { new JsonHttpService(42, '', ''); },
        function () { new JsonHttpService('', 42, ''); },
        function () { new JsonHttpService('', '', 42); }
      ].forEach(function (f) {
        expect(f).to.throw(TypeError);
      });
    });
  });
});
