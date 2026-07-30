import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fixedWidthParser } from './fixedwidthparser.js';
import { assemble } from '../assembler.js';
import { convert } from '../converter.js';
import type { AssemblerConfig, FixedWidthParserConfig } from '../types.js';

function record180(values: Array<{ start: number, value: string }>): string {
  let line = ''.padEnd(180, ' ');
  for (const { start, value } of values) {
    line = line.substring(0, start - 1) + value + line.substring(start - 1 + value.length);
  }
  return line;
}

describe('fixedWidthParser', () => {
  it('fixedwidth::fields', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: false,
      fields: [
        { name: 'name', start: 1, length: 5 },
        { name: 'age', start: 6, length: 2 },
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
        { name: 'name', start: 1, length: 5 },
        { name: 'age', start: 6, length: 2 },
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
        { name: 'name', start: 1, length: 5 },
        { name: 'age', start: 6, length: 2 },
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
      match: { start: 1, length: 1, equals: '2' },
      fields: [
        { name: 'name', start: 2, length: 5 },
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
      match: { start: 1, length: 3, equals: 'AB ' },
      fields: [
        { name: 'name', start: 4, length: 5 },
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
        { name: 'name', start: 1, length: 5 },
        { name: 'age', start: 6, length: 2 },
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
        { name: 'name', start: 1, length: 5 },
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
        { name: 'name', start: 1, length: 5 },
        { name: 'age', start: 6, length: 2 },
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
        fields: [{ name: 'name', start: 1, length: 5 }],
      };

      const parser = fixedWidthParser(config);
      await assert.rejects(parser('Jack 14Mark 15'));
    }
  });

  it('fixedwidth::newlines', async () => {
    const config: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      fields: [
        { name: 'name', start: 1, length: 5 },
        { name: 'age', start: 6, length: 2 },
      ],
    };

    const parser = fixedWidthParser(config);
    const results = await parser('Jack 14\r\nMark 15\r\n');
    assert.deepEqual(results, [{ name: 'Jack', age: '14' }, { name: 'Mark', age: '15' }]);
  });

  it('fixedwidth::roundtrip', async () => {
    const header = record180([{ start: 1, value: '1' }, { start: 38, value: '20250101' }]);
    const detailOne = record180([
      { start: 1, value: '2' },
      { start: 38, value: '123456789' },
      { start: 62, value: '20250101' },
      { start: 70, value: 'AAA' },
      { start: 74, value: '00000000500' },
    ]);
    const detailTwo = record180([
      { start: 1, value: '2' },
      { start: 38, value: '987654321' },
      { start: 62, value: '20250101' },
      { start: 70, value: 'NRB' },
      { start: 74, value: '00000001000' },
    ]);
    const trailer = record180([{ start: 1, value: '3' }]);
    const input = [header, detailOne, detailTwo, trailer].join('\n') + '\n';

    assert.strictEqual(detailOne.length, 180);

    const parserConfig: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: true,
      match: { start: 1, length: 1, equals: '2' },
      fields: [
        { name: 'ssn', start: 38, length: 9 },
        { name: 'effDate', start: 62, length: 8 },
        { name: 'sourceType', start: 70, length: 3 },
        { name: 'amount', start: 74, length: 11 },
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
