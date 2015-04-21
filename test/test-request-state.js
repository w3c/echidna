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
  describe('object', function () {
    it('should be immutable (aka frozen)', function () {
      expect(Object.isFrozen(new RequestState())).to.be.true;
    });
  });

  describe('get(k)', function () {
    it('should return the status of the request', function () {
      expect(new RequestState('status').get('status')).to.equal('status');
    });

    it('should handle inexisting keys', function () {
      expect(new RequestState().get('say-what')).to.be.undefined;
    });
  });

  describe('set(k, v)', function () {
    it('should successfully update a status', function () {
      var state = new RequestState().set('status', 'yawning');
      expect(state.get('status')).to.equal('yawning');
    });

    it('should handle inexisting keys', function () {
      var state = new RequestState();
      expect(state.set('foo', 'bar')).to.equal(state);
    });
  });

  describe('addToHistory(fact)', function () {
    it('should return a new State with one more fact', function () {
      var state = new RequestState().addToHistory('Some random fact');
      // TODO Improve test when History is refactored
      expect(state.get('history').facts).to.have.size(1);
    });
  });

  // TODO Rename hasJobStarted() or change behavior as it is currently misleading
  describe('hasJobStarted(jobName)', function () {
    var r = new RequestState();

    it('should be true when the job has not started', function () {
      var state = r.set('jobs', new Map({ 'dummy': new Job('') }));
      expect(state.hasJobStarted('dummy')).to.be.true;
    });

    it('should be false when the job has started', function () {
      var state = r.set('jobs', new Map({ 'dummy': new Job('ok') }));
      expect(state.hasJobStarted('dummy')).to.be.false;
    });

    it('should handle inexisting jobs', function () {
      expect(r.hasJobStarted('inexisting')).to.be.false;
    });
  });

  describe('setJobStatus(jobName, status)', function () {
    var r = new RequestState().set('jobs', new Map({ 'dummy': new Job() }));

    it('should update the status of a specific job', function () {
      var state = r.setJobStatus('dummy', 'foo');
      expect(state.get('jobs').get('dummy').get('status')).to.equal('foo');
    });

    it('should handle inexisting jobs', function () {
      var state = r.setJobStatus('inexisting');
      expect(state).to.equal(r);
    });
  });
});
