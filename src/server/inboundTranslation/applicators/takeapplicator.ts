import type { Rule, TakeRule, Applicator, ApplicatorResult, ParsedRecord } from '../types.js';

export function isTakeRule(rule: Rule): rule is TakeRule {
  return 'take' in rule;
}

export function take(rule: TakeRule): Applicator {
  return (records: ParsedRecord[]): ApplicatorResult => {
    let recordsCopy = records;
    switch (rule.take.sequence) {
      case 'first':
        break;
      case 'last':
        recordsCopy = records.toReversed();
        break;
    }

    for (const record of recordsCopy) {
      const value = record[rule.mergeInto.output];
      if (value !== undefined && value !== '') {
        return value;
      }
    }

    return null;
  };
}

