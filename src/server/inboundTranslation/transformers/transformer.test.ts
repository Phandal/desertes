import { describe, it } from 'node:test';
import assert from 'node:assert';
import { noOp } from './nooptransformer.js';
import { isDateFormatTransformer, dateFormat } from './dateformattransformer.js';
import { isPercentFormatTransformer, percentFormat } from './percentformattransformer.js';
import { isImpliedDecimalTransformer, impliedDecimal } from './impliedecimaltransformer.js';
import { ApplicatorResult } from '../types.js';

describe('noOpTransformer', () => {
  it('noOp', () => {
    const result = 'test';
    const transformer = noOp;

    const got = transformer(result);

    assert.strictEqual(got, result);
  });

  it('noOp::array', () => {
    const result = [{ test: 'test' }];
    const transformer = noOp;

    const got = transformer(result);

    assert.strictEqual(got, result);
  });
});

describe('dateFormatTransformer', () => {
  it('isDateFormatTransformer', () => {
    assert(isDateFormatTransformer({ dateFormat: { inFormat: '', outFormat: '' } }) === true);
    assert(isDateFormatTransformer(undefined) === false);
  });

  it('dateFormat', () => {
    const result = '20251231';
    const transformer = dateFormat({ dateFormat: { inFormat: 'yyyyMMdd', outFormat: 'MM-dd-yyyy' } });

    const got = transformer(result);
    const want = '12-31-2025';

    assert.deepEqual(got, want);
  });

  it('dateFormat::non-string', () => {
    const transformer = dateFormat({ dateFormat: { inFormat: 'yyyyMMdd', outFormat: 'MM-dd-yyyy' } });

    assert.throws(() => transformer([]), `Cannot dateFormat non-string value: '[]'`);
  });
});

describe('percentFormatTransformer::percent', () => {
  it('isPercentFormatTransformer', () => {
    assert(isPercentFormatTransformer({ percentFormat: { inFormat: 'percent' } }) === true);
    assert(isPercentFormatTransformer(undefined) === false);
  });

  it('percentFormat::percent', () => {
    const result = '8';
    const transformer = percentFormat({ percentFormat: { inFormat: 'percent' } });

    const got = transformer(result);
    const want = '0.08';

    assert.deepEqual(got, want);
  });

  it('percentFormat::decimal', () => {
    const result = '.08';
    const transformer = percentFormat({ percentFormat: { inFormat: 'decimal' } });

    const got = transformer(result);
    const want = '0.08';

    assert.deepEqual(got, want);
  });

  it('percentFormat::zero', () => {
    const result = '0';
    const transformer = percentFormat({ percentFormat: { inFormat: 'percent' } });

    const got = transformer(result);
    const want = '0';

    assert.deepEqual(got, want);
  });

  it('percentFormat::non-number', () => {
    const result = '401K';
    const transformer = percentFormat({ percentFormat: { inFormat: 'percent' } });

    assert.throws(() => transformer(result), `Cannot percentFormat non-number value: '401K'`);
  });

  it('percentFormat::empty-string', () => {
    const result = '';
    const transformer = percentFormat({ percentFormat: { inFormat: 'percent' } });

    assert.throws(() => transformer(result), `Cannot percentFormat non-number value: '401K'`);
  });

  it('percentFormat::null', () => {
    const result = null;
    const transformer = percentFormat({ percentFormat: { inFormat: 'percent' } });

    assert.throws(() => transformer(result), `Cannot percentFormat non-number value: '401K'`);
  });

  it('percentFormat::empty-array', () => {
    const result: ApplicatorResult = [];
    const transformer = percentFormat({ percentFormat: { inFormat: 'percent' }, property: 'num' });

    const got = transformer(result);
    const want: ApplicatorResult = [];

    assert.deepEqual(got, want);
  });

  it('percentFormat::arry', () => {
    const result = [{ number: '8' }, { number: '10' }];
    const transformer = percentFormat({ percentFormat: { inFormat: 'percent' }, property: 'number' });

    const got = transformer(result);
    const want = [{ number: '0.08' }, { number: '0.1' }];

    assert.deepEqual(got, want);
  });
});

describe('impliedDecimalTransformer', () => {
  it('isImpliedDecimalTransformer', () => {
    assert(isImpliedDecimalTransformer({ impliedDecimal: { places: 2 } }) === true);
    assert(isImpliedDecimalTransformer(undefined) === false);
  });

  it('impliedDecimal::places-2', () => {
    const result = '00000000500';
    const transformer = impliedDecimal({ impliedDecimal: { places: 2 } });

    const got = transformer(result);
    const want = '5';

    assert.deepEqual(got, want);
  });

  it('impliedDecimal::places-4', () => {
    const result = '00000000500';
    const transformer = impliedDecimal({ impliedDecimal: { places: 4 } });

    const got = transformer(result);
    const want = '0.05';

    assert.deepEqual(got, want);
  });

  it('impliedDecimal::zero', () => {
    const result = '00000000000';
    const transformer = impliedDecimal({ impliedDecimal: { places: 2 } });

    const got = transformer(result);
    const want = '0';

    assert.deepEqual(got, want);
  });

  it('impliedDecimal::empty-array', () => {
    const result: ApplicatorResult = [];
    const transformer = impliedDecimal({ impliedDecimal: { places: 2, property: 'amount' } });

    const got = transformer(result);
    const want: ApplicatorResult = [];

    assert.deepEqual(got, want);
  });

  it('impliedDecimal::arry', () => {
    const result = [{ amount: '00000000500' }, { amount: '00000012345' }];
    const transformer = impliedDecimal({ impliedDecimal: { places: 2, property: 'amount' } });

    const got = transformer(result);
    const want = [{ amount: '5' }, { amount: '123.45' }];

    assert.deepEqual(got, want);
  });

  it('impliedDecimal::non-number', () => {
    const result = '401K';
    const transformer = impliedDecimal({ impliedDecimal: { places: 2 } });

    assert.throws(() => transformer(result), `Cannot impliedDecimal non-number value: '401K'`);
  });

  it('impliedDecimal::empty-string', () => {
    const result = '';
    const transformer = impliedDecimal({ impliedDecimal: { places: 2 } });

    assert.throws(() => transformer(result), `Cannot impliedDecimal non-number value: '401K'`);
  });

  it('impliedDecimal::null', () => {
    const result = null;
    const transformer = impliedDecimal({ impliedDecimal: { places: 2 } });

    assert.throws(() => transformer(result), `Cannot impliedDecimal non-number value: '401K'`);
  });
});
