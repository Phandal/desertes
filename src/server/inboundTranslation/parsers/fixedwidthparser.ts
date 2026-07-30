import type { Parser, FixedWidthParserConfig, ParsedRecord } from '../types.js';

export function fixedWidthParser(config: FixedWidthParserConfig): Parser {
  return async (input: string): Promise<ParsedRecord[]> => {
    let lines: string[];

    if (config.recordLength !== undefined) {
      const recordLength = config.recordLength;
      if (!Number.isInteger(recordLength) || recordLength <= 0) {
        throw new Error(`recordLength must be a positive integer: ${recordLength}`);
      }
      lines = [];
      for (let i = 0; i < input.length; i += recordLength) {
        lines.push(input.substring(i, i + recordLength));
      }
    } else {
      lines = input.split(/\r?\n/);
    }

    lines = lines.slice(config.skipLines ?? 0).filter((line) => line.trim() !== '');

    if (config.match !== undefined) {
      const match = config.match;
      lines = lines.filter((line) => line.substring(match.start - 1, match.start - 1 + match.length) === match.equals);
    }

    return lines.map((line) => {
      const record: Record<string, string> = {};
      for (const field of config.fields) {
        let data = line.substring(field.start - 1, field.start - 1 + field.length);

        if (config.trim) {
          data = data.trim();
        }

        record[field.name] = data;
      }
      return record;
    });
  };
}
