import {RetryAxios} from '../src/retry';
import {AxiosError} from 'axios';
import * as chai from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';

const expect = chai.expect;
chai.use(sinonChai);

class AxError implements AxiosError {
  config = {}
  isAxiosError = true
  code = "ENO"
  name = "axios"
  message = "Failure"
}

async function failsAsync(): Promise<any> {
  throw new AxError();
}

describe('retry', () => {
  let clock: sinon.SinonFakeTimers
  before(function () { clock = sinon.useFakeTimers() })
  after(function () { clock.restore() })

  it('retries 10 times and throws an error', (done) => {
    const r = new RetryAxios(10,100)
    r.on('retry', () => clock.tick(r.delay))
    r.retry(failsAsync).catch((err)=>{
      expect(err).to.be.an.instanceOf(AxError)
      expect(err.isAxiosError).to.be.true
      expect(r.attempt).to.equal(10)
      expect(r.attemptLog.length).to.equal(10)
      done()
    })
  })
})