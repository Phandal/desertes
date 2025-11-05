import { describe, it } from 'node:test';
import assert from 'node:assert';

import { isSetMerge, set } from './mergers/setmerger.js';
import { isPushMerge, push } from './mergers/pushmerger.js';
import { createMember } from './assembler.js';
import type { Deferral, Member, PushMerge, SetMerge } from './types.js';

const setMerge: SetMerge = { path: '', operation: 'set', output: '' };
const pushMerge: PushMerge = { path: '', operation: 'push', output: { key: 'value' } };

describe('setMerge', () => {
  it('isSetMerge', () => {
    assert(isSetMerge(setMerge) === true);
    assert(isSetMerge(pushMerge) === false);
  });

  it('set', () => {
    const member = createMember();
    const mergeInto: SetMerge = { path: 'ssn', operation: 'set', output: '' };

    const merger = set(mergeInto);

    const got = merger(member, 'value');
    const want: Member = { ssn: 'value', effectiveDate: '', deferrals: [], demographic: {} };
    assert.deepEqual(got, want);
  });

  it('set::unknown path', () => {
    const member = createMember();
    const mergeInto: SetMerge = { path: 'ssn.here', operation: 'set', output: '' };

    const merger = set(mergeInto);
    assert.throws(() => { merger(member, 'value'); });
  });

  it('set::deep path', () => {
    const member = createMember();
    const mergeInto: SetMerge = { path: 'demographic.city', operation: 'set', output: '' };

    const merger = set(mergeInto);
    const got = merger(member, 'pasadena');
    const want: Member = {
      ssn: '',
      effectiveDate: '',
      deferrals: [],
      demographic: {
        city: 'pasadena',
      },
    };
    assert.deepEqual(got, want);
  });
});

describe('pushMerge', () => {
  it('isPushMerge', () => {
    assert(isPushMerge(pushMerge) === true);
    assert(isPushMerge(setMerge) === false);
  });

  it('push::string output', () => {
    const member = createMember();
    const mergeInto: PushMerge = { path: 'deferrals', operation: 'push', output: '' };

    const merger = push(mergeInto);

    const got = merger(member, 'value');
    const want: Member = { ssn: '', effectiveDate: '', demographic: {}, deferrals: ['value' as unknown as Deferral] };
    assert.deepEqual(got, want);
  });

  it('push::object output', () => {
    const member = createMember();
    const mergeInto: PushMerge = { path: 'deferrals', operation: 'push', output: {} };

    const merger = push(mergeInto);

    const got = merger(member, [{ out: 'value' }]);
    const want: Member = { ssn: '', effectiveDate: '', demographic: {}, deferrals: [{ out: 'value' } as unknown as Deferral] };
    assert.deepEqual(got, want);
  });

  it('push::unknown path', () => {
    const member = createMember();
    const mergeInto: PushMerge = { path: 'unknown', operation: 'push', output: {} };

    const merger = push(mergeInto);
    assert.throws(() => merger(member, ''));
  });

  it('push::deep path', () => {
    const member = {
      ssn: '',
      effectiveDate: '',
      deferrals: [],
      demographic: {
        deferrals: [],
      },
    };
    const mergeInto: PushMerge = { path: 'demographic.deferrals', operation: 'push', output: {} };

    const merger = push(mergeInto);
    const got = merger(member as Member, 'value');
    const want = { ssn: '', effectiveDate: '', deferrals: [], demographic: { deferrals: ['value'] } };
    assert.deepEqual(got, want);
  });
});
