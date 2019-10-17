import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { EventEmitter } from 'events';

interface CloudLockConfigOptions {
	ttl?: number;
	timeout?: number;
}

class CloudLockConfig implements CloudLockConfigOptions {
	ttl: number = 5;
	timeout: number = 60*1000;
	constructor(config: CloudLockConfigOptions) {
		// assert all config options are supported
		let invalidProperties = Object.keys(config).filter(key => Object.keys(this).indexOf(key)<0);
		if (invalidProperties.length>0) {
			throw new Error(`Invalid config properties: ${invalidProperties}`);
		} 
		Object.assign(this, config);
	}
}

interface CloudLockResult {
	status: string
	lockId: string
	account: string
	resource: string
	createTimeEpoch: number
	expireTimeEpoch: number
	ttl: number
}

export default class CloudLock extends EventEmitter {
	config: CloudLockConfig;
	resource: string;
	delay: number = 0;
	maxDelay: number = 5*1000;
	retryTimer: NodeJS.Timeout | undefined = undefined;
	timeoutTimer: NodeJS.Timeout | undefined = undefined;
	restClient: AxiosInstance = this.getRestClient();
	restLockClient: AxiosInstance = this.getRestLockClient();
	lockData: CloudLockResult | undefined = undefined;
	httpsKeepAliveAgent = new https.Agent({ keepAlive: true });
	constructor(resource: string, config: CloudLockConfigOptions = {}) {
		super();
		this.config = new CloudLockConfig(config);
		this.resource = resource;
	}
	
	getConfig() {
		return this.config;
	}
	
	getRestClient() {
		return axios.create({
			baseURL: 'https://api.forkzero.com/cloudlock',
			timeout: 2000,
			headers: {'X-ForkZero-Client': 'cloud-lock-js'},
			httpsAgent: this.httpsKeepAliveAgent,
		});
	}

	getRestLockClient() {
		const c = this.getRestClient();
		c.defaults.validateStatus = (status) => { 
			return status === 201 || status === 423; // Reject only if the status code is not 201 or 423
		}
		return c;
	}

	granted(): boolean {
		if (this.lockData) {
			return this.lockData.status === "granted";
		}
		return false;
	}

	clearRetry() {
		if (typeof this.timeoutTimer !== 'undefined') {
			clearTimeout(this.timeoutTimer);
		}
		if (typeof this.retryTimer !== 'undefined') {
			clearTimeout(this.retryTimer);
		}
		this.delay = 0;
	}

	async lock(): Promise<CloudLockResult> {
		this.lockData = undefined;
		try {
			const response = await this.restLockClient.post(`/accounts/foo/resources/${this.resource}/locks?ttl=${this.config.ttl}`);
			console.log(`[${this.resource}] status=${response.status} statusText=${response.statusText}`);
			this.lockData = response.data;
			if (this.granted()) {
				this.emit('lock', response.data);
			}
			return response.data;
		} catch (error) {
			throw new Error(error);
		}
	}

	lockWithTimeout(resolve: Function, reject: Function) {
		this.retryTimer = setTimeout(async () => {
			try {
				await this.lock();
				if (this.granted()) {
					this.clearRetry();
					resolve(this.lockData);
				}
				else {
					this.emit('retry', this.lockData);
					this.lockWithTimeout(resolve, reject);
				}
			} catch (error) {
				this.emit('retryError', error);
				this.lockWithTimeout(resolve, reject);
			}
		}, this.nextDelay());
	}

	wait(): Promise<CloudLockResult> {
		this.lockData = undefined;
		return new Promise((resolve, reject) => {

			// setup the overall timout
			this.timeoutTimer = setTimeout( () => {
				this.clearRetry();
				this.emit('timeout');
				reject(new Error("TimedOut"));
			}, this.config.timeout);

			// try to get a lock
			this.lockWithTimeout(resolve, reject);
		});
	}

	nextDelay() {
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
		console.log(`retry delay = ${delay}, next = ${this.delay}`);
		return delay;
	}

};
