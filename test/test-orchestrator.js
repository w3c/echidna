/**
 * @module
 */

'use strict';

const chai = require('chai');
const chaiAsPromised = require('chai-as-promised');
const chaiImmutable = require('chai-immutable');

const { expect } = chai;
const { List } = require('immutable');
const { Map } = require('immutable');
const Promise = require('promise');

const Job = require('../lib/job');
const Orchestrator = require('../lib/orchestrator');
const RequestState = require('../lib/request-state');

chai.use(chaiAsPromised);
chai.use(chaiImmutable);

describe('Orchestrator', () => {
  describe('hasFinished(state)', () => {
    it('should be true when the passing state is successful', () => {
      expect(Orchestrator.hasFinished(new RequestState('success'))).to.be.true;
    });

    it('should be true when the passing state has failed', () => {
      expect(Orchestrator.hasFinished(new RequestState('error'))).to.be.true;
    });

    it('should be true when the passing state has crashed', () => {
      expect(Orchestrator.hasFinished(new RequestState('failure'))).to.be.true;
    });

    it('should be false when the passing state is pending', () => {
      expect(Orchestrator.hasFinished(new RequestState('started'))).to.be.false;
    });

    it('should be false when the passing state is not set', () => {
      expect(Orchestrator.hasFinished(new RequestState(''))).to.be.false;
    });
  });

  describe('iterate(iteration, condition, handler, t)', () => {
    function incrementUntil(f, n) {
      return Orchestrator.iterate(
        i => List.of(f(i)),
        i => i >= n,
        () => {},
        0,
      );
    }

    // Iteratively increment a value until it reaches 42
    const result = incrementUntil(i => Promise.resolve(i + 1), 42);

    it('should return a promise', () => {
      expect(result).to.be.an.instanceOf(Promise);
    });

    it('should promise an output of same type than input', () =>
      expect(result).to.eventually.be.a('number'));

    it('should properly compute the example value', () =>
      expect(result).to.eventually.equal(42));

    it('should properly iterate over an asynchronous computation', () => {
      function incrementDelay(n) {
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(n + 1);
          }, 25);
        });
      }

      // Iteratively increment a value until it 5 with a delay between each increment
      const resultDelay = incrementUntil(incrementDelay, 4);

      return expect(resultDelay).to.eventually.equal(4);
    });
  });

  describe('runStep(step)', () => {
    const dummyRequest = new RequestState().set(
      'jobs',
      new Map({
        dummy: new Job(),
      }),
    );

    const resultOk = new Orchestrator().runStep(
      new Map({
        name: 'dummy',
        promise: Promise.resolve(new Map({ status: 'ok' })),
      }),
    )(dummyRequest);

    const resultFailure = new Orchestrator().runStep(
      new Map({
        name: 'dummy',
        promise: Promise.resolve(
          new Map({
            status: 'failure',
            errors: List.of('an error'),
          }),
        ),
      }),
    )(dummyRequest);

    const resultError = new Orchestrator().runStep(
      new Map({
        name: 'dummy',
        promise: Promise.resolve(
          new Map({
            status: 'error',
            errors: List.of('another error'),
          }),
        ),
      }),
    )(dummyRequest);

    it('should return a function', () => {
      expect(new Orchestrator().runStep()).to.be.a('function');
    });

    it('should return a list with 2 elements', () => {
      expect(resultOk).to.be.an.instanceOf(List).and.to.have.size(2);
    });

    it('should return Promises', () => {
      resultOk.forEach(promise => {
        expect(promise).to.be.an.instanceOf(Promise);
      });
    });

    it('should promise a bunch of RequestState objects', () =>
      Promise.all(
        resultOk
          .map(promise =>
            expect(promise).to.be.eventually.an.instanceOf(RequestState),
          )
          .toArray(),
      ));

    it('should set the first returned state as pending job', () =>
      resultOk
        .get(0)
        .then(state =>
          expect(state.jobs.get('dummy').status).to.equal('pending'),
        ));

    it('should set the second returned state as successful job', () =>
      resultOk
        .get(1)
        .then(state => expect(state.jobs.get('dummy').status).to.equal('ok')));

    it('should set the second returned state as successful job', () =>
      resultOk
        .get(1)
        .then(state => expect(state.jobs.get('dummy').status).to.equal('ok')));

    it('should set the second returned state as failed job', () =>
      resultFailure
        .get(1)
        .then(state =>
          expect(state.jobs.get('dummy').status).to.equal('failure'),
        ));

    it('should return a state with errors when a job fails', () =>
      resultFailure
        .get(1)
        .then(state => expect(state.jobs.get('dummy').errors).to.have.size(1)));

    it('should return a failed state when a job fails', () =>
      expect(resultFailure.get(1)).to.eventually.have.property(
        'status',
        'failure',
      ));

    it('should set the second returned state as errored job', () =>
      resultError
        .get(1)
        .then(state =>
          expect(state.jobs.get('dummy').status).to.equal('error'),
        ));

    it('should return a state with errors when a job errors', () =>
      resultError
        .get(1)
        .then(state => expect(state.jobs.get('dummy').errors).to.have.size(1)));

    it('should return an errored state when a job errors', () =>
      expect(resultError.get(1)).to.eventually.have.property(
        'status',
        'error',
      ));
  });
});
