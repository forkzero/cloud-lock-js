const Lock = require('../../index.js');
const aLock = new Lock("resourceA");
const bLock = new Lock("resourceB");

aLock.wait((lock) => {
  console.log(`doing stuff with lockId ${lock.lockId}`);
})
.catch((err) => {
  console.log("unable to get lock");
})

// bLock.wait((err, lock) => {
//   if (err) {
//     console.log(`unable to get lock for resourceB: ${err}`);
//   }
//   else {
//     console.log(`doing stuff with lockId ${lock.lockId}`);
//   }
// });
