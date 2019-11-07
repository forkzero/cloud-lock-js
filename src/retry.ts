import { AxiosResponse, AxiosError } from 'axios';
import { EventEmitter } from 'events';
import { NumericRanges } from './range';

interface Attempt {
  message: string;
  method: string;
  clientTimeEpoch: number;
  attempt: number;
  delay: number;
  jitter: number;
  isAxiosError: boolean;
  code: string | null;
  status: number | null;
  statusText: string | null;
  willRetry: boolean;
}

interface RetryOptions {
  maxRetries: number;
  maxRetriesNoResponse: number;
  maxDelay: number;
  initialDelay: number;
  httpMethodsToRetry: string[];
  statusCodesToRetry: number[][];
  notifier: EventEmitter;
}

export class RetryAxios extends EventEmitter {
  defaults: RetryOptions = {
    maxRetries: 10,
    maxRetriesNoResponse: 3,
    maxDelay: 3 * 60 * 1000,
    initialDelay: 100, // milliseconds
    httpMethodsToRetry: ['POST', 'DELETE', 'GET'],
    statusCodesToRetry: [
      // https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
      // 1xx - Retry (Informational, request still processing)
      // 2xx - Do not retry (Success)
      // 3xx - Do not retry (Redirect)
      // 4xx - Do not retry (Client errors)
      // 423 - Retry ("Locked")
      // 429 - Retry ("Too Many Requests")
      // 5xx - Retry (Server errors)
      [100, 199],
      [423, 423],
      [429, 429],
      [500, 599],
    ],
    notifier: this,
  };
  attemptLog: Attempt[] = [];
  retryRange: NumericRanges;
  delay = 0; // starting delay, in ms
  jitter = 0; // jitter, in ms
  attempt = 0; // counter for number of attemps made
  retryTimer: NodeJS.Timeout | undefined;
  config: RetryOptions;
  constructor(config: Partial<RetryOptions> = {}) {
    super();
    this.config = { ...this.defaults, ...config };
    this.retryRange = new NumericRanges(this.config.statusCodesToRetry);
  }

  retry = (fn: Function): Promise<AxiosResponse> =>
    new Promise((resolve, reject) => {
      this.runFunction(fn, resolve, reject);
    });

  runFunction(fn: Function, resolve: Function, reject: Function) {
    this.attempt++;
    const isException = false;

    // call the provided function
    fn()
      .then((axResponse: AxiosResponse) => {
        // log the attempt and the result
        this.logAttempt(axResponse);

        // determine if a retry is necessary
        if (this.shouldRetry(axResponse)) {
          // perform the retry
          this.incrementDelay(isException);
          this.retryTimer = setTimeout(
            () => this.runFunction(fn, resolve, reject),
            this.delay + this.jitter
          );
          this.emitRetry();
        } else {
          // no more retries, return the response
          resolve(axResponse);
          this.config.notifier.emit('complete', axResponse);
        }
      })

      .catch((err: AxiosError) => {
        // log the attempt and the error
        this.logAttemptError(err);

        // determine if a retry is necessary
        if (this.shouldRetryError(err)) {
          // perform the retry
          const isException = true;
          this.incrementDelay(isException);
          this.retryTimer = setTimeout(
            () => this.runFunction(fn, resolve, reject),
            this.delay + this.jitter
          );
          this.emitRetry();
        } else {
          // no more retries, return the error
          reject(err);
          this.config.notifier.emit('unsuccessful', err);
        }
      });
  }

  emitRetry = () =>
    this.config.notifier.emit('retry', {
      delay: this.delay,
      jitter: this.jitter,
    });

  incrementDelay(isAxiosError: boolean) {
    this.jitter = Math.floor(Math.random() * 100);
    if (this.delay === 0) {
      this.delay = this.defaults.initialDelay;
    } else if (isAxiosError) {
      this.delay = this.delay * 2;
    } else {
      this.delay = this.delay * 2;
    }
    if (this.delay > this.defaults.maxDelay) {
      this.delay = this.defaults.maxDelay;
    }
  }

  inMethod(method: string): boolean {
    return this.config.httpMethodsToRetry.indexOf(method.toUpperCase()) >= 0;
  }

  inRange = (status: number): boolean => this.retryRange.hasMember(status);

  shouldRetry = (result: AxiosResponse): boolean => {
    if (this.attempt >= this.config.maxRetries) {
      console.log(`max retries (${this.config.maxRetries}) exceeded`);
      return false;
    } else if (!this.inRange(result.status)) {
      console.log(`status ${result.status} is not on retry list`);
      return false;
    } else if (!this.inMethod(result.request.method)) {
      console.log(`method ${result.request.method} is not on retry list`);
      return false;
    } else {
      return true;
    }
  };

  shouldRetryError(error: AxiosError): boolean {
    return this.attempt >= this.config.maxRetries
      ? false
      : error.isAxiosError || error.response!.status === 500;
  }

  logAttempt(ax: AxiosResponse) {
    const attempt: Attempt = {
      message: 'OK',
      method: ax.request.method,
      clientTimeEpoch: Date.now(),
      attempt: this.attempt,
      delay: this.delay,
      jitter: this.jitter,
      isAxiosError: false,
      code: null,
      status: ax.status,
      statusText: ax.statusText,
      willRetry: this.shouldRetry(ax),
    };
    this.attemptLog.push(attempt);
    console.log(JSON.stringify(attempt));
  }

  logAttemptError(err: AxiosError) {
    const attempt: Attempt = {
      message: err.message,
      method: err.isAxiosError ? null : err.request.method,
      clientTimeEpoch: Date.now(),
      attempt: this.attempt,
      delay: this.delay,
      jitter: this.jitter,
      isAxiosError: err.isAxiosError,
      code: err.code !== 'undefined' ? err.code! : null,
      status: err.isAxiosError ? null : err.response!.status,
      statusText: err.isAxiosError ? null : err.response!.statusText,
      willRetry: this.shouldRetryError(err),
    };
    this.attemptLog.push(attempt);
    console.log(JSON.stringify(attempt));
  }
}
