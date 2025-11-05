import { describe, it } from 'node:test';
import assert from 'node:assert';

import { createMerger } from './mergers/mergerfactory.js';
import type { Rule } from './types.js';

describe('mergerFactory', () => {
  it('createMerger::fail', () => {
    assert.throws(() => createMerger({} as Rule));
  });

  it('createMerger::set', () => {
    const merger = createMerger({ when: { field: '', equals: '' }, mergeInto: { operation: 'set', path: '', output: '' } });
    assert(typeof merger === 'function');
  });

  it('createMerger::push', () => {
    const merger = createMerger({ when: { field: '', equals: '' }, mergeInto: { operation: 'push', path: '', output: '' } });
    assert(typeof merger === 'function');
  });
});
