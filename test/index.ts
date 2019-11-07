import { CloudLock } from '../src/index';
import * as chai from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import * as nock from 'nock';
import * as chaiAsPromised from 'chai-as-promised';

const expect = chai.expect;
chai.use(sinonChai);
chai.use(chaiAsPromised);
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

describe('retry-able methods', ()=>{
  let clock: sinon.SinonFakeTimers;
  let resource: CloudLock;
  let scope: nock.Scope;
  beforeEach(()=>{
    scope = nock('https://api.forkzero.com');
    clock = sinon.useFakeTimers();
    resource = new CloudLock('resourceA');
    resource.on('retry', (timing)=>{
      clock.tick(timing.delay+timing.jitter);
    });
  });
  afterEach(()=>{
    clock.restore();
    scope.done();
    nock.cleanAll();
    nock.restore();
    nock.activate();
  });
  describe('lock', ()=>{
    it('should throw error when status=200', done => {
      scope
        .post(/locks/)
        .times(3)
        .reply(200, 'OK');
      resource.lock().catch(error => {
        expect(error).to.be.instanceOf(Error);
        done();
      });
    });
    it('should return CloudLockResult with lockId when status=201', done => {
      scope
      .post(/locks/)
      .times(1)
      .reply(201, { lockId: 'abcd-1234' });
      resource.lock().then(result => {
        expect(result).to.have.property('lockId');
        done();
      });
    });
  });
  it('should handle ECONNREFUSED or ECONNABORTED', done => {
    scope
    .post(/locks/)
    .times(3)
    .replyWithError({isAxiosError: true, code: 'ECONNREFUSED', response: undefined});
    resource.lock().catch(error => {
      expect(error).to.have.property('code');
      expect(error.code).to.be.eq('ECONNREFUSED');
      done();
    });
  });
  describe('wait', () => {
    it('should retry 10 times and return a lock object that is not granted', done => {
      scope
        .post(/locks/)
        .times(10)
        .reply(423, { status: 'denied' });
      resource.wait(10).then(response => {
        expect(resource.granted()).to.be.false;
        done();
      });
    });
  });
  describe('unlock', () => {
    it('will return the lock if locked', done => {
      scope
      .post(/locks/)
      .reply(201, { lockId: 'abcd-1234', status: 'granted' });
      scope
      .delete(/locks/)
      .reply(200, "OK");
      resource.lock().then(lock => {
        if (resource.granted()) {
          resource.unlock().then(result => {
            expect(result).to.be.true;
            done();
          });
        }
      });
    });
    it('will throw error if not locked', () => {
      return expect(resource.unlock()).to.be.rejectedWith(/NoActiveLock/);
    });
    it('will throw an error if all retries were unsuccessful', (done) => {
      scope
      .delete(/locks/)
      .times(3)
      .reply(500, "Internal Server Error");
      scope
      .post(/locks/)
      .reply(201, {status: "granted", lockId: "abcd-1234"});
      resource.lock()
      .then(async (lock) => {
        await expect(resource.unlock()).to.be.rejectedWith(/Request failed with status code 500/);
        done();
      })
    });
  });
});
