/**
 * @module
 */

'use strict';

const chai = require('chai');

const { expect } = chai;

const History = require('../lib/history');

describe('History', () => {
  describe('object', () => {
    it('should be immutable (aka frozen)', () => {
      expect(new History()).to.be.frozen;
    });

    it('should always be called with new', () => {
      expect(() => {
        History();
      }).to.throw(TypeError);
    });

    it('should be given an Immutable.Stack as argument', () => {
      expect(() => {
        new History(['something']);
      }).to.throw(TypeError);
    });
  });
});
