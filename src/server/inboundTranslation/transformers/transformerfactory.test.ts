import { describe, it } from 'node:test';
import assert from 'node:assert';

import { createTransformer } from './transformerfactory.js';
import { noOp } from './nooptransformer.js';

describe('transformerFactory', () => {
  it('createTransformer::dateFormat', () => {
    const transformer = createTransformer({ path: '', output: '', operation: 'set', transform: { dateFormat: { inFormat: 'yyyymmdd', outFormat: 'yyyy-mm-dd' } } });
    assert(typeof transformer === 'function');
    assert(transformer !== noOp);
  });

  it('createTransformer::percentFormat', () => {
    const transformer = createTransformer({ path: '', output: '', operation: 'set', transform: { percentFormat: { inFormat: 'decimal' } } });
    assert(typeof transformer === 'function');
    assert(transformer !== noOp);
  });

  it('createTransformer::impliedDecimal', () => {
    const transformer = createTransformer({ path: '', output: '', operation: 'set', transform: { impliedDecimal: { places: 2 } } });
    assert(typeof transformer === 'function');
    assert(transformer !== noOp);
  });

  it('createTransformer::noOp', () => {
    const transformer = createTransformer({ path: '', output: '', operation: 'set' });
    assert(typeof transformer === 'function');
    assert(transformer === noOp);
  });
});
