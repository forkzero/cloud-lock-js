export class NumericRanges {
  config: number[][];
  result: { [key: number]: boolean } = {};
  constructor(config: number[][]) {
    this.config = config;
    this.result = this.expand(this.config);
  }
  expand(input: number[][]) {
    const output: { [key: number]: boolean } = {};
    this.config.forEach(x => this.range(x[0], x[1], output));
    return output;
  }
  range(start: number, end: number, result: { [key: number]: boolean }) {
    for (let i = start; i <= end; i++) {
      result[i] = true;
    }
  }
  hasMember(x: number) {
    return this.result.hasOwnProperty(x) ? this.result[x] : false;
  }
}
