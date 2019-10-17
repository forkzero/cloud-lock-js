import CloudLock from '../../index';
const aLock = new CloudLock("resourceA");
const bLock = new CloudLock("resourceB", {ttl: 100});
const CLock = new CloudLock("resourceC");

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
*/

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
