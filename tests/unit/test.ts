import CloudLock from '../../index';
import { expect } from 'chai';
import 'mocha';
const aLock = new CloudLock("resourceA");
const bLock = new CloudLock("resourceB", {ttl: 100});

describe("config", () => {
  it('should allow ttl and timeout', () => {
    const resource = new CloudLock("foo", {ttl: 200, timeout: 300});
    expect(resource.getConfig().ttl).to.be.equal(200);
    expect(resource.getConfig().timeout).to.be.equal(300);
  });
  it('should dissalow unsupported config option', ()=>{
    // @ts-ignore: invalid argument
    expect( ()=> new CloudLock("foo", {bar: 200}) ).to.throw(/Invalid config/);
  })
});
describe("lock", () => {

});
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
