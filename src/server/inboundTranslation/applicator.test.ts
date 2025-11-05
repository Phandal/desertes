import { describe, it } from 'node:test';
import assert from 'node:assert';

import { isTakeRule, take } from './applicators/takeapplicator.js';
import { evaluateWhen, isWhenRule, objectMapper, stringMapper, when } from './applicators/whenapplicator.js';
import type { ParsedRecord, TakeRule, WhenRule, WhenRuleEqualOptions, WhenRuleNotEqualOptions } from './types.js';

const takeRule: TakeRule = {
  take: { sequence: 'last' },
  mergeInto: { path: '', operation: 'set', output: '' },
};

const whenRule: WhenRule = {
  when: { field: '', equals: '' },
  mergeInto: { path: '', operation: 'push', output: '' },
};

describe('take applicator', () => {
  const records: ParsedRecord[] = [
    { out: 'first' },
    { out: 'middle' },
    { out: 'last' },
  ];

  it('isTakeRule', () => {
    assert(isTakeRule(takeRule) === true);
    assert(isTakeRule(whenRule) === false);
  });

  it('take::first', () => {
    const rule: TakeRule = {
      take: { sequence: 'first' },
      mergeInto: { path: '', operation: 'set', output: 'out' },
    };

    const applicator = take(rule);

    const got = applicator(records);
    const want = 'first';
    assert.deepEqual(got, want);
  });

  it('take::last', () => {
    const rule: TakeRule = {
      take: { sequence: 'last' },
      mergeInto: { path: '', operation: 'set', output: 'out' },
    };

    const applicator = take(rule);

    const got = applicator(records);
    const want = 'last';
    assert.deepEqual(got, want);
  });

  it('take::ignores properties that are undefined or empty string', () => {
    const rule: TakeRule = {
      take: { sequence: 'last' },
      mergeInto: { path: '', operation: 'set', output: 'out' },
    };

    const records: ParsedRecord[] = [
      { out: 'first' },
      { out: 'middle' },
      { out: 'last' },
      { out: '' },
      { test: 'here' },
    ];

    const applicator = take(rule);

    const got = applicator(records);
    const want = 'last';
    assert.deepEqual(got, want);
  });

  it('take::returns null when the rule does not apply', () => {
    const rule: TakeRule = {
      take: { sequence: 'last' },
      mergeInto: { path: '', operation: 'set', output: 'out' },
    };

    const records: ParsedRecord[] = [
    ];

    const applicator = take(rule);

    const got = applicator(records);
    const want = null;
    assert.deepEqual(got, want);
  });
});

describe('when applicator', () => {
  const records: ParsedRecord[] = [
    { code: '1', out: '' },
    { code: '2', out: 'two' },
    { code: '3', out: 'three' },
    { code: '2', out: 'twotwo' },
  ];

  it('isWhenRule', () => {
    assert(isWhenRule(whenRule) === true);
    assert(isWhenRule(takeRule) === false);
  });

  it('when::string output', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '3' },
      mergeInto: { path: '', operation: 'set', output: 'out' },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = 'three';
    assert.deepEqual(got, want);
  });

  it('when::string output takes the last', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '2' },
      mergeInto: { path: '', operation: 'set', output: 'out' },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = 'twotwo';
    assert.deepEqual(got, want);
  });

  it('when::object output', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '3' },
      mergeInto: { path: '', operation: 'push', output: { code: 'out' } },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = [{ code: 'three' }];
    assert.deepEqual(got, want);
  });

  it('when::and rule', () => {
    const rule: WhenRule = {
      when: { and: [{ field: 'code', equals: '3' }, { field: 'out', equals: 'three' }] },
      mergeInto: { path: '', operation: 'push', output: { code: 'out' } },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = [{ code: 'three' }];
    assert.deepEqual(got, want);
  });

  it('when::or rule', () => {
    const rule: WhenRule = {
      when: { or: [{ field: 'code', equals: '3' }, { field: 'out', equals: 'twotwo' }] },
      mergeInto: { path: '', operation: 'push', output: { code: 'out' } },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = [{ code: 'three' }, { code: 'twotwo' }];
    assert.deepEqual(got, want);
  });

  it('when::nested and/or', () => {
    const rule: WhenRule = {
      when: {
        and: [
          {
            or: [
              { field: 'out', equals: 'two' },
              { field: 'out', equals: 'twotwo' }],
          },
          { field: 'code', equals: '2' }],
      },
      mergeInto: { path: '', operation: 'push', output: { code: 'out' } },
    };

    const applicator = when(rule);
    const got = applicator(records);
    const want = [{ code: 'two' }, { code: 'twotwo' }];
    assert.deepEqual(got, want);
  });

  it('when::object output with more than one match', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '2' },
      mergeInto: { path: '', operation: 'push', output: { code: 'out' } },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = [{ code: 'two' }, { code: 'twotwo' }];
    assert.deepEqual(got, want);
  });

  it('when::object output with HardCoded value', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '3' },
      mergeInto: { path: '', operation: 'push', output: { hardcoded: { _value: 'test' }, code: 'out' } },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = [{ hardcoded: 'test', code: 'three' }];
    assert.deepEqual(got, want);
  });

  it('when::string output returns null when the rule does not apply', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '-1' },
      mergeInto: { path: '', operation: 'set', output: 'out' },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = null;
    assert.deepEqual(got, want);
  });

  it('when::object output returns null when the rule does not apply', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '-1' },
      mergeInto: { path: '', operation: 'push', output: { code: 'out' } },
    };

    const applicator = when(rule);

    const got = applicator(records);
    const want = null;
    assert.deepEqual(got, want);
  });

  it('stringMapper::ignores undefined and empty string', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '1' },
      mergeInto: { path: '', operation: 'push', output: 'out' },
    };

    const mapper = stringMapper(rule.when, rule.mergeInto.output as string);

    const got = mapper(records);
    const want = null;
    assert.deepEqual(got, want);
  });

  it('objectMapper::does not ignore undefined and empty string', () => {
    const rule: WhenRule = {
      when: { field: 'code', equals: '1' },
      mergeInto: { path: '', operation: 'push', output: { code: 'out' } },
    };

    const mapper = objectMapper(rule.when, rule.mergeInto.output as Record<string, string>);

    const got = mapper(records);
    const want = [{ code: '' }];
    assert.deepEqual(got, want);
  });

  it('evaluateWhen', () => {
    const whenequals: WhenRuleEqualOptions = { field: 'code', equals: '1' };
    const whennotequals: WhenRuleNotEqualOptions = { field: 'code', notequals: '5' };

    assert(evaluateWhen(whenequals, records[0]) === true);
    assert(evaluateWhen(whennotequals, records[0]) === true);
  });
});
