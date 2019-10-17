"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var index_js_1 = __importDefault(require("../../index.js"));
var aLock = new index_js_1.default("resourceA");
var bLock = new index_js_1.default("resourceB", { ttl: 10 });
var CLock = new index_js_1.default("resourceC");
aLock.lock()
    .then(function (data) {
    console.log("doing stuff with lockId " + data.lockId);
    console.log(data);
    setTimeout(function () {
        console.log("done with lock " + data.lockId);
        aLock.wait();
    }, 1000);
})
    .catch(function (error) {
    console.log("error found");
    console.log(error);
});
aLock.on('lock', function (data) {
    console.log("got lock:");
    console.log(data);
});
aLock.on('retry', function (data) {
    console.log("retrying");
});
aLock.on('error', function (error) {
    console.log("got error");
});
var data = "foo";
bLock.wait()
    .then(function (lock) {
    console.log("got lock: " + data);
    console.log(lock);
})
    .catch(function (error) {
    console.log("unable to get lock");
});
// bLock.wait((err, lock) => {
//   if (err) {
//     console.log(`unable to get lock for resourceB: ${err}`);
//   }
//   else {
//     console.log(`doing stuff with lockId ${lock.lockId}`);
//   }
// });
