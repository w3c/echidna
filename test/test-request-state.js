'use strict';

var chai = require('chai');
var chaiImmutable = require('chai-immutable');
var expect = chai.expect;
var Immutable = require('immutable');
var List = Immutable.List;
var Map = Immutable.Map;

var Job = require('../lib/job');
var RequestState = require('../lib/request-state');

chai.use(chaiImmutable);

describe('RequestState', function () {
  var state = new RequestState('something', new Map({ 'dummy': new Job() }));

  describe('object', function () {
    it('should be immutable (aka frozen)', function () {
      expect(Object.isFrozen(state)).to.be.true;
    });
  });

  describe('get(k)', function () {
    it('should return the status of the request', function () {
      expect(state.get('status')).to.equal('something');
    });

    it('should handle inexisting keys', function () {
      expect(state.get('say-what')).to.be.undefined;
    });
  });

  describe('set(k, v)', function () {
    it('should successfully update a status', function () {
      var newState = state.set('status', 'yawning');

      expect(newState.get('status')).to.equal('yawning');
    });

    it('should handle inexisting keys', function () {
      expect(state.set('foo', 'bar')).to.equal(state);
    });
  });

  describe('addToHistory(fact)', function () {
    it('should return a new State with one more fact', function () {
      var newState = state.addToHistory('Some random fact');

      // TODO Improve test when History is refactored
      expect(newState.get('history').facts).to.have.size(1);
    });
  });

  // TODO Rename hasJobStarted() or change behavior as it is currently misleading
  describe('hasJobStarted(jobName)', function () {
    it('should be true when the job has not started', function () {
      expect(state.hasJobStarted('dummy')).to.be.true;
    });

    it('should be false when the job has started', function () {
      var newState = state.set('jobs', new Map({ 'dummy': new Job('ok') }));

      expect(newState.hasJobStarted('dummy')).to.be.false;
    });

    it('should handle inexisting jobs', function () {
      expect(state.hasJobStarted('inexisting')).to.be.false;
    });
  });

  describe('setJobStatus(jobName, status)', function () {
    it('should update the status of a specific job', function () {
      var newState = state.setJobStatus('dummy', 'foo');

      expect(newState.get('jobs').get('dummy').get('status')).to.equal('foo');
    });

    it('should handle inexisting jobs', function () {
      expect(state.setJobStatus('inexisting')).to.equal(state);
    });
  });

  describe('setJobErrors(jobName, errors)', function () {
    it('should update the status of a specific job', function () {
      var newState = state.setJobErrors('dummy', List.of('error'));

      expect(newState.get('jobs').get('dummy').get('errors')).to.have.size(1);
    });

    it('should handle inexisting jobs', function () {
      expect(state.setJobErrors('inexisting')).to.equal(state);
    });
  });
});
