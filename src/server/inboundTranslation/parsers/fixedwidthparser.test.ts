import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fixedWidthParser } from './fixedwidthparser.js';
import { assemble } from '../assembler.js';
import { convert } from '../converter.js';
import type { AssemblerConfig, FixedWidthParserConfig } from '../types.js';

function record180(values: Array<{ start: number, value: string }>): string {
  let line = ''.padEnd(180, ' ');
  for (const { start, value } of values) {
    line = line.substring(0, start) + value + line.substring(start + value.length);
  }
  return line;
}

describe('fixedWidthParser', () => {
  it('fixedwidth::fields', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: false,
      fields: [
        { name: 'name', start: 0, end: 5 },
        { name: 'age', start: 5, end: 7 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack 14\nMark 15');
    assert.deepEqual(results, [{ name: 'Jack ', age: '14' }, { name: 'Mark ', age: '15' }]);
  });

  it('fixedwidth::trim', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      fields: [
        { name: 'name', start: 0, end: 5 },
        { name: 'age', start: 5, end: 7 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack 14\nMark 15');
    assert.deepEqual(results, [{ name: 'Jack', age: '14' }, { name: 'Mark', age: '15' }]);
  });

  it('fixedwidth::skipsLines', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      skipLines: 1,
      fields: [
        { name: 'name', start: 0, end: 5 },
        { name: 'age', start: 5, end: 7 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack 14\nMark 15\nSusan56');
    assert.deepEqual(results, [{ name: 'Mark', age: '15' }, { name: 'Susan', age: '56' }]);
  });

  it('fixedwidth::match', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      match: { start: 0, end: 1, equals: '2' },
      fields: [
        { name: 'name', start: 1, end: 6 },
      ],
    };

    const input = '1HEAD \n2Jack \n2Mark \n2Susan\n3TRAIL';
    const parser = fixedWidthParser(config);
    const results = await parser(input);
    assert.deepEqual(results, [{ name: 'Jack' }, { name: 'Mark' }, { name: 'Susan' }]);
  });

  it('fixedwidth::match-raw-slice', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      match: { start: 0, end: 3, equals: 'AB ' },
      fields: [
        { name: 'name', start: 3, end: 8 },
      ],
    };

    const input = 'AB Jack \nXY Mark ';
    const parser = fixedWidthParser(config);
    const results = await parser(input);
    assert.deepEqual(results, [{ name: 'Jack' }]);
  });

  it('fixedwidth::short-final-line', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: false,
      fields: [
        { name: 'name', start: 0, end: 5 },
        { name: 'age', start: 5, end: 7 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack 14\nMark');
    assert.deepEqual(results, [{ name: 'Jack ', age: '14' }, { name: 'Mark', age: '' }]);
    assert.strictEqual(results[1].age, '');
  });

  it('fixedwidth::trailing-newline', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      fields: [
        { name: 'name', start: 0, end: 5 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack \nMark \n');
    assert.deepEqual(results, [{ name: 'Jack' }, { name: 'Mark' }]);
  });

  it('fixedwidth::recordLength', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: false,
      recordLength: 7,
      fields: [
        { name: 'name', start: 0, end: 5 },
        { name: 'age', start: 5, end: 7 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack 14Mark 15Susan56');
    assert.deepEqual(results, [{ name: 'Jack ', age: '14' }, { name: 'Mark ', age: '15' }, { name: 'Susan', age: '56' }]);
  });

  it('fixedwidth::recordLength-invalid', async () => {
    for (const recordLength of [0, -1, 1.5]) {
      const config: FixedWidthParserConfig = {
        kind: 'fixedwidth',
        trim: false,
        recordLength,
        fields: [{ name: 'name', start: 0, end: 5 }],
      };

      const parser = fixedWidthParser(config);
      await assert.rejects(parser('Jack 14Mark 15'));
    }
  });

  it('fixedwidth::invalid-field-range', async () => {
    const badRanges = [
      { start: 5, end: 5 },
      { start: 5, end: 3 },
      { start: -1, end: 5 },
      { start: 0.5, end: 5 },
      { start: 0, end: 5.5 },
    ];

    for (const { start, end } of badRanges) {
      const config: FixedWidthParserConfig = {
        kind: 'fixedwidth',
        trim: false,
        fields: [{ name: 'name', start, end }],
      };

      const parser = fixedWidthParser(config);
      await assert.rejects(parser('Jack 14'), /field "name"/);
    }
  });

  it('fixedwidth::invalid-match-range', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: false,
      match: { start: 1, end: 0, equals: '2' },
      fields: [{ name: 'name', start: 0, end: 5 }],
    };

    const parser = fixedWidthParser(config);
    await assert.rejects(parser('2Jack'), /match/);
  });

  it('fixedwidth::newlines', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      fields: [
        { name: 'name', start: 0, end: 5 },
        { name: 'age', start: 5, end: 7 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack 14\r\nMark 15\r\n');
    assert.deepEqual(results, [{ name: 'Jack', age: '14' }, { name: 'Mark', age: '15' }]);
  });

  it('fixedwidth::roundtrip', async () => {
    const header = record180([{ start: 0, value: '1' }, { start: 37, value: '20250101' }]);
    const detailOne = record180([
      { start: 0, value: '2' },
      { start: 37, value: '123456789' },
      { start: 61, value: '20250101' },
      { start: 69, value: 'AAA' },
      { start: 73, value: '00000000500' },
    ]);
    const detailTwo = record180([
      { start: 0, value: '2' },
      { start: 37, value: '987654321' },
      { start: 61, value: '20250101' },
      { start: 69, value: 'NRB' },
      { start: 73, value: '00000001000' },
    ]);
    const trailer = record180([{ start: 0, value: '3' }]);
    const input = [header, detailOne, detailTwo, trailer].join('\n') + '\n';

    assert.strictEqual(detailOne.length, 180);

    const parserConfig: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      match: { start: 0, end: 1, equals: '2' },
      fields: [
        { name: 'ssn', start: 37, end: 46 },
        { name: 'effDate', start: 61, end: 69 },
        { name: 'sourceType', start: 69, end: 72 },
        { name: 'amount', start: 73, end: 84 },
      ],
    };

    const assemblerConfig: AssemblerConfig = {
      groupBy: 'ssn',
      rules: [
        {
          take: { sequence: 'first' },
          mergeInto: { path: 'ssn', operation: 'set', output: 'ssn' },
        },
        {
          take: { sequence: 'first' },
          mergeInto: {
            path: 'effectiveDate',
            operation: 'set',
            output: 'effDate',
            transform: { dateFormat: { inFormat: 'yyyyMMdd', outFormat: 'yyyy-MM-dd' } },
          },
        },
        {
          when: { field: 'sourceType', equals: 'AAA' },
          mergeInto: {
            path: 'deferrals',
            operation: 'push',
            output: {
              kind: { _value: '401k' },
              earningsList: { _value: '401k Eligible Earnings' },
              percent: 'amount',
            },
            transform: { impliedDecimal: { places: 4, property: 'percent' } },
          },
        },
        {
          when: { field: 'sourceType', equals: 'NRB' },
          mergeInto: {
            path: 'deferrals',
            operation: 'push',
            output: {
              kind: { _value: 'Roth401k' },
              earningsList: { _value: '401k Eligible Earnings' },
              percent: 'amount',
            },
            transform: { impliedDecimal: { places: 4, property: 'percent' } },
          },
        },
      ],
    };

    const parser = fixedWidthParser(parserConfig);
    const records = await parser(input);
    assert.strictEqual(records.length, 2);

    const members = assemble(assemblerConfig, records);
    const got = convert(members);
    const want = [
      {
        ssn: '123-45-6789',
        effectiveDate: '2025-01-01T00:00:00.000Z',
        earningsList: '401k Eligible Earnings',
        code: '401k',
        percent: 0.05,
      },
      {
        ssn: '987-65-4321',
        effectiveDate: '2025-01-01T00:00:00.000Z',
        earningsList: '401k Eligible Earnings',
        code: 'Roth401k',
        percent: 0.1,
      },
    ];

    assert.deepEqual(got, want);
  });
});
