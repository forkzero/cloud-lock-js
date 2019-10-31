import { RetryAxios } from '../src/retry';
import { AxiosError, AxiosResponse } from 'axios';
import * as chai from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';

const expect = chai.expect;
chai.use(sinonChai);

class AxError implements AxiosError {
  config = {};
  isAxiosError = true;
  code = 'ECONNABORTED';
  name = 'axios';
  message = 'Failure';
}

class AxResponse implements AxiosResponse {
  data = {};
  status = 200;
  statusText = 'OK';
  headers = {};
  config = {};
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

describe('shouldRetry', () => {
  it('should return true for 423 Locked', () => {
    const r = new RetryAxios(10, 100);
    expect(r.shouldRetry(new AxResponse(423, 'Locked'))).to.be.true;
  });
});
describe('retry', () => {
  // let clock: sinon.SinonFakeTimers
  // before(function () { clock = sinon.useFakeTimers() })
  // after(function () { clock.restore() })

  it('retries 10 times and throws an error', done => {
    const clock = sinon.useFakeTimers();
    const r = new RetryAxios(10, 100);
    r.on('retry', () => clock.tick(r.delay + r.jitter));
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
    const r = new RetryAxios(10, 100);
    r.on('retry', () => clock.tick(r.delay + r.jitter));
    r.retry(lockedAsync).then(result => {
      expect(result).to.be.an.instanceOf(AxResponse);
      expect(r.attempt).to.equal(10);
      expect(r.attemptLog.length).to.equal(10);
      clock.restore();
      done();
    });
  });
  it('does not retry on 200 OK', done => {
    const r = new RetryAxios(10, 100);
    r.retry(okAsync).then(result => {
      expect(result).to.be.an.instanceOf(AxResponse);
      expect(r.attempt).to.equal(1);
      expect(r.attemptLog.length).to.equal(1);
      done();
    });
  });
});
