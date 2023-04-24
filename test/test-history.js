/* eslint-disable no-new */
/* eslint-disable no-unused-expressions */
/**
 * @module
 */

'use strict';

import chai from 'chai';

import History from '../lib/history.js';

await import(`${process.cwd()}/${process.env.CONFIG || 'config.js'}`);

const { expect } = chai;

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
