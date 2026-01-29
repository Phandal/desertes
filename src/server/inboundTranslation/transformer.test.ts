import { describe, it } from 'node:test';
import assert from 'node:assert';
import { noOp } from './transformers/nooptransformer.js';
import { isDateFormatTransformer, dateFormat } from './transformers/dateformattransformer.js';
import { isPercentFormatTransformer, percentFormat } from './transformers/percentformattransformer.js';
import { ApplicatorResult } from './types.js';

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
