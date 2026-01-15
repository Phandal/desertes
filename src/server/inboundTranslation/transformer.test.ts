import { describe, it } from 'node:test';
import assert from 'node:assert';
import { noOp } from './transformers/nooptransformer.js';
import { isDateFormatTransformer, dateFormat } from './transformers/dateformattransformer.js';

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

    assert.throws(() => transformer([]));
  });
});
