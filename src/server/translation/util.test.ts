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

  it('walkObjectWithDotNotationj', () => {
    const obj = {
      age: 27,
      member: {
        name: 'name',
        'prop with space': 'prop with space',
      },
    };

    assert.deepEqual(util.walkObjectWithDotNotation('age', obj), 27);
    assert.deepEqual(util.walkObjectWithDotNotation('member.name', obj), 'name');
    assert.deepEqual(util.walkObjectWithDotNotation('doesnotexist', obj), undefined);
    assert.deepEqual(util.walkObjectWithDotNotation('member.doesnotexist', obj), undefined);
    assert.deepEqual(util.walkObjectWithDotNotation('member.prop with space', obj), 'prop with space');
  });
});
