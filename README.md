# cloudlock-js
JavaScript client for the FORKZERO Cloud Lock service

# Lock for Distributed Computing

Obtain a lock
```javascript
const resource = new CloudLock('myresource');
resource.lock((lock => {
  if (resource.locked) {
    // do stuff
    resource.unlock();
  } 
});
```

Obtain a lock with progressive retries, up to timeout
```javascript
const resource = new CloudLock('s3:my-bucket/my-file');
resource.wait()
  .then(lock=>{
    if (lock.locked) {
      // do stuff
      lock.unlock();
    }
  })
  .catch(error => {
    // unable to obtain lock before timeout
  })
```

Event-based Interface
```javascript
const process = new CloudLock('my-business-process');
process.wait();
process.on('lock', lock => {
  if (lock.locked) {
    // do stuff
  }
  process.unlock();
})

process.on('timeout', () => {
  // want to try again?
  process.wait();
})
```