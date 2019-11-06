import axios, { AxiosInstance, AxiosError } from 'axios';
import * as https from 'https';
import { EventEmitter } from 'events';
import * as rax from 'retry-axios';
import { RetryAxios } from './retry';

// import * as AWSXRay from 'aws-xray-sdk';
// const httpsXray = AWSXRay.captureHTTPs(https);

interface CloudLockConfigOptions {
  ttl?: number;
  timeout?: number;
}

class CloudLockConfig implements CloudLockConfigOptions {
  ttl = 5;
  timeout: number = 60 * 1000;
  constructor(config: CloudLockConfigOptions) {
    // assert all config options are supported
    const invalidProperties = Object.keys(config).filter(
      key => Object.keys(this).indexOf(key) < 0
    );
    if (invalidProperties.length > 0) {
      throw new Error(`Invalid config properties: ${invalidProperties}`);
    }
    Object.assign(this, config);
  }
}

interface CloudLockResult {
  status: string;
  lockId: string;
  account: string;
  resource: string;
  createTimeEpoch: number;
  expireTimeEpoch: number;
  ttl: number;
}

export class CloudLock extends EventEmitter {
  config: CloudLockConfig;
  resource: string;
  restClient: AxiosInstance = this.createRestClient();
  restClientRetryStrategy: RetryAxios = new RetryAxios({maxRetries: 3});
  restClientRetryConfig: rax.RetryConfig = {
    retry: 3,
    noResponseRetries: 3,
    retryDelay: 100,
    httpMethodsToRetry: ['GET', 'HEAD', 'OPTIONS', 'DELETE', 'PUT', 'POST'],
    statusCodesToRetry: [[100, 199], [423, 423], [429, 429], [500, 599]],
  };
  restLockClient: AxiosInstance = this.createRestLockClient();
  restLockClientRetryStrategy = new RetryAxios({maxRetries: 100});
  lockData: CloudLockResult | undefined = undefined;
  httpsKeepAliveAgent = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 5 * 1000,
  });
  constructor(resource: string, config: CloudLockConfigOptions = {}) {
    super();
    this.config = new CloudLockConfig(config);
    this.resource = resource;
    rax.attach(this.restLockClient);
  }

  getConfig() {
    return this.config;
  }

  createRestClient() {
    return axios.create({
      baseURL: 'https://api.forkzero.com/cloudlock',
      timeout: 2000,
      headers: { 'X-ForkZero-Client': 'cloudlock-js' },
      httpsAgent: this.httpsKeepAliveAgent,
    });
  }

  createRestLockClient() {
    const c = this.createRestClient();
    c.defaults.validateStatus = status => {
      return status === 201 || status === 423; // Reject if the status code is not 201 or 423
    };
    return c;
  }

  granted(): boolean {
    if (this.lockData) {
      return this.lockData.status === 'granted';
    }
    return false;
  }

  _unlock = () =>
    this.restClient.delete(
      `/accounts/foo/resources/${this.resource}/locks/${this.lockData!.lockId}`
    );
	_unlockRetry = () => new RetryAxios({maxRetries: 3}).retry(this._unlock);

  async unlock(): Promise<boolean> {
    if (
      typeof this.lockData === 'undefined' ||
      typeof this.lockData.lockId === 'undefined'
    ) {
      throw new Error('NoActiveLock');
    }
    try {
      const result = await this._unlockRetry();
    } catch (error) {
      throw error;
    }
    return true;
  }

  _lock = () =>
    this.restLockClient.post(
      `/accounts/foo/resources/${this.resource}/locks?ttl=${this.config.ttl}`
    );
  _lockRetry = () => new RetryAxios({
		maxRetries: 3, 
		statusCodesToRetry: [[100, 200], [423, 423], [429, 429], [500, 599]]
	}).retry(this._lock);

  async lock(): Promise<CloudLockResult> {
    this.lockData = undefined;
    try {
      const response = await this._lockRetry();
      console.log(
        `[${this.resource}] status=${response.status} statusText=${response.statusText}`
      );
      this.lockData = response.data;
      if (this.granted()) {
        this.emit('lock', response.data);
      }
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  _wait = (retries?: number) => new RetryAxios({maxRetries: retries, notifier: this}).retry(this._lock);

  async wait(retries?: number): Promise<CloudLockResult> {
    try {
      const response = await this._wait(retries);
      return response.data;
    } catch (error) {
      throw error;
    }
  }
}
