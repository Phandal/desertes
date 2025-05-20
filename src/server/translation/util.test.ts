import { describe, it } from 'node:test';
import * as assert from 'node:assert';

import * as util from './util.js';

describe('the translation util module', () => {
  it('getValidNumberOrZero', () => {
    assert.deepEqual(util.getValidNumberOrZero(undefined), 0);
    assert.deepEqual(util.getValidNumberOrZero(null), 0);
    assert.deepEqual(util.getValidNumberOrZero(''), 0);
    assert.deepEqual(util.getValidNumberOrZero(NaN), 0);
    assert.deepEqual(util.getValidNumberOrZero(0), 0);
    assert.deepEqual(util.getValidNumberOrZero(12), 12);
    assert.deepEqual(util.getValidNumberOrZero(1.2), 1.2);
  });
});
