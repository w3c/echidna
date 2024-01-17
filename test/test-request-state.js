/* eslint-disable no-unused-expressions */
/**
 * @module
 */

'use strict';

import * as chai from 'chai';
import Immutable from 'immutable';

import Job from '../lib/job.js';

import RequestState from '../lib/request-state.js';

const { List, Map } = Immutable;
const { assert, expect } = chai;

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
      assert.equal(newState.get('history').facts.size, 1);
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

      assert.equal(newState.get('jobs').get('dummy').get('errors').size, 1);
    });

    it('should handle inexisting jobs', () => {
      expect(state.setJobErrors('inexisting')).to.equal(state);
    });
  });
});
