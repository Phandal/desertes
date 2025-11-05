import { describe, it } from 'node:test';
import assert from 'node:assert';

import { createParser } from './parsers/parserfactory.js';
import type { CSVParserConfig } from './types.js';

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
});
