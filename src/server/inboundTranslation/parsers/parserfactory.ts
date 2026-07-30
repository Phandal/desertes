import { csvParser } from './csvparser.js';
import { fixedWidthParser } from './fixedwidthparser.js';
import type { ParserConfig, Parser } from '../types.js';

export function createParser(config: ParserConfig): Parser {
  switch (config.kind) {
    case 'csv':
      return csvParser(config);
    case 'fixedwidth':
      return fixedWidthParser(config);
    default:
      throw new Error('Unsupported parser type: ' + (config as ParserConfig).kind);
  }
}
