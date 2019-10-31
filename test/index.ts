import { CloudLock } from '../src/index';
import { RetryAxios } from '../src/retry';
import * as chai from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as nock from 'nock';
import { AxiosError } from 'axios';

const expect = chai.expect;
chai.use(sinonChai);
nock.disableNetConnect();

describe('config', () => {
  it('should allow ttl and timeout', () => {
    const resource = new CloudLock('foo', { ttl: 200, timeout: 300 });
    expect(resource.getConfig().ttl).to.be.equal(200);
    expect(resource.getConfig().timeout).to.be.equal(300);
  });
  it('should dissalow unsupported config option', () => {
    // tslint:disable-next-line:ban-ts-ignore
    // @ts-ignore: invalid argument
    expect(() => new CloudLock('foo', { bar: 200 })).to.throw(/Invalid config/);
  });
});
describe('lock', () => {
  let resource: CloudLock;
  beforeEach(() => {
    resource = new CloudLock('resourceA');
  });
  it('should throw error when status=200', done => {
    const scope = nock('https://api.forkzero.com')
      .post(/locks/)
      .times(3)
      .reply(200, 'OK');
    resource.lock().catch(error => {
      scope.done();
      // expect(stub).to.be.calledThrice;
      expect(error).to.be.instanceOf(Error);
      done();
    });
  });
  it('should return CloudLockResult with lockId when status=201', done => {
    const stub = sinon.stub(resource.restLockClient, 'post').resolves({
      status: 201,
      statusText: 'Created',
      data: { lockId: 'abcd-1234' },
    });
    resource.lock().then(result => {
      expect(stub).to.be.calledOnce;
      expect(result).to.have.property('lockId');
      done();
    });
  });
  it('should handle ECONNREFUSED or ECONNABORTED', done => {
    const stub = sinon.stub(resource.restLockClient, 'post').rejects({
      isAxiosError: true,
      code: 'ECONNREFUSED',
      response: undefined,
    });
    resource.lock().catch(error => {
      expect(stub).to.be.calledThrice;
      expect(error).to.have.property('code');
      expect(error.code).to.be.eq('ECONNREFUSED');
      done();
    });
  });
});
describe('wait', () => {
  let clock: sinon.SinonFakeTimers;
  before(() => {
    clock = sinon.useFakeTimers();
  });
  after(() => {
    clock.restore();
  });
  it('should retry 9 times and throw error upon timeout', done => {
    const scope = nock('https://api.forkzero.com')
      .post(/locks/)
      .times(10)
      .reply(423, { status: 'denied' });
    const resource = new CloudLock('resourceWait');
    resource.restLockClientRetryStrategy = new RetryAxios(10, 100);

    resource.wait().then(response => {
      scope.done();
      expect(resource.granted()).to.be.false;
      console.log(response);
      done();
    });
    resource.restLockClientRetryStrategy.on('retry', () => {
      clock.tick(
        resource.restLockClientRetryStrategy.delay +
          resource.restLockClientRetryStrategy.jitter
      );
    });
  });
});
describe('unlock', () => {
  it('will return the lock if locked', done => {
    const res = new CloudLock('resourceUnlock');
    const postStub = sinon.stub(res.restLockClient, 'post').resolves({
      status: 201,
      statusText: 'Created',
      data: { lockId: 'abcd-1234', status: 'granted' },
    });
    const deleteStub = sinon.stub(res.restClient, 'delete').resolves({
      status: 200,
      statusText: 'OK',
    });
    res.lock().then(lock => {
      if (res.granted()) {
        res.unlock().then(result => {
          expect(result).to.be.true;
          expect(postStub).to.be.calledOnce;
          expect(deleteStub).to.be.calledOnce;
          done();
        });
      }
    });
  });
});
/*
aLock.lock()
  .then((data) => {
    console.log(`doing stuff with lockId ${data.lockId}`);
    console.log(data);
    setTimeout(() => {
      console.log(`done with lock ${data.lockId}`);
      aLock.wait();
    }, 1000);
  })
  .catch((error) => {
    console.log(`error found`);
    console.log(error);
  });

aLock.on('lock', (data)=>{
  console.log(`got lock:`);
  console.log(data);
});

aLock.on('retry', (data)=>{
  console.log("retrying");
});

aLock.on('error', (error)=> {
  console.log("got error");
}); 

const data = "foo";
bLock.wait()
.then(lock => {
  console.log(`got lock: ${data}`);
  console.log(lock);

})
.catch(error => {
  console.log("unable to get lock");
  console.log(error);
});

// bLock.wait((err, lock) => {
//   if (err) {
//     console.log(`unable to get lock for resourceB: ${err}`);
//   }
//   else {
//     console.log(`doing stuff with lockId ${lock.lockId}`);
//   }
// });
*/
