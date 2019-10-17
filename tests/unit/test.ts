import CloudLock from '../../index';
import * as chai from 'chai';
import 'mocha';
import * as sinon from 'sinon';
import sinonChai from 'sinon-chai';
import moxios from 'moxios';

const expect = chai.expect;
chai.use(sinonChai);

const aLock = new CloudLock("resourceA");
const bLock = new CloudLock("resourceB", {ttl: 100});

describe("config", () => {
  it('should allow ttl and timeout', () => {
    const resource = new CloudLock("foo", {ttl: 200, timeout: 300});
    expect(resource.getConfig().ttl).to.be.equal(200);
    expect(resource.getConfig().timeout).to.be.equal(300);
  })
  it('should dissalow unsupported config option', ()=>{
    // @ts-ignore: invalid argument
    expect( ()=> new CloudLock("foo", {bar: 200}) ).to.throw(/Invalid config/);
  })
})
describe("lock", () => {
  let resource: CloudLock; 
  beforeEach(function () {
    resource = new CloudLock("resourceA");
    moxios.install(resource.restLockClient);
  })
  afterEach(function () {
    moxios.uninstall(resource.restLockClient);
  })
  it('should throw error when status=200', (done) => {
    moxios.stubRequest(/./, { status: 200, statusText: 'OK', responseText: 'hello'} );
    const lockSpy = sinon.spy();
    resource.lock().catch(lockSpy);
    moxios.wait( () => {
      expect(lockSpy).to.be.calledOnce;
      done()
    })
  })
  it('should return CloudLockResult when status=201', (done) => {
    moxios.stubRequest(/./, { status: 201, statusText: 'Created', responseText: 'hello'} );
    const lockSpy = sinon.spy();
    resource.lock().then(lockSpy);
    moxios.wait( () => {
      expect(lockSpy).to.be.calledOnce;
      done()
    })
  })
})
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
