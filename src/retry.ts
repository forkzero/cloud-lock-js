import {AxiosResponse, AxiosError} from 'axios';
import {EventEmitter} from 'events';

interface Attempt {
  clientTimeEpoch: number,
  attempt: number;
  delay: number;
  jitter: number;
  isAxiosError: boolean;
  code: string | null;
  status: number | null;
  statusText: string | null;
}

export class RetryAxios extends EventEmitter {
  defaults = {
    delay: 500 // delay 500ms
  }
  attemptLog: Array<Attempt> = [];
  maxRetries: number = 100;
  delay: number = 200; // starting delay, in ms
  jitter: number = 0;  // jitter, in ms
  attempt: number = 0; // counter for number of attemps made
  retryTimer: NodeJS.Timeout | undefined;
  constructor(max: number, delay: number) {
    super();
    this.maxRetries = max;
    this.delay = delay;
    if (delay <= 0) {
      throw new Error("delay must be a positive number");
    }
  }

  retry = (fn: Function): Promise<AxiosResponse> => new Promise((resolve, reject) => {
      this.runFunction(fn, resolve, reject);
  });

  runFunction(fn:Function, resolve: Function, reject: Function) {
      this.attempt++;
      let isException = false
    
      // call the provided function
      fn()

      .then((axResponse: AxiosResponse) => {

        // log the attempt and the result
        this.logAttempt(axResponse)

        // determine if a retry is necessary
        if (this.shouldRetry(axResponse)) {

          // perform the retry
          this.incrementDelay(isException)
          this.retryTimer = setTimeout(() => this.runFunction(fn, resolve, reject), this.delay+this.jitter)
          this.emit('retry')
        }
        else {

          // no more retries, return the response
          resolve(axResponse)
          this.emit('success')
        }  
      })

      .catch((err: AxiosError) => {

        // log the attempt and the error
        this.logAttemptError(err)

        // determine if a retry is necessary
        if (this.shouldRetryError(err)) {

          // perform the retry
          const isException = true
          this.incrementDelay(isException)
          this.retryTimer = setTimeout(() => this.runFunction(fn, resolve, reject), this.delay+this.jitter)
          this.emit('retry')
        }
        else {

          // no more retries, return the error
          reject(err)
          this.emit('unsuccessful')
        }
      })
  }

  incrementDelay(isAxiosError: boolean) {
    this.jitter = Math.floor(Math.random() * 100)
    if (isAxiosError) {
      this.delay = this.delay * 2
    }
    else {
      this.delay = this.delay * 2
    }
  }

  shouldRetry(result: AxiosResponse): boolean {
    return (this.attempt >= this.maxRetries) ? false :
      (result.status === 423)
  }
  shouldRetryError(error: AxiosError): boolean {
    return (this.attempt >= this.maxRetries) ? false :
      (error.isAxiosError) 
      || (error.response!.status === 500)
  }
  logAttempt(ax: AxiosResponse) {
    const attempt: Attempt = {
      clientTimeEpoch: Date.now(),
      attempt: this.attempt,
      delay: this.delay,
      jitter: this.jitter,
      isAxiosError: false,
      code: null,
      status: ax.status,
      statusText: ax.statusText
    }
    this.attemptLog.push(attempt)
    console.log(attempt)
  }

  logAttemptError(err: AxiosError) {
    const attempt: Attempt = {
      clientTimeEpoch: Date.now(),
      attempt: this.attempt,
      delay: this.delay,
      jitter: this.jitter,
      isAxiosError: err.isAxiosError,
      code: err.code !== 'undefined' ? err.code! : null,
      status: err.isAxiosError ? null : err.response!.status,
      statusText: err.isAxiosError ? null : err.response!.statusText
    }
    this.attemptLog.push(attempt);
    console.log(attempt);
  }
}