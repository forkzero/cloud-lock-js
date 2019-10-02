

module.exports = class CloudLock {
	constructor(resource) {
		this.delay = 0;
		this.maxDelay = 5*1000;
		this.timeout = 60*1000;
		this.resource = resource;
		this.x = this.getRestClient();
		this.lockData = null;
	}

	getRestClient() {
		const axios = require('axios').default;
		const https = require('https');
		const httpsAgent = new https.Agent({ keepAlive: true });
		return axios.create({
			baseURL: 'https://api.forkzero.com/cloudlock',
			timeout: 2000,
			headers: {'X-ForkZero-Client': 'cloud-lock-js'},
			httpsAgent: httpsAgent
		});
	}

	lock(cb) {
		this.x.post(`/accounts/foo/resources/${this.resource}/locks`)
			.then((response) => {
				if (response.status === 201) {
					this.lockData = response.data;
					cb(null, response.data);
				}
				else if (response.status === 423) {
					cb(null, reponse.data);
				}
				else { // error 
					cb(response, null);
				}
			})
			.catch((error) => {
				cb(error, null);
			});
	}

	nextDelay(statusCode) {
		const delay = this.delay;
		if (delay === 0) {
			this.delay = 100;
		}
		else {
			this.delay = delay * 2;
			if (this.delay > this.maxDelay) {
				this.delay = this.maxDelay;
			}
		}
		console.log(`[${statusCode}] retry delay = ${delay}, next = ${this.delay}`);
		return delay;
	}

	async wait(callback) {
		const my = this;
		let retryTimer;

		// setup the timout
		const timerId = setTimeout(()=>{
			console.log("timeout reached");
			clearTimeout(retryTimer);
			my.delay = 0;
			throw new Error({status: "TimedOut"});
		}, my.timeout);

		// try to get a lock	
		console.log("trying to get lock");
		my.lock((err, result)=>{
			if (err) {
				console.log(err);
				setTimeout(function loop() {
					console.log("attempting to get lock");
					my.lock((err, result)=> {
						if (err) { // try again after a delay
							console.log("no luck, will retry");
							retryTimer = setTimeout(loop, my.nextDelay());
						} 
						else {
							clearTimeout(timerId);
							my.delay = 0;
							callback(result);
						}
					});
				}, my.nextDelay());
			}
			else { 
				clearTimeout(timerId);
				my.delay = 0;
				callback(result);
			}
		});
	}

};



