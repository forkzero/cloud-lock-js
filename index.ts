import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import * as https from 'https';
import { EventEmitter } from 'events';
import { rejects } from 'assert';

interface CloudLockConfig {
	ttl?: number;
	timeout?: number;
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
	delay: number = 0;
	maxDelay: number = 5*1000;
	timeout: number;
	retryTimer: NodeJS.Timeout | undefined = undefined;
	timeoutTimer: NodeJS.Timeout | undefined = undefined;
	ttl: number;
	resource: string;
	x: AxiosInstance;
	lockData: CloudLockResult | undefined;
	constructor(resource: string, config: CloudLockConfig = {} as CloudLockConfig) {
		super();
		let {
			ttl = 5,
			timeout = 60*1000
		} = config;
		this.resource = resource;
		this.ttl = ttl;
		this.timeout = timeout;
		this.x = this.getRestClient();
		this.lockData = undefined;
	}
	
	getConfig() {
		return { ttl: this.ttl, timeout: this.timeout } as CloudLockConfig;
	}

	getRestClient() {
		const httpsAgent = new https.Agent({ keepAlive: true });
		return axios.create({
			baseURL: 'https://api.forkzero.com/cloudlock',
			timeout: 2000,
			headers: {'X-ForkZero-Client': 'cloud-lock-js'},
			httpsAgent: httpsAgent,
			validateStatus: function (status) {
				return status === 201 || status === 423; // Reject only if the status code is not 201 or 423
			}
		});
	}

	async lock(): Promise<CloudLockResult> {
		try {
			const response = await this.x.post(`/accounts/foo/resources/${this.resource}/locks?ttl=${this.ttl}`);
			console.log(`status=${response.status}`);
			return response.data;
		} catch (error) {
			throw error;
		}
	}

	lockWithTimeout(resolve: Function, reject: Function) {
		this.retryTimer = setTimeout(async () => {
			try {
				const result = await this.lock();
				if (result.status === 'granted') {
					if (typeof this.timeoutTimer !== 'undefined') {
						clearTimeout(this.timeoutTimer);
					}
					this.delay = 0;
					this.emit('lock', result);
					resolve(result);
				}
				else {
					this.emit('retry', result);
					this.lockWithTimeout(resolve, reject);
				}
			} catch (error) {
				this.emit('error', error);
				this.lockWithTimeout(resolve, reject);
			}
		}, this.nextDelay());
	}

	wait(): Promise<CloudLockResult> {
		return new Promise((resolve, reject) => {
			// setup the overall timout
			this.timeoutTimer = setTimeout(()=>{
				if (typeof this.retryTimer !== 'undefined') {
					clearTimeout(this.retryTimer);
				}
				this.delay = 0;
				this.emit('timeout');
				reject(new Error("TimedOut"));
			}, this.timeout);

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
