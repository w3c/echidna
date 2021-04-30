/**
 * @module
 */

'use strict';

const chai = require('chai');
const chaiImmutable = require('chai-immutable');

const { expect } = chai;
const { List } = require('immutable');

const Job = require('../lib/job');

chai.use(chaiImmutable);

describe('Job', () => {
  describe('object', () => {
    it('should be immutable (aka frozen)', () => {
      expect(new Job()).to.be.frozen;
    });

    it('should always be called with new', () => {
      expect(() => {
        Job();
      }).to.throw(TypeError);
    });
  });

  describe('get(k)', () => {
    it('should return the status of a job', () => {
      expect(new Job('status').get('status')).to.equal('status');
    });

    it('should handle inexisting keys', () => {
      expect(new Job().get('say-what')).to.be.undefined;
    });
  });

  describe('set(k, v)', () => {
    it('should successfully update a status', () => {
      const job = new Job().set('status', 'eating-nutella');

      expect(job.get('status')).to.equal('eating-nutella');
    });

    it('should successfully update a list of errors', () => {
      const job = new Job().set('errors', new List('error'));

      expect(job.get('errors')).to.equal(new List('error'));
    });

    it('should not accept non-string statuses', () => {
      expect(() => {
        new Job().set('status', 42);
      }).to.throw(TypeError);
    });

    it('should not accept Arrays of errors', () => {
      expect(() => {
        new Job().set('errors', ['error']);
      }).to.throw(TypeError);
    });
  });
});
