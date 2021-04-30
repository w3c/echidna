/**
 * @module
 */

'use strict';

const chai = require('chai');

const { expect } = chai;

const JsonHttpService = require('../lib/json-http-service');

describe('JsonHttpService', () => {
  describe('object', () => {
    it('should be immutable (aka frozen)', () => {
      expect(new JsonHttpService('', '', '')).to.be.frozen;
    });

    it('should always be called with new', () => {
      expect(() => {
        JsonHttpService();
      }).to.throw(TypeError);
    });

    it('should be given strings as arguments', () => {
      [
        function () {
          new JsonHttpService(42, '', '');
        },
        function () {
          new JsonHttpService('', 42, '');
        },
        function () {
          new JsonHttpService('', '', 42);
        },
      ].forEach(f => {
        expect(f).to.throw(TypeError);
      });
    });
  });
});
