/**
 * @module
 */

'use strict';

const chai = require('chai');
const chaiImmutable = require('chai-immutable');

const { expect } = chai;
const Immutable = require('immutable');

const { List } = Immutable;
const { Map } = Immutable;

const Job = require('../lib/job');
const RequestState = require('../lib/request-state');

chai.use(chaiImmutable);

describe('RequestState', () => {
  const state = new RequestState('something', new Map({ dummy: new Job() }));

  describe('object', () => {
    it('should be immutable (aka frozen)', () => {
      expect(state).to.be.frozen;
    });
  });

  describe('get(k)', () => {
    it('should return the status of the request', () => {
      expect(state.get('status')).to.equal('something');
    });

    it('should handle inexisting keys', () => {
      expect(state.get('say-what')).to.be.undefined;
    });
  });

  describe('set(k, v)', () => {
    it('should successfully update a status', () => {
      const newState = state.set('status', 'yawning');

      expect(newState.get('status')).to.equal('yawning');
    });

    it('should handle inexisting keys', () => {
      expect(state.set('foo', 'bar')).to.equal(state);
    });
  });

  describe('addToHistory(fact)', () => {
    it('should return a new State with one more fact', () => {
      const newState = state.addToHistory('Some random fact');

      // TODO Improve test when History is refactored
      expect(newState.get('history').facts).to.have.size(1);
    });
  });

  // TODO Rename hasJobStarted() or change behavior as it is currently misleading
  describe('hasJobStarted(jobName)', () => {
    it('should be true when the job has not started', () => {
      expect(state.hasJobStarted('dummy')).to.be.true;
    });

    it('should be false when the job has started', () => {
      const newState = state.set('jobs', new Map({ dummy: new Job('ok') }));

      expect(newState.hasJobStarted('dummy')).to.be.false;
    });

    it('should handle inexisting jobs', () => {
      expect(state.hasJobStarted('inexisting')).to.be.false;
    });
  });

  describe('setJobStatus(jobName, status)', () => {
    it('should update the status of a specific job', () => {
      const newState = state.setJobStatus('dummy', 'foo');

      expect(newState.get('jobs').get('dummy').get('status')).to.equal('foo');
    });

    it('should handle inexisting jobs', () => {
      expect(state.setJobStatus('inexisting')).to.equal(state);
    });
  });

  describe('setJobErrors(jobName, errors)', () => {
    it('should update the status of a specific job', () => {
      const newState = state.setJobErrors('dummy', List.of('error'));

      expect(newState.get('jobs').get('dummy').get('errors')).to.have.size(1);
    });

    it('should handle inexisting jobs', () => {
      expect(state.setJobErrors('inexisting')).to.equal(state);
    });
  });
});
