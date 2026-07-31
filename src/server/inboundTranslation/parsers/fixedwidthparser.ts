import type { Parser, FixedWidthParserConfig, ParsedRecord } from '../types.js';

function assertValidRange(label: string, start: number, end: number): void {
  if (!Number.isInteger(start) || start < 0 || !Number.isInteger(end) || end <= start) {
    throw new Error(`${label} must have an integer start >= 0 and an integer end > start: start=${start} end=${end}`);
  }
}

export function fixedWidthParser(config: FixedWidthParserConfig): Parser {
  return async (input: string): Promise<ParsedRecord[]> => {
    for (const field of config.fields) {
      assertValidRange(`field "${field.name}"`, field.start, field.end);
    }
    if (config.match !== undefined) {
      assertValidRange('match', config.match.start, config.match.end);
    }

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
      lines = lines.filter((line) => line.substring(match.start, match.end) === match.equals);
    }

    return lines.map((line) => {
      const record: Record<string, string> = {};
      for (const field of config.fields) {
        let data = line.substring(field.start, field.end);

        if (config.trim) {
          data = data.trim();
        }

        record[field.name] = data;
      }
      return record;
    });
  };
}
