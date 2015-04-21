'use strict';

var chai = require('chai');
var chaiImmutable = require('chai-immutable');
var expect = chai.expect;
var List = require('immutable').List;

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
  });
});
