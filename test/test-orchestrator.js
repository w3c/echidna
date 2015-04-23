'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var expect = chai.expect;
var List = require('immutable').List;
var Map = require('immutable').Map;
var Promise = require('promise');

var Orchestrator = require('../lib/orchestrator');
var RequestState = require('../lib/request-state');

chai.use(chaiAsPromised);

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
    function incrementUntil(f, n) {
      return Orchestrator.iterate(
        function (i) { return List.of(f(i)); },
        function (i) { return i >= n; },
        function (i) { },
        0
      );
    }

    // Iteratively increment a value until it reaches 42
    var result = incrementUntil(function (i) {
      return Promise.resolve(i + 1);
    }, 42);

    it('should return a promise', function () {
      expect(result).to.be.an.instanceOf(Promise);
    });

    it('should promise an output of same type than input', function () {
      return expect(result).to.eventually.be.a('number');
    });

    it('should properly compute the example value', function () {
      return expect(result).to.eventually.equal(42);
    });

    it('should properly iterate over an asynchronous computation', function () {
      function incrementDelay(n) {
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(n + 1); }, 25);
        });
      }

      // Iteratively increment a value until it 5 with a delay between each increment
      var resultDelay = incrementUntil(incrementDelay, 4);
      return expect(resultDelay).to.eventually.equal(4);
    });
  });

  describe('runStep(step)', function () {
    var resultOk = new Orchestrator().runStep(new Map({
      name: 'dummy',
      promise: Promise.resolve(new Map({ 'status': 'ok' }))
    }))(new RequestState());

    it('should return a function', function () {
      expect(new Orchestrator().runStep()).to.be.a('function');
    });

    it('should return a list with 2 elements', function () {
      expect(resultOk).to.be.an.instanceOf(List).and.to.have.size(2);
    });

    it('should return Promises', function () {
      resultOk.forEach(function (promise) {
        expect(promise).to.be.an.instanceOf(Promise);
      });
    });

    it('should promise a bunch of RequestState objects', function () {
      return Promise.all(resultOk.map(function (promise) {
        return expect(promise).to.be.eventually.an.instanceOf(RequestState);
      }).toArray());
    });
  });
});
