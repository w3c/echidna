'use strict';

var chai = require('chai');
var expect = chai.expect;

var Orchestrator = require('../lib/orchestrator');
var RequestState = require('../lib/request-state');

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
});
