import { describe, it } from 'node:test';
import assert from 'node:assert';

import { createTransformer } from './transformers/transformerfactory.js';
import { noOp } from './transformers/nooptransformer.js';

describe('transformerFactory', () => {
  it('createTransformer::dateFormat', () => {
    const transformer = createTransformer({ path: '', output: '', operation: 'set', transform: { dateFormat: { inFormat: 'yyyymmdd', outFormat: 'yyyy-mm-dd' } } });
    assert(typeof transformer === 'function');
    assert(transformer !== noOp);
  });

  it('createTransformer::noOp', () => {
    const transformer = createTransformer({ path: '', output: '', operation: 'set' });
    assert(typeof transformer === 'function');
    assert(transformer === noOp);
  });
});
