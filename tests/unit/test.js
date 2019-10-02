const Lock = require('../../index.js');
const aLock = new Lock("resourceA");
const bLock = new Lock("resourceB");

aLock.wait((lock) => {
  console.log(`doing stuff with lockId ${lock.lockId}`);
  console.log(lock);
  setTimeout(() => {
    console.log(`done with lock ${lock.lockId}`);
  }, 2000);
})
.catch((err) => {
  console.log("unable to get lock");
  console.log(err);
})

// bLock.wait((err, lock) => {
//   if (err) {
//     console.log(`unable to get lock for resourceB: ${err}`);
//   }
//   else {
//     console.log(`doing stuff with lockId ${lock.lockId}`);
//   }
// });
