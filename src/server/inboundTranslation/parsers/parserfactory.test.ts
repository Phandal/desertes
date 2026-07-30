import { describe, it } from 'node:test';
import assert from 'node:assert';

import { createParser } from './parserfactory.js';
import type { CSVParserConfig, FixedWidthParserConfig } from '../types.js';

describe('parserFactory', () => {
  it('createParser::fail', () => {
    assert.throws(() => createParser({ kind: 'unknown' } as unknown as CSVParserConfig));
  });

  it('createParser::csv', () => {
    const csvConfig: CSVParserConfig = {
      kind: 'csv',
      skipLines: 0,
      delimiter: ',',
      trim: false,
      fields: [],
    };

    const parser = createParser(csvConfig);
    assert(typeof parser === 'function');
  });

  it('createParser::fixedwidth', () => {
    const fixedWidthConfig: FixedWidthParserConfig = {
      kind: 'fixedwidth',
      trim: false,
      fields: [],
    };

    const parser = createParser(fixedWidthConfig);
    assert(typeof parser === 'function');
  });
});
