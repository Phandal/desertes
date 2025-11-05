import { describe, it } from 'node:test';
import assert from 'node:assert';

import { groupBy, merge, createMember } from './assembler.js';

describe('groupBy', () => {
  it('groupBy::groups records by a key', () => {
    const records = [
      { id: '1', amount: '4' },
      { id: '1', amount: '60' },
      { id: '2', amount: '45' },
      { id: '3', amount: 'value' },
    ];

    const grouped = groupBy('id', records);

    const expected = {
      1: [
        { id: '1', amount: '4' },
        { id: '1', amount: '60' },
      ],
      2: [
        { id: '2', amount: '45' },
      ],
      3: [
        { id: '3', amount: 'value' },
      ],
    };

    assert.deepEqual(grouped, expected);
  });

  it('groupBy::should skip records where the key is undefined', () => {
    const records = [
      { id: '1', amount: '40' },
    ];

    const grouped = groupBy('name', records);
    const expected = {};

    assert.deepEqual(grouped, expected);
  });
});

describe('merge', () => {
  it('merge::should return an empty member if there are no rules', () => {
    const got = merge([], []);

    assert.deepEqual(got, createMember());
  });
});
