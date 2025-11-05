import { createApplicator } from './applicators/applicatorfactory.js';
import { createMerger } from './mergers/mergerfactory.js';
import type { AssemblerConfig, Member, ParsedRecord, Rule } from './types.js';

export function assemble(config: AssemblerConfig, records: ParsedRecord[]): Member[] {
  const assembled: Member[] = [];
  const grouped = groupBy(config.groupBy, records);

  for (const [_, groupedRecords] of Object.entries(grouped)) {
    const member = merge(config.rules, groupedRecords);
    assembled.push(member);
  }

  return assembled;
}

export function groupBy(key: string, records: ParsedRecord[]): Record<string, ParsedRecord[]> {
  const grouped: Record<string, ParsedRecord[]> = {};

  for (const record of records) {
    const keyValue = record[key];
    if (keyValue === '' || keyValue === undefined) continue;

    if (grouped[keyValue] !== undefined) {
      grouped[keyValue].push(record);
    } else {
      grouped[keyValue] = [record];
    }
  }

  return grouped;
}

export function merge(rules: Rule[], records: ParsedRecord[]): Member {
  let member = createMember();

  for (const rule of rules) {
    const applicator = createApplicator(rule);
    const result = applicator(records);

    // This means the rule did not apply to the record
    if (result === null) { continue; }

    const merger = createMerger(rule);
    member = merger(member, result);
  }

  return member;
}

export function createMember(): Member {
  return {
    ssn: '',
    effectiveDate: '',
    demographic: {},
    deferrals: [],
  };
}
