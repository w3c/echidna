'use strict';

var chai = require('chai');
var expect = chai.expect;

var History = require('../lib/history');

describe('History', function () {
  describe('object', function () {
    it('should be immutable (aka frozen)', function () {
      expect(new History()).to.be.frozen;
    });

    it('should always be called with new', function () {
      expect(function () { History(); }).to.throw(TypeError);
    });

    it('should be given an Immutable.Stack as argument', function () {
      expect(function () { new History(['something']); }).to.throw(TypeError);
    });
  });
});
