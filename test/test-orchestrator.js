'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var chaiImmutable = require('chai-immutable');
var expect = chai.expect;
var List = require('immutable').List;
var Map = require('immutable').Map;
var Promise = require('promise');

var Job = require('../lib/job');
var Orchestrator = require('../lib/orchestrator');
var RequestState = require('../lib/request-state');

chai.use(chaiAsPromised);
chai.use(chaiImmutable);

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
    var dummyRequest = new RequestState().set('jobs', new Map({
      'dummy': new Job()
    }));

    var resultOk = new Orchestrator().runStep(new Map({
      name: 'dummy',
      promise: Promise.resolve(new Map({ status: 'ok' }))
    }))(dummyRequest);

    var resultFailure = new Orchestrator().runStep(new Map({
      name: 'dummy',
      promise: Promise.resolve(new Map({
        status: 'failure',
        errors: List.of('an error')
      }))
    }))(dummyRequest);

    var resultError = new Orchestrator().runStep(new Map({
      name: 'dummy',
      promise: Promise.resolve(new Map({
        status: 'error',
        errors: List.of('another error')
      }))
    }))(dummyRequest);

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

    it('should set the first returned state as pending job', function () {
      return resultOk.get(0).then(function (state) {
        return expect(state.jobs.get('dummy').status).to.equal('pending');
      });
    });

    it('should set the second returned state as successful job', function () {
      return resultOk.get(1).then(function (state) {
        return expect(state.jobs.get('dummy').status).to.equal('ok');
      });
    });

    it('should set the second returned state as successful job', function () {
      return resultOk.get(1).then(function (state) {
        return expect(state.jobs.get('dummy').status).to.equal('ok');
      });
    });

    it('should set the second returned state as failed job', function () {
      return resultFailure.get(1).then(function (state) {
        return expect(state.jobs.get('dummy').status).to.equal('failure');
      });
    });

    it('should return a state with errors when a job fails', function () {
      return resultFailure.get(1).then(function (state) {
        return expect(state.jobs.get('dummy').errors).to.have.size(1);
      });
    });

    it('should return a failed state when a job fails', function () {
      return expect(resultFailure.get(1))
        .to.eventually.have.property('status', 'failure');
    });

    it('should set the second returned state as errored job', function () {
      return resultError.get(1).then(function (state) {
        return expect(state.jobs.get('dummy').status).to.equal('error');
      });
    });

    it('should return a state with errors when a job errors', function () {
      return resultError.get(1).then(function (state) {
        return expect(state.jobs.get('dummy').errors).to.have.size(1);
      });
    });

    it('should return an errored state when a job errors', function () {
      return expect(resultError.get(1))
        .to.eventually.have.property('status', 'error');
    });
  });
});
