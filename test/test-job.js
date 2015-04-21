'use strict';

var chai = require('chai');
var chaiImmutable = require('chai-immutable');
var expect = chai.expect;
var List = require('immutable').List;

var Job = require('../lib/job');

chai.use(chaiImmutable);

describe('Job', function () {
  describe('object', function () {
    it('should be immutable (aka frozen)', function () {
      expect(Object.isFrozen(new Job())).to.be.true;
    });
  });

  describe('get(k)', function () {
    it('should return the status of a job', function () {
      expect(new Job('status').get('status')).to.equal('status');
    });

    it('should handle inexisting keys', function () {
      expect(new Job().get('say-what')).to.be.undefined;
    });
  });

  describe('set(k, v)', function () {
    it('should successfully update a status', function () {
      var job = new Job().set('status', 'eating-nutella');
      expect(job.get('status')).to.equal('eating-nutella');
    });

    it('should successfully update a list of errors', function () {
      var job = new Job().set('errors', new List('error'));
      expect(job.get('errors')).to.equal(new List('error'));
    })

    it('should not accept Arrays of errors', function () {
      expect(function () {
        new Job().set('errors', ['error']);
      }).to.throw(TypeError);
    });
  });
});
