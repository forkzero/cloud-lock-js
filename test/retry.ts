import { RetryAxios } from '../src/retry';
import { AxiosError, AxiosResponse } from 'axios';
import * as chai from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import { CloudLock } from '../src';

const expect = chai.expect;
chai.use(sinonChai);

class AxError implements AxiosError {
  config = {};
  isAxiosError = true;
  code = 'ECONNABORTED';
  name = 'axios';
  message = 'Failure';
  request = { method: 'POST' };
}

class AxResponse implements AxiosResponse {
  data = {};
  status = 200;
  statusText = 'OK';
  headers = {};
  config = {};
  request = { method: 'POST' };
  constructor(status: number, statusText: string) {
    this.status = status;
    this.statusText = statusText;
  }
}

async function okAsync(): Promise<AxiosResponse> {
  return new AxResponse(200, 'OK');
}
async function lockedAsync(): Promise<AxiosResponse> {
  return new AxResponse(423, 'Locked');
}
async function failsAsync(): Promise<AxiosError> {
  throw new AxError();
}
describe('inRange', () => {
  let retry: RetryAxios;
  beforeEach(() => {
    retry = new RetryAxios();
  });
  it('should return true if status code is in default range', () => {
    expect(retry.inRange(423)).to.be.true;
  });
});
describe('shouldRetry', () => {
  it('should return true for 423 Locked', () => {
    const r = new RetryAxios({ maxRetries: 10 });
    expect(r.shouldRetry(new AxResponse(423, 'Locked'))).to.be.true;
  });
});
describe('emitRetry', () => {
  it('should include delay and jitter', done => {
    const r = new RetryAxios();
    r.on('retry', timing => {
      expect(timing).to.haveOwnProperty('delay');
      expect(timing).to.haveOwnProperty('jitter');
      expect(timing.delay).to.be.eq(0);
      done();
    });
    r.emitRetry();
  });
});
describe('retry', () => {
  // let clock: sinon.SinonFakeTimers
  // before(function () { clock = sinon.useFakeTimers() })
  // after(function () { clock.restore() })

  it('retries 10 times and throws an error', done => {
    const clock = sinon.useFakeTimers();
    const r = new RetryAxios({ maxRetries: 10 });
    r.on('retry', timing => clock.tick(timing.delay + timing.jitter));
    r.retry(failsAsync).catch(err => {
      expect(err).to.be.an.instanceOf(AxError);
      expect(err.isAxiosError).to.be.true;
      expect(r.attempt).to.equal(10);
      expect(r.attemptLog.length).to.equal(10);
      clock.restore();
      done();
    });
  });
  it('retries 10 times and throws error on 423 Locked', done => {
    const clock = sinon.useFakeTimers();
    const r = new RetryAxios({ maxRetries: 10 });
    r.on('retry', timing => clock.tick(timing.delay + timing.jitter));
    r.retry(lockedAsync).then(result => {
      expect(result).to.be.an.instanceOf(AxResponse);
      expect(r.attempt).to.equal(10);
      expect(r.attemptLog.length).to.equal(10);
      clock.restore();
      done();
    });
  });
  it('does not retry on 200 OK', done => {
    const r = new RetryAxios({ maxRetries: 10 });
    r.retry(okAsync).then(result => {
      expect(result).to.be.an.instanceOf(AxResponse);
      expect(r.attempt).to.equal(1);
      expect(r.attemptLog.length).to.equal(1);
      done();
    });
  });
});
