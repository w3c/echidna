/* eslint-disable no-unused-expressions */
/* eslint-disable no-new */
/* eslint-disable func-names */
/**
 * @module
 */

'use strict';

import chai from 'chai';
import JsonHttpService from '../lib/json-http-service.js';

const { expect } = chai;

describe('JsonHttpService', () => {
  describe('object', () => {
    it('should be immutable (aka frozen)', () => {
      expect(new JsonHttpService('', '', '', {})).to.be.frozen;
    });

    it('should always be called with new', () => {
      expect(() => {
        JsonHttpService();
      }).to.throw(TypeError);
    });

    it('should be given strings as arguments', () => {
      [
        function () {
          new JsonHttpService(42, '', '', {});
        },
        function () {
          new JsonHttpService('', 42, '', {});
        },
        function () {
          new JsonHttpService('', '', 42, {});
        },
        function () {
          new JsonHttpService('', '', '', '');
        },
      ].forEach(f => {
        expect(f).to.throw(TypeError);
      });
    });
  });
});
