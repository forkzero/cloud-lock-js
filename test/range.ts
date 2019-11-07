import { NumericRanges } from '../src/range';
import * as chai from 'chai';
import 'mocha';

const expect = chai.expect;

describe('NumericRanges', () => {
  let range: NumericRanges;
  before(() => {
    range = new NumericRanges([[1, 2], [7, 10]]);
  });
  it('should return false if number is outside of range', () => {
    expect(range.hasMember(99)).to.be.false;
  });
  it('should return true if number is included in the range specification', () => {
    expect(range.hasMember(1)).to.be.true;
  });
});
