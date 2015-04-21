'use strict';

var chai = require('chai');
var expect = chai.expect;
var List = require('immutable').List;
var Promise = require('promise');

var Orchestrator = require('../lib/orchestrator');
var RequestState = require('../lib/request-state');

describe('Orchestrator', function () {
  describe('hasFinished(state)', function () {
    it('should be true when the passing state is successful', function () {
      expect(Orchestrator.hasFinished(new RequestState('success'))).to.be.true;
    });

    it('should be true when the passing state has failed', function () {
      expect(Orchestrator.hasFinished(new RequestState('error'))).to.be.true;
    });

    it('should be true when the passing state has crashed', function () {
      expect(Orchestrator.hasFinished(new RequestState('failure'))).to.be.true;
    });

    it('should be false when the passing state is pending', function () {
      expect(Orchestrator.hasFinished(new RequestState('started'))).to.be.false;
    });
  });

  describe('iterate(iteration, condition, handler, t)', function () {
    // Iteratively increment a value until it reaches 5
    var result = Orchestrator.iterate(
      function (n) { return List.of(Promise.resolve(n + 1)); },
      function (n) { return n >= 5; },
      function (n) { },
      0
    );

    it('should return a promise', function () {
      expect(result).to.be.an.instanceOf(Promise);
    });

    it('should promise an output of same type than input', function () {
      return expect(result).to.eventually.be.a('number');
    });

    it('should properly compute the example value', function () {
      return expect(result).to.eventually.equal(5);
    });
  });
});
